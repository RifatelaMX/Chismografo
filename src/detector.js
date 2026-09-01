import axios from 'axios';
import * as cheerio from 'cheerio';
import {
	getAppRules,
	getCmsRules,
	getGatewayRules,
	getInfraRules,
	getPixelRules,
} from './techRulesLoader.js';

/**
 * Normalizes a input URL string to include protocol
 * @param {string} urlStr
 * @returns {string} Normalized URL
 */
export function normalizeUrl(urlStr) {
	let cleaned = urlStr.trim();
	if (!/^https?:\/\//i.test(cleaned)) {
		cleaned = `https://${cleaned}`;
	}
	try {
		const parsed = new URL(cleaned);
		return parsed.href;
	} catch (_err) {
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
		'User-Agent':
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		Accept:
			'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
		'Cache-Control': 'no-cache',
		Pragma: 'no-cache',
	};

	try {
		const response = await axios.get(normalized, {
			headers,
			timeout: 12000,
			maxRedirects: 5,
			validateStatus: (status) => status >= 200 && status < 400,
		});

		return {
			html: response.data,
			headers: response.headers,
			responseUrl: response.request.res.responseUrl || normalized,
			status: response.status,
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
	const metaTheme =
		$('meta#shopify-theme-name').attr('content') ||
		$('meta[name="shopify-theme-name"]').attr('content');
	if (metaTheme) return metaTheme;

	// 2. Try JS variable in script tags (prioritizing schema_name)
	let scriptTheme = null;
	$('script').each((_i, el) => {
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
				} catch (_e) {
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
	const shopifyGatewaysMatch =
		html.match(/Shopify\.payment_gateways\s*=\s*(\[[^\]]*\])/i) ||
		html.match(/"paymentGateways"\s*:\s*(\[[^\]]*\])/i);
	if (shopifyGatewaysMatch) {
		try {
			const cleanedJson = shopifyGatewaysMatch[1].replace(/\\"/g, '"');
			const parsed = JSON.parse(cleanedJson);
			if (Array.isArray(parsed)) {
				parsed.forEach((gw) => {
					let name = gw.trim();
					if (name.toLowerCase() === 'stripe') name = 'Stripe';
					if (name.toLowerCase() === 'paypal') name = 'PayPal';
					if (name.toLowerCase() === 'conekta') name = 'Conekta';
					if (name.toLowerCase() === 'mercado_pago' || name.toLowerCase() === 'mercadopago')
						name = 'Mercado Pago';
					if (name.toLowerCase() === 'openpay') name = 'Openpay';
					if (name.toLowerCase() === 'klarna') name = 'Klarna';
					if (name.toLowerCase() === 'aplazo') name = 'Aplazo';
					if (name.toLowerCase() === 'kueski' || name.toLowerCase() === 'kueskipay')
						name = 'Kueski Pay';
					gateways.add(name);
				});
			}
		} catch (_e) {
			const strMatch = shopifyGatewaysMatch[1];
			if (strMatch.includes('stripe')) gateways.add('Stripe');
			if (strMatch.includes('paypal')) gateways.add('PayPal');
			if (strMatch.includes('conekta')) gateways.add('Conekta');
			if (strMatch.includes('mercado') || strMatch.includes('mercadopago'))
				gateways.add('Mercado Pago');
			if (strMatch.includes('openpay')) gateways.add('Openpay');
			if (strMatch.includes('klarna')) gateways.add('Klarna');
		}
	}

	// 2. Dynamic gateway rules matching
	const gatewayRulesList = getGatewayRules();
	const $ = cheerio.load(html);

	// Pre-extract classes, attributes, etc. for quick lookup
	const combinedElementsText = [];
	$('[class], [id], [alt], [src], svg title, svg').each((_i, el) => {
		const classVal = $(el).attr('class') || '';
		const idVal = $(el).attr('id') || '';
		const altVal = $(el).attr('alt') || '';
		const srcVal = $(el).attr('src') || '';
		const textVal = el.name === 'title' ? $(el).text() : '';
		const svgClass = el.name === 'svg' ? $(el).attr('class') || '' : '';
		combinedElementsText.push(`${classVal} ${idVal} ${altVal} ${srcVal} ${textVal} ${svgClass}`);
	});

	gatewayRulesList.forEach((gw) => {
		let isMatched = false;

		if (Array.isArray(gw.detectionRules)) {
			for (const rule of gw.detectionRules) {
				const regex = rule.regex;
				if (!regex) continue;

				if (rule.type === 'script-src') {
					const matchedScript = scripts.find(
						(s) => (s.src && regex.test(s.src)) || (s.content && regex.test(s.content))
					);
					const matchedLink = links.find((l) => l.href && regex.test(l.href));
					if (matchedScript || matchedLink) {
						isMatched = true;
						break;
					}
				} else if (rule.type === 'html') {
					// Check overall html string
					if (regex.test(html)) {
						isMatched = true;
						break;
					}
					// Check element attributes, classes, etc.
					const matchedEl = combinedElementsText.find((txt) => regex.test(txt));
					if (matchedEl) {
						isMatched = true;
						break;
					}
				}
			}
		}

		if (isMatched) {
			gateways.add(gw.name);
		}
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
	$('meta').each((_i, el) => {
		const name = $(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv');
		const content = $(el).attr('content');
		if (name && content) {
			metaTags.push({ name: name.toLowerCase(), content });
		}
	});

	const scripts = [];
	$('script').each((_i, el) => {
		const src = $(el).attr('src');
		const content = $(el).text();
		scripts.push({ src, content });
	});

	const links = [];
	$('link').each((_i, el) => {
		const href = $(el).attr('href');
		const rel = $(el).attr('rel');
		if (href) {
			links.push({ href, rel });
		}
	});

	const classes = new Set();
	$('[class]').each((_i, el) => {
		const className = $(el).attr('class');
		if (className) {
			className.split(/\s+/).forEach((c) => {
				if (c) classes.add(c);
			});
		}
	});

	// Evaluate rules for each CMS platform loaded dynamically
	const cmsPlatforms = getCmsRules();
	for (const cms of cmsPlatforms) {
		const tech = cms.name;
		const matchedRules = [];
		const unmatchedRules = [];
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
						const matchingMeta = metaTags.find((m) => m.name === rule.key.toLowerCase());
						if (matchingMeta && regex.test(matchingMeta.content)) {
							isMatch = true;
							matchContext = `<meta name="${matchingMeta.name}" content="${matchingMeta.content}">`;
						}
						break;
					}

					case 'script-src': {
						const matchingScript = scripts.find((s) => s.src && regex.test(s.src));
						if (matchingScript) {
							isMatch = true;
							matchContext = `<script src="${matchingScript.src}">`;
						}
						break;
					}

					case 'script-content': {
						const matchingScript = scripts.find((s) => s.content && regex.test(s.content));
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
						const matchingLink = links.find((l) => regex.test(l.href));
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
						$(`[${rule.attribute}]`).each((_i, el) => {
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
						weight: rule.weight || 0.5,
						pattern: rule.pattern,
						passed: true,
					});
					matchedWeights.push(rule.weight || 0.5);
				} else {
					unmatchedRules.push({
						id: rule.id || `${tech}-${rule.type}`,
						description: rule.description,
						type: rule.type,
						pattern: rule.pattern,
						key: rule.key,
						attribute: rule.attribute,
						weight: rule.weight || 0.5,
						passed: false,
					});
				}
			}
		}

		const totalRules = (cms.detectionRules || []).length;
		if (matchedRules.length > 0) {
			let complementProduct = 1.0;
			for (const w of matchedWeights) {
				complementProduct *= 1.0 - w;
			}
			const confidence = parseFloat((1.0 - complementProduct).toFixed(4));

			results[tech] = {
				detected: true,
				confidence,
				matchedRules,
				unmatchedRules,
				totalRules,
				passedCount: matchedRules.length,
				failedCount: unmatchedRules.length,
			};
		} else {
			results[tech] = {
				detected: false,
				confidence: 0,
				matchedRules: [],
				unmatchedRules,
				totalRules,
				passedCount: 0,
				failedCount: unmatchedRules.length,
			};
		}
	}

	// --- Plugin, App & Module Detection ---
	const detectedPlugins = [];

	const formatName = (slug) => {
		return slug
			.split(/[-_]/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	// Shopify dynamically loaded scripts (asyncLoad urls list)
	const shopifyDynamicUrls = [];
	scripts.forEach((s) => {
		if (s.content && /asyncLoad|loadScripts|loadMultiple/i.test(s.content)) {
			const urlRegex = /(https?:)?\\?\/\\?\/[a-zA-Z0-9-_./?&+=*%~#]+/gi;
			let m;
			// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop idiom
			while ((m = urlRegex.exec(s.content)) !== null) {
				let cleanUrl = m[0].replace(/\\/g, ''); // Remove backslashes
				if (cleanUrl.startsWith('//')) {
					cleanUrl = `https:${cleanUrl}`;
				}
				shopifyDynamicUrls.push(cleanUrl);
			}
		}
	});

	// 1. App Signatures Scan (Shopify Apps, Analytics, Chat, Gateways)
	const checkedApps = new Set();
	const appRulesList = getAppRules();

	appRulesList.forEach((app) => {
		let isAppMatched = false;
		let matchedEvidence = '';

		if (Array.isArray(app.detectionRules)) {
			for (const rule of app.detectionRules) {
				const regex = rule.regex;
				if (!regex) continue;

				const matchedScript = scripts.find(
					(s) => (s.src && regex.test(s.src)) || (s.content && regex.test(s.content))
				);
				const matchedLink = links.find((l) => l.href && regex.test(l.href));
				const matchedDynamicUrl = shopifyDynamicUrls.find((url) => regex.test(url));

				if (matchedScript || matchedLink || matchedDynamicUrl) {
					isAppMatched = true;
					matchedEvidence = matchedScript
						? matchedScript.src || 'Script en Línea'
						: matchedLink
							? matchedLink.href
							: matchedDynamicUrl;
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
					appStores: (app.appStores || []).map((store) => {
						if (store.cms === 'Shopify' && store.link && !store.link.startsWith('http')) {
							return { ...store, link: `https://apps.shopify.com/${store.link}` };
						}
						return store;
					}),
					logo: app.logo || '',
					category: app.category,
					type: 'signature',
					evidence: matchedEvidence,
				});
			}
		}
	});

	// 1b. Infrastructure Scan
	const detectedInfra = [];
	const infraRulesList = getInfraRules();

	infraRulesList.forEach((infra) => {
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
						const matchingScript = scripts.find((s) => s.src && regex.test(s.src));
						if (matchingScript) {
							isInfraMatched = true;
							matchedEvidence = `<script src="${matchingScript.src}">`;
						}
						break;
					}

					case 'link-href': {
						const matchingLink = links.find((l) => regex.test(l.href));
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
				evidence: matchedEvidence,
			});
		}
	});

	// 1.5 Pixels Scan
	const detectedPixels = [];
	const pixelRulesList = getPixelRules();

	pixelRulesList.forEach((px) => {
		let isPixelMatched = false;
		let matchedEvidence = '';

		if (Array.isArray(px.detectionRules)) {
			for (const rule of px.detectionRules) {
				const regex = rule.regex;
				if (!regex) continue;

				if (rule.type === 'script-src' || rule.type === 'script-content') {
					const matchedScript = scripts.find(
						(s) => (s.src && regex.test(s.src)) || (s.content && regex.test(s.content))
					);
					if (matchedScript) {
						isPixelMatched = true;
						matchedEvidence = matchedScript.src || 'Script en Línea';
						break;
					}
				}
			}
		}

		if (isPixelMatched) {
			detectedPixels.push({
				name: px.name,
				category: px.category || 'Píxeles / Tracking',
				web: px.web || '',
				logo: px.logo || '',
				evidence: matchedEvidence,
			});
		}
	});

	// 2. WooCommerce / WordPress Plugins Scan
	const wpPlugins = new Set();
	const wpPluginRegex = /\/wp-content\/plugins\/([a-zA-Z0-9-_]+)/i;

	scripts.forEach((s) => {
		if (s.src) {
			const match = s.src.match(wpPluginRegex);
			if (match) wpPlugins.add(match[1].toLowerCase());
		}
	});
	links.forEach((l) => {
		if (l.href) {
			const match = l.href.match(wpPluginRegex);
			if (match) wpPlugins.add(match[1].toLowerCase());
		}
	});

	wpPlugins.forEach((slug) => {
		if (slug === 'woocommerce') return;
		detectedPlugins.push({
			name: formatName(slug),
			platform: 'WooCommerce',
			category: 'Plugin de WordPress',
			type: 'dynamic-path',
			evidence: `/wp-content/plugins/${slug}/`,
		});
	});

	// 3. PrestaShop Modules Scan
	const psModules = new Set();
	const psModuleRegex = /\/modules\/([a-zA-Z0-9-_]+)/i;

	scripts.forEach((s) => {
		if (s.src) {
			const match = s.src.match(psModuleRegex);
			if (match) psModules.add(match[1].toLowerCase());
		}
	});
	links.forEach((l) => {
		if (l.href) {
			const match = l.href.match(psModuleRegex);
			if (match) psModules.add(match[1].toLowerCase());
		}
	});
	$('[src]').each((_i, el) => {
		const src = $(el).attr('src');
		if (src) {
			const match = src.match(psModuleRegex);
			if (match) psModules.add(match[1].toLowerCase());
		}
	});

	psModules.forEach((slug) => {
		detectedPlugins.push({
			name: formatName(slug),
			platform: 'PrestaShop',
			category: 'Módulo de PrestaShop',
			type: 'dynamic-path',
			evidence: `/modules/${slug}/`,
		});
	});

	// 4. Magento Modules Scan
	const magentoModules = new Set();
	const magentoModuleRegex =
		/\/static\/frontend\/[^/]+\/[^/]+\/[^/]+\/([a-zA-Z0-9]+_[a-zA-Z0-9]+)/i;

	scripts.forEach((s) => {
		if (s.src) {
			const match = s.src.match(magentoModuleRegex);
			if (match) magentoModules.add(match[1]);
		}
	});
	links.forEach((l) => {
		if (l.href) {
			const match = l.href.match(magentoModuleRegex);
			if (match) magentoModules.add(match[1]);
		}
	});

	magentoModules.forEach((moduleName) => {
		detectedPlugins.push({
			name: moduleName.replace('_', ' '),
			platform: 'Magento',
			category: 'Módulo de Magento',
			type: 'dynamic-path',
			evidence: moduleName,
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
		? detectedPlugins.filter((p) => {
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
		const matchedLink = links.find((l) => l.href && wpThemeRegex.test(l.href));
		if (matchedLink) {
			const match = matchedLink.href.match(wpThemeRegex);
			if (match) {
				theme = match[1]
					.split(/[-_]/)
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(' ');
			}
		}
	}
	// Try PrestaShop theme
	if (!theme) {
		const psThemeRegex = /\/themes\/([a-zA-Z0-9-_]+)\//i;
		const matchedLink = links.find(
			(l) => l.href && psThemeRegex.test(l.href) && !l.href.includes('wp-content')
		);
		if (matchedLink) {
			const match = matchedLink.href.match(psThemeRegex);
			if (match) {
				theme = match[1]
					.split(/[-_]/)
					.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
					.join(' ');
			}
		}
	}

	const paymentGateways = detectPaymentGateways(html, scripts, links);

	return {
		detected: primaryTech !== null,
		technology: primaryTech,
		confidence: highestConfidence,
		matches: results,
		matchedRules: primaryTech && results[primaryTech] ? results[primaryTech].matchedRules : [],
		unmatchedRules: primaryTech && results[primaryTech] ? results[primaryTech].unmatchedRules : [],
		plugins: filteredPlugins,
		theme: theme,
		paymentGateways: paymentGateways,
		infrastructure: detectedInfra,
		pixels: detectedPixels,
	};
}

/**
 * Scrapes the number of products from a store
 * @param {string} urlStr
 * @param {string} technology
 * @param {string} [pageHtml]
 * @returns {Promise<number|null>} Product count
 */
export async function scrapeProductCount(urlStr, technology, pageHtml = '') {
	if (!technology) return null;

	let baseUrl = urlStr;
	try {
		const parsed = new URL(urlStr);
		baseUrl = `${parsed.protocol}//${parsed.hostname}`;
	} catch (_e) {}

	// Browser-like headers to bypass simple bot mitigation on sitemaps/endpoints
	const requestHeaders = {
		'User-Agent':
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
	};

	// 1. Shopify
	if (technology === 'Shopify') {
		// Strategy 1: Fetch main sitemap.xml and sum URLs across product sub-sitemaps
		try {
			const sitemapUrl = `${baseUrl}/sitemap.xml`;
			const res = await axios.get(sitemapUrl, {
				timeout: 6000,
				headers: requestHeaders,
			});
			if (res.status === 200 && res.data) {
				const $ = cheerio.load(res.data, { xmlMode: true });
				const productSitemaps = [];

				$('sitemap loc').each((_i, el) => {
					const loc = $(el).text().trim();
					if (loc.includes('sitemap_products_') || loc.includes('products-sitemap')) {
						productSitemaps.push(loc);
					}
				});

				if (productSitemaps.length > 0) {
					let totalCount = 0;
					const sitemapsToFetch = productSitemaps.slice(0, 15);
					const sitemapPromises = sitemapsToFetch.map(async (sUrl) => {
						try {
							const sRes = await axios.get(sUrl, {
								timeout: 6000,
								headers: requestHeaders,
							});
							if (sRes.status === 200 && sRes.data) {
								const s$ = cheerio.load(sRes.data, { xmlMode: true });
								return s$('url').length;
							}
						} catch (_err) {}
						return 0;
					});
					const counts = await Promise.all(sitemapPromises);
					totalCount = counts.reduce((acc, curr) => acc + curr, 0);
					if (totalCount > 0) return totalCount;
				}
			}
		} catch (_err) {}

		// Strategy 2: Directly fetch first product sitemap page
		try {
			const sitemapUrl = `${baseUrl}/sitemap_products_1.xml`;
			const res = await axios.get(sitemapUrl, {
				timeout: 6000,
				headers: requestHeaders,
			});
			if (res.status === 200 && res.data) {
				const $ = cheerio.load(res.data, { xmlMode: true });
				const count = $('url').length;
				if (count > 0) return count;
			}
		} catch (_err) {}

		// Strategy 3: Paginated products.json query
		try {
			let totalFetched = 0;
			let page = 1;
			const limit = 250;
			let hasMore = true;

			while (hasMore && page <= 4) {
				const jsonUrl = `${baseUrl}/products.json?limit=${limit}&page=${page}`;
				const res = await axios.get(jsonUrl, {
					timeout: 5000,
					headers: requestHeaders,
				});
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
		} catch (_err) {}
	}

	// 2. WooCommerce
	if (technology === 'WooCommerce') {
		// Strategy 1: WooCommerce Store API Public Endpoint
		try {
			const storeApiUrl = `${baseUrl}/wp-json/wc/store/v1/products?per_page=1`;
			const res = await axios.get(storeApiUrl, {
				timeout: 5000,
				headers: requestHeaders,
			});
			const totalHeader = res.headers['x-wp-total'];
			if (totalHeader) {
				const total = parseInt(totalHeader, 10);
				if (!isNaN(total) && total > 0) return total;
			}
		} catch (_err) {}

		// Strategy 2: Sitemap indexes (Yoast, RankMath, WP Core, AllInOneSEO)
		try {
			const sitemapIndexUrls = [
				`${baseUrl}/sitemap_index.xml`,
				`${baseUrl}/sitemap.xml`,
				`${baseUrl}/wp-sitemap.xml`,
			];
			for (const sUrl of sitemapIndexUrls) {
				try {
					const res = await axios.get(sUrl, {
						timeout: 5000,
						headers: requestHeaders,
					});
					if (res.status === 200 && res.data) {
						const $ = cheerio.load(res.data, { xmlMode: true });
						const productSitemaps = [];

						$('sitemap loc').each((_i, el) => {
							const loc = $(el).text().trim();
							if (
								loc.includes('product-sitemap') ||
								loc.includes('sitemap-products') ||
								loc.includes('wp-sitemap-posts-product')
							) {
								productSitemaps.push(loc);
							}
						});

						if (productSitemaps.length > 0) {
							let totalCount = 0;
							const sitemapsToFetch = productSitemaps.slice(0, 10);
							const sitemapPromises = sitemapsToFetch.map(async (url) => {
								try {
									const sRes = await axios.get(url, {
										timeout: 5000,
										headers: requestHeaders,
									});
									if (sRes.status === 200 && sRes.data) {
										const s$ = cheerio.load(sRes.data, { xmlMode: true });
										return s$('url').length;
									}
								} catch (_err) {}
								return 0;
							});
							const counts = await Promise.all(sitemapPromises);
							totalCount = counts.reduce((acc, curr) => acc + curr, 0);
							if (totalCount > 0) return totalCount;
						}
					}
				} catch (_e) {}
			}
		} catch (_err) {}

		// Strategy 3: Direct sitemap files
		const directSitemaps = [
			`${baseUrl}/product-sitemap.xml`,
			`${baseUrl}/wp-sitemap-posts-product-1.xml`,
		];
		for (const sUrl of directSitemaps) {
			try {
				const res = await axios.get(sUrl, {
					timeout: 5000,
					headers: requestHeaders,
				});
				if (res.status === 200 && res.data) {
					const $ = cheerio.load(res.data, { xmlMode: true });
					const count = $('url').length;
					if (count > 0) return count;
				}
			} catch (_err) {}
		}
	}

	// 3. VTEX
	if (technology === 'VTEX') {
		// Strategy 1: VTEX Public Search API Header
		try {
			const vtexSearchUrl = `${baseUrl}/api/catalog_system/pub/products/search?_from=0&_to=0`;
			const res = await axios.get(vtexSearchUrl, {
				timeout: 5000,
				headers: requestHeaders,
			});
			const resources = res.headers.resources;
			if (resources && resources.includes('/')) {
				const total = parseInt(resources.split('/')[1], 10);
				if (!isNaN(total) && total > 0) return total;
			}
		} catch (_err) {}

		// Strategy 2: VTEX Sitemaps
		try {
			const sitemapUrl = `${baseUrl}/sitemap/product-0.xml`;
			const res = await axios.get(sitemapUrl, {
				timeout: 5000,
				headers: requestHeaders,
			});
			if (res.status === 200 && res.data) {
				const $ = cheerio.load(res.data, { xmlMode: true });
				const count = $('url').length;
				if (count > 0) return count;
			}
		} catch (_err) {}
	}

	// 4. Magento / PrestaShop / Generic E-Commerce Sitemaps
	if (['Magento', 'PrestaShop'].includes(technology)) {
		const candidateSitemaps = [
			`${baseUrl}/sitemap.xml`,
			`${baseUrl}/pub/sitemap.xml`,
			`${baseUrl}/1_index_sitemap.xml`,
		];
		for (const sUrl of candidateSitemaps) {
			try {
				const res = await axios.get(sUrl, {
					timeout: 5000,
					headers: requestHeaders,
				});
				if (res.status === 200 && res.data) {
					const $ = cheerio.load(res.data, { xmlMode: true });
					let productUrlsCount = 0;
					$('url loc').each((_i, el) => {
						const loc = $(el).text().toLowerCase();
						if (
							loc.includes('/product') ||
							loc.includes('/producto') ||
							loc.includes('/catalog/') ||
							loc.includes('.html')
						) {
							productUrlsCount++;
						}
					});
					if (productUrlsCount > 0) return productUrlsCount;
				}
			} catch (_err) {}
		}
	}

	// 5. Schema.org Product item counting in provided page HTML
	if (pageHtml) {
		try {
			const $ = cheerio.load(pageHtml);
			let count = 0;
			$('script[type="application/ld+json"]').each((_i, el) => {
				try {
					const json = JSON.parse($(el).html() || '{}');
					if (json['@type'] === 'Product') count++;
					if (Array.isArray(json['@graph'])) {
						json['@graph'].forEach((item) => {
							if (item['@type'] === 'Product') count++;
						});
					}
					if (json['@type'] === 'ItemList' && Array.isArray(json.itemListElement)) {
						count += json.itemListElement.length;
					}
				} catch (_e) {}
			});
			if (count > 0) return count;
		} catch (_err) {}
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
			productCount = await scrapeProductCount(responseUrl, analysis.technology, html);
		}

		return {
			url: normalized,
			resolvedUrl: responseUrl,
			success: true,
			productCount,
			scanDate: new Date().toISOString(),
			...analysis,
		};
	} catch (error) {
		return {
			url: normalized,
			success: false,
			scanDate: new Date().toISOString(),
			error: error.message,
		};
	}
}

/**
 * Evaluates an arbitrary array of detection rules against HTML and headers
 * @param {string} html Raw HTML page content
 * @param {object} headers Response HTTP headers object
 * @param {Array<object>} rules List of detectionRules
 * @returns {object} Evaluation breakdown with matched/unmatched rules & score
 */
export function evaluateCustomRules(html = '', headers = {}, rules = []) {
	const $ = cheerio.load(html || '');

	const lowerHeaders = {};
	if (headers && typeof headers === 'object') {
		for (const [key, val] of Object.entries(headers)) {
			lowerHeaders[key.toLowerCase()] = String(val);
		}
	}

	const metaTags = [];
	$('meta').each((_i, el) => {
		const name = $(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv');
		const content = $(el).attr('content');
		if (name && content) {
			metaTags.push({ name: name.toLowerCase(), content });
		}
	});

	const scripts = [];
	$('script').each((_i, el) => {
		const src = $(el).attr('src');
		const content = $(el).text();
		scripts.push({ src, content });
	});

	const links = [];
	$('link').each((_i, el) => {
		const href = $(el).attr('href');
		const rel = $(el).attr('rel');
		if (href) {
			links.push({ href, rel });
		}
	});

	const classes = new Set();
	$('[class]').each((_i, el) => {
		const className = $(el).attr('class');
		if (className) {
			className.split(/\s+/).forEach((c) => {
				if (c) classes.add(c);
			});
		}
	});

	const ruleResults = [];
	const matchedWeights = [];

	if (Array.isArray(rules)) {
		for (let i = 0; i < rules.length; i++) {
			const rule = rules[i];
			let isMatch = false;
			let matchContext = null;
			let regexError = null;
			let regex = null;

			try {
				if (rule.pattern) {
					regex = new RegExp(rule.pattern, 'i');
				}
			} catch (err) {
				regexError = err.message;
			}

			if (regex && !regexError) {
				const ruleType = rule.type;
				const weight =
					typeof rule.weight === 'number' ? rule.weight : parseFloat(rule.weight) || 0.5;

				switch (ruleType) {
					case 'header': {
						if (rule.key) {
							const headerVal = lowerHeaders[rule.key.toLowerCase()];
							if (headerVal && regex.test(headerVal)) {
								isMatch = true;
								matchContext = `${rule.key}: ${headerVal}`;
							}
						}
						break;
					}

					case 'meta': {
						if (rule.key) {
							const matchingMeta = metaTags.find((m) => m.name === rule.key.toLowerCase());
							if (matchingMeta && regex.test(matchingMeta.content)) {
								isMatch = true;
								matchContext = `<meta name="${matchingMeta.name}" content="${matchingMeta.content}">`;
							}
						}
						break;
					}

					case 'script-src': {
						const matchingScript = scripts.find((s) => s.src && regex.test(s.src));
						if (matchingScript) {
							isMatch = true;
							matchContext = `<script src="${matchingScript.src}">`;
						}
						break;
					}

					case 'script-content': {
						const matchingScript = scripts.find((s) => s.content && regex.test(s.content));
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
						const matchingLink = links.find((l) => l.href && regex.test(l.href));
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
						if (rule.attribute) {
							$(`[${rule.attribute}]`).each((_i, el) => {
								const val = $(el).attr(rule.attribute);
								if (val && regex.test(val)) {
									isMatch = true;
									matchContext = `<${el.name} ${rule.attribute}="${val}">`;
									return false;
								}
							});
						}
						break;
					}
				}

				if (isMatch) {
					matchedWeights.push(weight);
				}
			}

			ruleResults.push({
				index: i,
				rule,
				isMatch,
				matchContext,
				regexError,
				weight: typeof rule.weight === 'number' ? rule.weight : parseFloat(rule.weight) || 0.5,
			});
		}
	}

	let complementProduct = 1.0;
	for (const w of matchedWeights) {
		complementProduct *= 1.0 - w;
	}
	const confidence =
		matchedWeights.length > 0 ? parseFloat((1.0 - complementProduct).toFixed(4)) : 0;

	return {
		rules: ruleResults,
		matchedCount: matchedWeights.length,
		totalRules: rules.length,
		confidence,
		confidencePercentage: Math.round(confidence * 100),
	};
}
