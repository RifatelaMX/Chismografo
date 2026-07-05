import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCmsRules, getAppRules, getInfraRules } from './techRulesLoader.js';

/**
 * Normalizes a input URL string to include protocol
 * @param {string} urlStr 
 * @returns {string} Normalized URL
 */
export function normalizeUrl(urlStr) {
  let cleaned = urlStr.trim();
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned;
  }
  try {
    const parsed = new URL(cleaned);
    return parsed.href;
  } catch (err) {
    throw new Error('Invalid URL format');
  }
}

/**
 * Fetches the page content and headers
 * @param {string} url 
 * @returns {Promise<{html: string, headers: object, responseUrl: string, status: number}>}
 */
export async function fetchPage(url) {
  const normalized = normalizeUrl(url);
  
  // Browser-like headers to minimize block risk
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  try {
    const response = await axios.get(normalized, {
      headers,
      timeout: 12000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });

    return {
      html: response.data,
      headers: response.headers,
      responseUrl: response.request.res.responseUrl || normalized,
      status: response.status
    };
  } catch (error) {
    // If https failed, maybe try http or throw direct error
    let message = error.message;
    if (error.response) {
      message = `HTTP status ${error.response.status}`;
    } else if (error.code === 'ECONNABORTED') {
      message = 'Request timed out after 12 seconds';
    } else if (error.code === 'ENOTFOUND') {
      message = 'Domain not found / DNS lookup failed';
    }
    throw new Error(`Failed to fetch page: ${message}`);
  }
}

/**
 * Detects the Shopify theme name locally from raw HTML
 * @param {string} html 
 * @returns {string|null} Theme name or null
 */
export function detectShopifyTheme(html) {
  if (!html) return null;
  const $ = cheerio.load(html);
  
  // 1. Try meta tag shopify-theme-name
  const metaTheme = $('meta#shopify-theme-name').attr('content') || 
                    $('meta[name="shopify-theme-name"]').attr('content');
  if (metaTheme) return metaTheme;
  
  // 2. Try JS variable in script tags (prioritizing schema_name)
  let scriptTheme = null;
  $('script').each((i, el) => {
    const content = $(el).html();
    if (content) {
      // Find Shopify.theme = { ... } object assignment
      const match = content.match(/Shopify\.theme\s*=\s*({[^;]+})/i);
      if (match) {
        try {
          const jsonStr = match[1].trim().replace(/;$/, '');
          const themeObj = JSON.parse(jsonStr);
          scriptTheme = themeObj.schema_name || themeObj.name;
          if (scriptTheme) {
            return false; // break cheerio loop
          }
        } catch (e) {
          // Fallback to regex matches if JSON parse fails
          const schemaMatch = content.match(/["']schema_name["']\s*:\s*["']([^"']+)["']/i);
          if (schemaMatch) {
            scriptTheme = schemaMatch[1];
            return false;
          }
          const nameMatch = content.match(/["']name["']\s*:\s*["']([^"']+)["']/i);
          if (nameMatch) {
            scriptTheme = nameMatch[1];
            return false;
          }
        }
      }
    }
  });
  
  return scriptTheme;
}

/**
 * Detects the active payment gateways
 * @param {string} html 
 * @param {Array} scripts 
 * @param {Array} links 
 * @returns {Array<string>} Detected payment gateways
 */
export function detectPaymentGateways(html, scripts, links) {
  const gateways = new Set();

  // 1. Shopify payment_gateways array pattern
  const shopifyGatewaysMatch = html.match(/Shopify\.payment_gateways\s*=\s*(\[[^\]]*\])/i) ||
                               html.match(/"paymentGateways"\s*:\s*(\[[^\]]*\])/i);
  if (shopifyGatewaysMatch) {
    try {
      const cleanedJson = shopifyGatewaysMatch[1].replace(/\\"/g, '"');
      const parsed = JSON.parse(cleanedJson);
      if (Array.isArray(parsed)) {
        parsed.forEach(gw => {
          let name = gw.trim();
          if (name.toLowerCase() === 'stripe') name = 'Stripe';
          if (name.toLowerCase() === 'paypal') name = 'PayPal';
          if (name.toLowerCase() === 'conekta') name = 'Conekta';
          if (name.toLowerCase() === 'mercado_pago' || name.toLowerCase() === 'mercadopago') name = 'Mercado Pago';
          if (name.toLowerCase() === 'openpay') name = 'Openpay';
          if (name.toLowerCase() === 'klarna') name = 'Klarna';
          if (name.toLowerCase() === 'aplazo') name = 'Aplazo';
          if (name.toLowerCase() === 'kueski' || name.toLowerCase() === 'kueskipay') name = 'Kueski Pay';
          gateways.add(name);
        });
      }
    } catch (e) {
      const strMatch = shopifyGatewaysMatch[1];
      if (strMatch.includes('stripe')) gateways.add('Stripe');
      if (strMatch.includes('paypal')) gateways.add('PayPal');
      if (strMatch.includes('conekta')) gateways.add('Conekta');
      if (strMatch.includes('mercado') || strMatch.includes('mercadopago')) gateways.add('Mercado Pago');
      if (strMatch.includes('openpay')) gateways.add('Openpay');
      if (strMatch.includes('klarna')) gateways.add('Klarna');
    }
  }

  // 2. Generic script and link pattern analysis
  const gatewaySignatures = [
    { name: 'Stripe', pattern: /js\.stripe\.com\/v[23]\/?|stripe-js/i },
    { name: 'PayPal', pattern: /paypal\.com\/sdk\/js|checkout\.js|paypal-objects/i },
    { name: 'Klarna', pattern: /klarna\.com|klarnacdn\.net/i },
    { name: 'Conekta', pattern: /conekta\.js|cdn\.conekta\.io/i },
    { name: 'Mercado Pago', pattern: /mercadopago\.js|sdk\.mercadopago\.com/i },
    { name: 'Openpay', pattern: /openpay\.js|openpay\.mx|openpay\.co/i },
    { name: 'Adyen', pattern: /adyen\.com|adyen\.js/i },
    { name: 'Braintree', pattern: /braintreegateway\.com|braintree\.js/i },
    { name: 'dLocal', pattern: /dlocal\.com|dlocal-js/i },
    { name: 'Aplazo', pattern: /aplazo\.mx|aplazo-sdk/i },
    { name: 'Kueski Pay', pattern: /kueskipay|kueski-cdn/i }
  ];

  scripts.forEach(s => {
    gatewaySignatures.forEach(gw => {
      if ((s.src && gw.pattern.test(s.src)) || (s.content && gw.pattern.test(s.content))) {
        gateways.add(gw.name);
      }
    });
  });

  links.forEach(l => {
    if (l.href) {
      gatewaySignatures.forEach(gw => {
        if (gw.pattern.test(l.href)) {
          gateways.add(gw.name);
        }
      });
    }
  });

  // 3. Fallback: Parse body class or forms for common payment processors
  if (html.includes('woocommerce-gateways') || html.includes('payment_method_stripe')) {
    gateways.add('Stripe');
  }
  if (html.includes('payment_method_paypal')) {
    gateways.add('PayPal');
  }

  // 4. Scan element attributes, classes, ids, and SVG titles for payment gateway brand names
  const $ = cheerio.load(html);
  const footerKeywords = [
    { name: 'Stripe', patterns: [/\bstripe\b/i] },
    { name: 'PayPal', patterns: [/\bpaypal\b/i, /\bpay-pal\b/i] },
    { name: 'Klarna', patterns: [/\bklarna\b/i] },
    { name: 'Conekta', patterns: [/\bconekta\b/i] },
    { name: 'Mercado Pago', patterns: [/\bmercadopago\b/i, /\bmercado-pago\b/i] },
    { name: 'Openpay', patterns: [/\bopenpay\b/i] },
    { name: 'Aplazo', patterns: [/\baplazo\b/i] },
    { name: 'Kueski Pay', patterns: [/\bkueski\b/i] },
    { name: 'Adyen', patterns: [/\badyen\b/i] },
    { name: 'Braintree', patterns: [/\bbraintree\b/i] },
    { name: 'dLocal', patterns: [/\bdlocal\b/i] }
  ];

  $('[class], [id], [alt], [src], svg title, svg').each((i, el) => {
    const classVal = $(el).attr('class') || '';
    const idVal = $(el).attr('id') || '';
    const altVal = $(el).attr('alt') || '';
    const srcVal = $(el).attr('src') || '';
    const textVal = el.name === 'title' ? $(el).text() : '';
    const svgClass = el.name === 'svg' ? ($(el).attr('class') || '') : '';

    const combinedText = `${classVal} ${idVal} ${altVal} ${srcVal} ${textVal} ${svgClass}`;

    footerKeywords.forEach(kw => {
      kw.patterns.forEach(p => {
        if (p.test(combinedText)) {
          gateways.add(kw.name);
        }
      });
    });
  });

  return Array.from(gateways);
}

/**
 * Runs rule matching on fetched HTML and headers
 * @param {string} html 
 * @param {object} headers 
 * @returns {object} Detection results
 */
export function analyze(html, headers) {
  const $ = cheerio.load(html);
  const results = {};

  // Normalize header keys to lowercase
  const lowerHeaders = {};
  for (const [key, val] of Object.entries(headers)) {
    lowerHeaders[key.toLowerCase()] = String(val);
  }

  // Pre-extract HTML metadata to speed up matching
  const metaTags = [];
  $('meta').each((i, el) => {
    const name = $(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv');
    const content = $(el).attr('content');
    if (name && content) {
      metaTags.push({ name: name.toLowerCase(), content });
    }
  });

  const scripts = [];
  $('script').each((i, el) => {
    const src = $(el).attr('src');
    const content = $(el).text();
    scripts.push({ src, content });
  });

  const links = [];
  $('link').each((i, el) => {
    const href = $(el).attr('href');
    const rel = $(el).attr('rel');
    if (href) {
      links.push({ href, rel });
    }
  });

  const classes = new Set();
  $('[class]').each((i, el) => {
    const className = $(el).attr('class');
    if (className) {
      className.split(/\s+/).forEach(c => {
        if (c) classes.add(c);
      });
    }
  });

  // Evaluate rules for each CMS platform loaded dynamically
  const cmsPlatforms = getCmsRules();
  for (const cms of cmsPlatforms) {
    const tech = cms.name;
    const matchedRules = [];
    const matchedWeights = [];

    if (Array.isArray(cms.detectionRules)) {
      for (const rule of cms.detectionRules) {
        let isMatch = false;
        let matchContext = '';
        const regex = rule.regex;

        if (!regex) continue;

        switch (rule.type) {
          case 'header': {
            const headerVal = lowerHeaders[rule.key.toLowerCase()];
            if (headerVal && regex.test(headerVal)) {
              isMatch = true;
              matchContext = `${rule.key}: ${headerVal}`;
            }
            break;
          }

          case 'meta': {
            const matchingMeta = metaTags.find(m => m.name === rule.key.toLowerCase());
            if (matchingMeta && regex.test(matchingMeta.content)) {
              isMatch = true;
              matchContext = `<meta name="${matchingMeta.name}" content="${matchingMeta.content}">`;
            }
            break;
          }

          case 'script-src': {
            const matchingScript = scripts.find(s => s.src && regex.test(s.src));
            if (matchingScript) {
              isMatch = true;
              matchContext = `<script src="${matchingScript.src}">`;
            }
            break;
          }

          case 'script-content': {
            const matchingScript = scripts.find(s => s.content && regex.test(s.content));
            if (matchingScript) {
              isMatch = true;
              const idx = matchingScript.content.search(regex);
              const start = Math.max(0, idx - 40);
              const end = Math.min(matchingScript.content.length, idx + 60);
              matchContext = `... ${matchingScript.content.substring(start, end).replace(/\s+/g, ' ').trim()} ...`;
            }
            break;
          }

          case 'link-href': {
            const matchingLink = links.find(l => regex.test(l.href));
            if (matchingLink) {
              isMatch = true;
              matchContext = `<link href="${matchingLink.href}">`;
            }
            break;
          }

          case 'html-class': {
            for (const c of classes) {
              if (regex.test(c)) {
                isMatch = true;
                matchContext = `class="${c}"`;
                break;
              }
            }
            break;
          }

          case 'html-attribute': {
            $(`[${rule.attribute}]`).each((i, el) => {
              const val = $(el).attr(rule.attribute);
              if (val && regex.test(val)) {
                isMatch = true;
                matchContext = `<${el.name} ${rule.attribute}="${val}">`;
                return false; // break cheerio loop
              }
            });
            break;
          }
        }

        if (isMatch) {
          matchedRules.push({
            id: rule.id || `${tech}-${rule.type}`,
            description: rule.description,
            type: rule.type,
            context: matchContext,
            weight: rule.weight || 0.5
          });
          matchedWeights.push(rule.weight || 0.5);
        }
      }
    }

    if (matchedRules.length > 0) {
      let complementProduct = 1.0;
      for (const w of matchedWeights) {
        complementProduct *= (1.0 - w);
      }
      const confidence = parseFloat((1.0 - complementProduct).toFixed(4));

      results[tech] = {
        detected: true,
        confidence,
        matchedRules
      };
    }
  }

  // --- Plugin, App & Module Detection ---
  const detectedPlugins = [];

  const formatName = (slug) => {
    return slug
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Shopify dynamically loaded scripts (asyncLoad urls list)
  const shopifyDynamicUrls = [];
  scripts.forEach(s => {
    if (s.content && /asyncLoad|loadScripts|loadMultiple/i.test(s.content)) {
      const urlRegex = /(https?:)?\\?\/\\?\/[a-zA-Z0-9-_\.\/\?&\+=\*%~#]+/gi;
      let m;
      while ((m = urlRegex.exec(s.content)) !== null) {
        let cleanUrl = m[0].replace(/\\/g, ''); // Remove backslashes
        if (cleanUrl.startsWith('//')) {
          cleanUrl = 'https:' + cleanUrl;
        }
        shopifyDynamicUrls.push(cleanUrl);
      }
    }
  });

  // 1. App Signatures Scan (Shopify Apps, Analytics, Chat, Gateways)
  const checkedApps = new Set();
  const appRulesList = getAppRules();

  appRulesList.forEach(app => {
    let isAppMatched = false;
    let matchedEvidence = '';

    if (Array.isArray(app.detectionRules)) {
      for (const rule of app.detectionRules) {
        const regex = rule.regex;
        if (!regex) continue;

        const matchedScript = scripts.find(s => 
          (s.src && regex.test(s.src)) || 
          (s.content && regex.test(s.content))
        );
        const matchedLink = links.find(l => l.href && regex.test(l.href));
        const matchedDynamicUrl = shopifyDynamicUrls.find(url => regex.test(url));

        if (matchedScript || matchedLink || matchedDynamicUrl) {
          isAppMatched = true;
          matchedEvidence = matchedScript 
            ? (matchedScript.src || 'Script en Línea') 
            : (matchedLink ? matchedLink.href : matchedDynamicUrl);
          break;
        }
      }
    }

    if (isAppMatched) {
      if (!checkedApps.has(app.name)) {
        checkedApps.add(app.name);
        detectedPlugins.push({
          name: app.name,
          developer: app.developer || app.name,
          compatibleCMS: app.compatibleCMS || [],
          web: app.web || '',
          appStores: app.appStores || [],
          logo: app.logo || '',
          category: app.category,
          type: 'signature',
          evidence: matchedEvidence
        });
      }
    }
  });

  // 1b. Infrastructure Scan
  const detectedInfra = [];
  const infraRulesList = getInfraRules();

  infraRulesList.forEach(infra => {
    let isInfraMatched = false;
    let matchedEvidence = '';

    if (Array.isArray(infra.detectionRules)) {
      for (const rule of infra.detectionRules) {
        const regex = rule.regex;
        if (!regex) continue;

        switch (rule.type) {
          case 'header': {
            const headerVal = lowerHeaders[rule.key.toLowerCase()];
            if (headerVal && regex.test(headerVal)) {
              isInfraMatched = true;
              matchedEvidence = `${rule.key}: ${headerVal}`;
            }
            break;
          }
          
          case 'script-src': {
            const matchingScript = scripts.find(s => s.src && regex.test(s.src));
            if (matchingScript) {
              isInfraMatched = true;
              matchedEvidence = `<script src="${matchingScript.src}">`;
            }
            break;
          }

          case 'link-href': {
            const matchingLink = links.find(l => regex.test(l.href));
            if (matchingLink) {
              isInfraMatched = true;
              matchedEvidence = `<link href="${matchingLink.href}">`;
            }
            break;
          }
        }
        if (isInfraMatched) break;
      }
    }

    if (isInfraMatched) {
      detectedInfra.push({
        name: infra.name,
        category: infra.category || 'Infraestructura',
        web: infra.web || '',
        logo: infra.logo || '',
        evidence: matchedEvidence
      });
    }
  });

  // 2. WooCommerce / WordPress Plugins Scan
  const wpPlugins = new Set();
  const wpPluginRegex = /\/wp-content\/plugins\/([a-zA-Z0-9-_]+)/i;
  
  scripts.forEach(s => {
    if (s.src) {
      const match = s.src.match(wpPluginRegex);
      if (match) wpPlugins.add(match[1].toLowerCase());
    }
  });
  links.forEach(l => {
    if (l.href) {
      const match = l.href.match(wpPluginRegex);
      if (match) wpPlugins.add(match[1].toLowerCase());
    }
  });

  wpPlugins.forEach(slug => {
    if (slug === 'woocommerce') return;
    detectedPlugins.push({
      name: formatName(slug),
      platform: 'WooCommerce',
      category: 'Plugin de WordPress',
      type: 'dynamic-path',
      evidence: `/wp-content/plugins/${slug}/`
    });
  });

  // 3. PrestaShop Modules Scan
  const psModules = new Set();
  const psModuleRegex = /\/modules\/([a-zA-Z0-9-_]+)/i;
  
  scripts.forEach(s => {
    if (s.src) {
      const match = s.src.match(psModuleRegex);
      if (match) psModules.add(match[1].toLowerCase());
    }
  });
  links.forEach(l => {
    if (l.href) {
      const match = l.href.match(psModuleRegex);
      if (match) psModules.add(match[1].toLowerCase());
    }
  });
  $('[src]').each((i, el) => {
    const src = $(el).attr('src');
    if (src) {
      const match = src.match(psModuleRegex);
      if (match) psModules.add(match[1].toLowerCase());
    }
  });

  psModules.forEach(slug => {
    detectedPlugins.push({
      name: formatName(slug),
      platform: 'PrestaShop',
      category: 'Módulo de PrestaShop',
      type: 'dynamic-path',
      evidence: `/modules/${slug}/`
    });
  });

  // 4. Magento Modules Scan
  const magentoModules = new Set();
  const magentoModuleRegex = /\/static\/frontend\/[^\/]+\/[^\/]+\/[^\/]+\/([a-zA-Z0-9]+_[a-zA-Z0-9]+)/i;
  
  scripts.forEach(s => {
    if (s.src) {
      const match = s.src.match(magentoModuleRegex);
      if (match) magentoModules.add(match[1]);
    }
  });
  links.forEach(l => {
    if (l.href) {
      const match = l.href.match(magentoModuleRegex);
      if (match) magentoModules.add(match[1]);
    }
  });

  magentoModules.forEach(moduleName => {
    detectedPlugins.push({
      name: moduleName.replace('_', ' '),
      platform: 'Magento',
      category: 'Módulo de Magento',
      type: 'dynamic-path',
      evidence: moduleName
    });
  });

  // Find the top match from dynamic results
  let primaryTech = null;
  let highestConfidence = 0;

  for (const [tech, res] of Object.entries(results)) {
    if (res.confidence > highestConfidence) {
      highestConfidence = res.confidence;
      primaryTech = tech;
    }
  }

  // Filter plugins/apps corresponding to the primary tech
  const filteredPlugins = primaryTech 
    ? detectedPlugins.filter(p => {
        if (Array.isArray(p.compatibleCMS)) {
          return p.compatibleCMS.includes(primaryTech);
        }
        return p.platform === primaryTech || p.platform === 'Universal';
      })
    : [];

  let theme = detectShopifyTheme(html);
  // Try WordPress theme
  if (!theme) {
    const wpThemeRegex = /\/wp-content\/themes\/([a-zA-Z0-9-_]+)/i;
    const matchedLink = links.find(l => l.href && wpThemeRegex.test(l.href));
    if (matchedLink) {
      const match = matchedLink.href.match(wpThemeRegex);
      if (match) {
        theme = match[1].split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }
  // Try PrestaShop theme
  if (!theme) {
    const psThemeRegex = /\/themes\/([a-zA-Z0-9-_]+)\//i;
    const matchedLink = links.find(l => l.href && psThemeRegex.test(l.href) && !l.href.includes('wp-content'));
    if (matchedLink) {
      const match = matchedLink.href.match(psThemeRegex);
      if (match) {
        theme = match[1].split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }
  }

  const paymentGateways = detectPaymentGateways(html, scripts, links);

  return {
    detected: primaryTech !== null,
    technology: primaryTech,
    confidence: highestConfidence,
    matches: results,
    plugins: filteredPlugins,
    theme: theme,
    paymentGateways: paymentGateways,
    infrastructure: detectedInfra
  };
}

/**
 * Scrapes the number of products from a store
 * @param {string} urlStr 
 * @param {string} technology 
 * @returns {Promise<number|null>} Product count
 */
async function scrapeProductCount(urlStr, technology) {
  let baseUrl = urlStr;
  try {
    const parsed = new URL(urlStr);
    baseUrl = `${parsed.protocol}//${parsed.hostname}`;
  } catch (e) {}

  // Define browser-like headers to bypass simple bot mitigation on sitemaps/endpoints
  const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
  };

  if (technology === 'Shopify') {
    // Strategy 1: Fetch main sitemap.xml and sum urls in all product sub-sitemaps
    try {
      const sitemapUrl = `${baseUrl}/sitemap.xml`;
      const res = await axios.get(sitemapUrl, { timeout: 6000, headers: requestHeaders });
      if (res.status === 200 && res.data) {
        const $ = cheerio.load(res.data, { xmlMode: true });
        const productSitemaps = [];
        
        $('sitemap loc').each((i, el) => {
          const loc = $(el).text();
          if (loc.includes('sitemap_products_')) {
            productSitemaps.push(loc);
          }
        });

        if (productSitemaps.length > 0) {
          let totalCount = 0;
          // Limit to first 10 sitemaps (up to 10k products) to prevent network lag
          const sitemapsToFetch = productSitemaps.slice(0, 10);
          const sitemapPromises = sitemapsToFetch.map(async (url) => {
            try {
              const sRes = await axios.get(url, { timeout: 6000, headers: requestHeaders });
              if (sRes.status === 200 && sRes.data) {
                const s$ = cheerio.load(sRes.data, { xmlMode: true });
                return s$('url').length;
              }
            } catch (err) {}
            return 0;
          });
          const counts = await Promise.all(sitemapPromises);
          totalCount = counts.reduce((acc, curr) => acc + curr, 0);
          if (totalCount > 0) return totalCount;
        }
      }
    } catch (err) {}

    // Strategy 2: Directly fetch first sitemap page
    try {
      const sitemapUrl = `${baseUrl}/sitemap_products_1.xml`;
      const res = await axios.get(sitemapUrl, { timeout: 6000, headers: requestHeaders });
      if (res.status === 200 && res.data) {
        const $ = cheerio.load(res.data, { xmlMode: true });
        const count = $('url').length;
        if (count > 0) return count;
      }
    } catch (err) {}

    // Strategy 3: Paginated products.json query (fetches up to 1000 items)
    try {
      let totalFetched = 0;
      let page = 1;
      let limit = 250;
      let hasMore = true;
      
      while (hasMore && page <= 4) {
        const jsonUrl = `${baseUrl}/products.json?limit=${limit}&page=${page}`;
        const res = await axios.get(jsonUrl, { timeout: 5000, headers: requestHeaders });
        if (res.status === 200 && res.data && Array.isArray(res.data.products)) {
          const count = res.data.products.length;
          totalFetched += count;
          if (count < limit) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }
      if (totalFetched > 0) return totalFetched;
    } catch (err) {}
  }

  if (technology === 'WooCommerce') {
    // Strategy 1: Fetch sitemap index and extract product sitemaps
    try {
      const sitemapUrls = [`${baseUrl}/sitemap_index.xml`, `${baseUrl}/sitemap.xml`];
      for (const sUrl of sitemapUrls) {
        try {
          const res = await axios.get(sUrl, { timeout: 5000, headers: requestHeaders });
          if (res.status === 200 && res.data) {
            const $ = cheerio.load(res.data, { xmlMode: true });
            const productSitemaps = [];
            
            $('sitemap loc').each((i, el) => {
              const loc = $(el).text();
              if (loc.includes('product-sitemap') || loc.includes('sitemap-products')) {
                productSitemaps.push(loc);
              }
            });

            if (productSitemaps.length > 0) {
              let totalCount = 0;
              const sitemapsToFetch = productSitemaps.slice(0, 5);
              const sitemapPromises = sitemapsToFetch.map(async (url) => {
                try {
                  const sRes = await axios.get(url, { timeout: 5000, headers: requestHeaders });
                  if (sRes.status === 200 && sRes.data) {
                    const s$ = cheerio.load(sRes.data, { xmlMode: true });
                    return s$('url').length;
                  }
                } catch (err) {}
                return 0;
              });
              const counts = await Promise.all(sitemapPromises);
              totalCount = counts.reduce((acc, curr) => acc + curr, 0);
              if (totalCount > 0) return totalCount;
            }
          }
        } catch (e) {}
      }
    } catch (err) {}

    // Strategy 2: Fallback to direct product-sitemap.xml
    try {
      const sitemapUrl = `${baseUrl}/product-sitemap.xml`;
      const res = await axios.get(sitemapUrl, { timeout: 6000, headers: requestHeaders });
      if (res.status === 200 && res.data) {
        const $ = cheerio.load(res.data, { xmlMode: true });
        const count = $('url').length;
        if (count > 0) return count;
      }
    } catch (err) {}
  }

  return null;
}

/**
 * Complete detect flow
 * @param {string} url 
 * @returns {Promise<object>} Detection summary
 */
export async function detectTechnology(url) {
  const normalized = normalizeUrl(url);

  try {
    const { html, headers, responseUrl } = await fetchPage(normalized);
    const analysis = analyze(html, headers);
    
    let productCount = null;
    if (analysis.detected && analysis.technology) {
      productCount = await scrapeProductCount(responseUrl, analysis.technology);
    }
    
    return {
      url: normalized,
      resolvedUrl: responseUrl,
      success: true,
      productCount,
      ...analysis
    };
  } catch (error) {
    return {
      url: normalized,
      success: false,
      error: error.message
    };
  }
}
