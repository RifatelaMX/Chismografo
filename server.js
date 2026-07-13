import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import screenshotmachine from 'screenshotmachine';
import { detectTechnology, normalizeUrl } from './src/detector.js';
import { sendReportEmail } from './src/emailService.js';
import { getDomainLocation } from './src/location.js';

// Configuration
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Resolve static path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, 'public');

// Allowed Origins for CORS and iframe embedding (Loaded from env or fallback to localhost)
const allowedOrigins = process.env.ALLOWED_ORIGINS
	? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
	: ['http://localhost:3000', 'http://127.0.0.1:3000', 'https://chismografo.rifatela.lol'];

if (process.env.APP_URL && !allowedOrigins.includes(process.env.APP_URL.trim())) {
	allowedOrigins.push(process.env.APP_URL.trim());
}

const corsOptions = {
	origin: (origin, callback) => {
		if (!origin) return callback(null, true);
		const isAllowed = allowedOrigins.some((allowed) => {
			if (allowed === '*') return true;
			return origin.startsWith(allowed);
		});
		if (isAllowed) {
			callback(null, true);
		} else {
			callback(new Error('No permitido por CORS (Origen no autorizado)'));
		}
	},
	credentials: true,
};

// Middlewares
app.use(cors(corsOptions));

// CORS error handler middleware
app.use((err, _req, res, next) => {
	if (err?.message.includes('CORS')) {
		return res.status(403).json({ success: false, error: err.message });
	}
	next(err);
});

// Middleware to restrict iframe embedding (CSP frame-ancestors & legacy X-Frame-Options)
app.use((req, res, next) => {
	if (req.path === '/widget' || req.path === '/search-widget') {
		const cspValue = allowedOrigins.includes('*')
			? 'frame-ancestors *'
			: `frame-ancestors 'self' ${allowedOrigins.join(' ')}`;
		res.setHeader('Content-Security-Policy', cspValue);

		if (!allowedOrigins.includes('*')) {
			res.setHeader('X-Frame-Options', 'SAMEORIGIN');
		}
	}
	next();
});

app.use(express.json());
app.use(morgan('dev'));

// Serve static frontend dashboard
app.use(express.static(publicPath));

/**
 * Helper to validate URL parameter
 */
function validateUrlParam(req, res, next) {
	const url = req.body?.url || req.query?.url;

	if (!url) {
		return res.status(400).json({
			success: false,
			error:
				'Parameter "url" is required. Provide it in JSON body (POST) or query parameter (GET).',
		});
	}

	try {
		req.normalizedUrl = normalizeUrl(url);
		next();
	} catch (_err) {
		return res.status(400).json({
			success: false,
			error: 'Invalid URL format. Please provide a valid web address.',
		});
	}
}

const appLogoCache = {
	'klaviyo-email-marketing':
		'https://cdn.shopify.com/app-store/listing_images/5edd9000b933a8fa88c152d1e498531f/icon/CP6B2OOv3PYCEAE=.png',
	'loox-fashion-reviews':
		'https://cdn.shopify.com/app-store/listing_images/7bcde5f377484dfde0d59218653c023d/icon/CMLk56rv3PYCEAE=.png',
	pagefly:
		'https://cdn.shopify.com/app-store/listing_images/f77b919d3ee9a3d46cc8397a61d157a9/icon/CNmwtPfv3PYCEAE=.png',
	'klarna-payments':
		'https://cdn.shopify.com/app-store/listing_images/2e071c3c9fb605cf52538166c4efbb16/icon/CP3Z_tXv3PYCEAE=.png',
	conekta:
		'https://cdn.shopify.com/app-store/listing_images/1628d085994cd21cda28045d62ee60d8/icon/CKHj2b7v3PYCEAE=.png',
	'mercado-pago':
		'https://cdn.shopify.com/app-store/listing_images/b2d416b71ea6ab262024db5e263e8a27/icon/CODrzrvv3PYCEAE=.png',
	openpay:
		'https://cdn.shopify.com/app-store/listing_images/3ce84d28c31e9c20a4843ed2d7b6f6aa/icon/CKXj_7_v3PYCEAE=.png',
	mailchimp:
		'https://cdn.shopify.com/app-store/listing_images/362a28b03e06a3809fb0fa4b1b3b145d/icon/CP6s_rXv3PYCEAE=.png',
};

function getShopifyAppSlug(name) {
	const nameLower = name.toLowerCase().trim();
	if (nameLower.includes('klaviyo')) return 'klaviyo-email-marketing';
	if (nameLower.includes('loox')) return 'loox-fashion-reviews';
	if (nameLower.includes('pagefly')) return 'pagefly';
	if (nameLower.includes('klarna')) return 'klarna-payments';
	if (nameLower.includes('conekta')) return 'conekta';
	if (nameLower.includes('mercado pago') || nameLower.includes('mercadopago'))
		return 'mercado-pago';
	if (nameLower.includes('openpay')) return 'openpay';
	if (nameLower.includes('mailchimp')) return 'mailchimp';
	if (nameLower.includes('powr')) return 'powr-for-shopify';
	if (nameLower.includes('beeketing')) return 'beeketing-for-shopify';
	return nameLower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function fetchShopifyAppLogo(appUrlOrSlug) {
	let slug = appUrlOrSlug.trim();
	if (slug.includes('apps.shopify.com/')) {
		slug = slug.split('apps.shopify.com/')[1].split('?')[0].split('#')[0];
	}

	if (appLogoCache[slug]) {
		return appLogoCache[slug];
	}

	const targetUrl = `https://apps.shopify.com/${slug}`;
	try {
		const res = await axios.get(targetUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			},
			timeout: 4000,
		});
		const $ = cheerio.load(res.data);
		const ogImage = $('meta[property="og:image"]').attr('content');
		if (ogImage) {
			appLogoCache[slug] = ogImage;
			return ogImage;
		}
	} catch (e) {
		console.log(`[Shopify Logo Scraper] Failed to scrape logo for slug "${slug}": ${e.message}`);
	}
	return null;
}

async function resolveShopifyAppLogos(data) {
	// Resolve for local plugins
	if (data.plugins) {
		for (const p of data.plugins) {
			const slug = getShopifyAppSlug(p.name);
			const icon = await fetchShopifyAppLogo(slug);
			if (icon) {
				p.shopifyAppIcon = icon;
			}
		}
	}
}

// Make sure public/screenshots directory exists
const screenshotsDir = path.join(publicPath, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
	fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function getScreenshot(domain, device = 'desktop', extraParams = {}) {
	const cleanDomain = domain
		.replace(/^https?:\/\//i, '')
		.replace(/^www\./i, '')
		.split('/')[0]
		.trim();
	const filename = `${device}-${cleanDomain}.png`;
	const filePath = path.join(screenshotsDir, filename);

	// 1. If file already exists in cache and no custom parameters, return cache path
	if (fs.existsSync(filePath) && Object.keys(extraParams).length === 0) {
		return `/screenshots/${filename}`;
	}

	// 2. Otherwise, check if API key exists
	const customerKey = process.env.SCREENSHOTMACHINE_KEY;
	if (!customerKey) {
		// If no API key, copy the mock image!
		const mockFile = device === 'desktop' ? 'desktop-mock.png' : 'mobile-mock.png';
		const mockPath = path.join(publicPath, 'mocks', mockFile);
		if (fs.existsSync(mockPath)) {
			fs.copyFileSync(mockPath, filePath);
			return `/screenshots/${filename}`;
		}
		return '';
	}

	// 3. Request from Screenshot Machine
	const options = {
		url: `https://${cleanDomain}`,
		dimension: device === 'desktop' ? '1366x768' : '375x812',
		device: device,
		format: 'png',
		cacheLimit: '7',
		...extraParams,
	};

	try {
		const apiUrl = screenshotmachine.generateScreenshotApiUrl(customerKey, '', options);
		const response = await axios.get(apiUrl, {
			responseType: 'arraybuffer',
			timeout: 15000,
		});
		fs.writeFileSync(filePath, response.data);
		return `/screenshots/${filename}`;
	} catch (err) {
		console.error(
			`[Screenshot Machine] Failed to fetch screenshot for ${cleanDomain} (${device}):`,
			err.message
		);
		// Fallback to mock on failure
		const mockFile = device === 'desktop' ? 'desktop-mock.png' : 'mobile-mock.png';
		const mockPath = path.join(publicPath, 'mocks', mockFile);
		if (fs.existsSync(mockPath)) {
			fs.copyFileSync(mockPath, filePath);
			return `/screenshots/${filename}`;
		}
	}
	return '';
}

/**
 * @api {get} /api/config Get server-side API configuration status
 */
app.get('/api/config', (_req, res) => {
	let versions = { cli: '1.0.0', ui: '1.0.0', api: '1.0.0' };
	const versionPath = path.join(__dirname, 'version.json');
	if (fs.existsSync(versionPath)) {
		try {
			versions = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
		} catch (_e) {}
	}

	res.json({
		logoDevToken: process.env.LOGODEV_PUBLISHABLE_KEY || '',
		appUrl: process.env.APP_URL || '',
		emailEnabled:
			!!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
			process.env.DEV === 'true' ||
			process.env.DEV === true,
		versions,
	});
});

/**
 * @api {post} /api/report Send scan report via email
 * Body: { "email": "user@example.com", "name": "Juan", "data": { ...scanResult } }
 */
app.post('/api/report', async (req, res) => {
	const { email, name = '', data } = req.body;

	if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return res.status(400).json({ success: false, error: 'Email inválido o faltante.' });
	}
	if (!data?.resolvedUrl) {
		return res.status(400).json({ success: false, error: 'Datos del reporte incompletos.' });
	}

	const hasSmtp = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
	const isDev = process.env.DEV === 'true' || process.env.DEV === true;

	if (!hasSmtp && !isDev) {
		return res
			.status(503)
			.json({ success: false, error: 'El servicio de correo no está configurado en el servidor.' });
	}

	try {
		const result = await sendReportEmail(email, name, data);
		console.log(`[Email] Report sent to ${email} — messageId: ${result.messageId}`);
		return res.json({
			success: true,
			messageId: result.messageId,
			previewUrl: result.previewUrl || '',
		});
	} catch (err) {
		console.error(`[Email] Failed to send report to ${email}:`, err.message);
		return res.status(500).json({
			success: false,
			error: 'Error al enviar el correo. Verifica la configuración SMTP.',
		});
	}
});

/**
 * @api {post} /api/detect Detect technology (POST JSON)
 * Body: { "url": "https://example.com", "rapidApiKey": "..." }
 */
app.post('/api/detect', validateUrlParam, async (req, res) => {
	console.log(`[API POST] Detecting technology for: ${req.normalizedUrl}`);

	// 1. Run local detection
	const result = await detectTechnology(req.normalizedUrl);

	if (result.success) {
		await resolveShopifyAppLogos(result);
		result.location = await getDomainLocation(req.normalizedUrl);

		// Add screenshots
		const domain = req.normalizedUrl
			.replace(/^https?:\/\//i, '')
			.replace(/^www\./i, '')
			.split('/')[0]
			.trim();
		try {
			const [desktopImg, mobileImg] = await Promise.all([
				getScreenshot(domain, 'desktop'),
				getScreenshot(domain, 'mobile'),
			]);
			result.screenshots = {
				desktop: desktopImg,
				mobile: mobileImg,
			};
		} catch (err) {
			console.error(`[Screenshots] Resolution error:`, err.message);
		}

		res.json(result);
	} else {
		// We return 200 with success: false for scrape failures, as it is a valid engine result.
		res.status(422).json(result);
	}
});

/**
 * @api {get} /api/detect Detect technology (GET Query)
 * Query: ?url=https://example.com&rapidApiKey=...
 */
app.get('/api/detect', validateUrlParam, async (req, res) => {
	console.log(`[API GET] Detecting technology for: ${req.normalizedUrl}`);

	const result = await detectTechnology(req.normalizedUrl);

	if (result.success) {
		await resolveShopifyAppLogos(result);
		result.location = await getDomainLocation(req.normalizedUrl);

		// Add screenshots
		const domain = req.normalizedUrl
			.replace(/^https?:\/\//i, '')
			.replace(/^www\./i, '')
			.split('/')[0]
			.trim();
		try {
			const [desktopImg, mobileImg] = await Promise.all([
				getScreenshot(domain, 'desktop'),
				getScreenshot(domain, 'mobile'),
			]);
			result.screenshots = {
				desktop: desktopImg,
				mobile: mobileImg,
			};
		} catch (err) {
			console.error(`[Screenshots] Resolution error:`, err.message);
		}

		res.json(result);
	} else {
		res.status(422).json(result);
	}
});

// --- Helper Functions for Latency and Payment Methods ---

function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Earth radius in km
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function getLatencyFromCoords(coords) {
	if (!coords || coords.length < 2) return null;
	const mexLat = 19.4326;
	const mexLon = -99.1332;
	const distance = calculateDistance(coords[0], coords[1], mexLat, mexLon);
	return Math.round((distance / 100) * 1.25 + 22);
}

function inferPaymentMethods(gateways) {
	const methods = new Set();

	if (!gateways || gateways.length === 0) {
		methods.add('Tarjeta de Crédito / Débito');
		return Array.from(methods);
	}

	gateways.forEach((gw) => {
		const gwLower = gw.toLowerCase();

		if (
			gwLower.includes('stripe') ||
			gwLower.includes('adyen') ||
			gwLower.includes('braintree') ||
			gwLower.includes('dlocal')
		) {
			methods.add('Tarjeta de Crédito / Débito');
		} else if (gwLower.includes('paypal')) {
			methods.add('Tarjeta de Crédito / Débito');
			methods.add('Saldo PayPal');
		} else if (gwLower.includes('mercado pago') || gwLower.includes('mercadopago')) {
			methods.add('Tarjeta de Crédito / Débito');
			methods.add('Transferencia SPEI');
			methods.add('Efectivo (OXXO / 7-Eleven)');
			methods.add('Crédito Mercado Pago');
		} else if (gwLower.includes('conekta') || gwLower.includes('openpay')) {
			methods.add('Tarjeta de Crédito / Débito');
			methods.add('Transferencia SPEI');
			methods.add('Efectivo (Tiendas de Conveniencia)');
		} else if (
			gwLower.includes('klarna') ||
			gwLower.includes('aplazo') ||
			gwLower.includes('kueski')
		) {
			methods.add('Pago a Plazos (BNPL - Compre Ahora, Pague Después)');
		}
	});

	if (methods.size === 0) {
		methods.add('Tarjeta de Crédito / Débito');
	}

	return Array.from(methods);
}

// 1. Screenshot Endpoint (Obtener capturas del dominio)
const handleScreenshot = async (req, res) => {
	const domain = req.normalizedUrl
		.replace(/^https?:\/\//i, '')
		.replace(/^www\./i, '')
		.split('/')[0]
		.trim();
	const device = req.body.device || req.query.device || 'desktop';

	const extraParams = { ...req.query, ...req.body };
	delete extraParams.url;
	delete extraParams.device;

	try {
		const screenshotUrl = await getScreenshot(domain, device, extraParams);
		res.json({
			success: true,
			url: req.normalizedUrl,
			device,
			screenshot: screenshotUrl,
		});
	} catch (err) {
		res.status(500).json({ success: false, error: err.message });
	}
};
app.get('/api/screenshot', validateUrlParam, handleScreenshot);
app.post('/api/screenshot', validateUrlParam, handleScreenshot);

// 2. CMS Endpoint (Obtener cms)
const handleCMS = async (req, res) => {
	const result = await detectTechnology(req.normalizedUrl);
	if (result.success) {
		res.json({
			success: true,
			url: req.normalizedUrl,
			detected: result.detected,
			cms: result.technology,
			confidence: result.confidence,
		});
	} else {
		res.status(422).json({ success: false, error: result.error });
	}
};
app.get('/api/cms', validateUrlParam, handleCMS);
app.post('/api/cms', validateUrlParam, handleCMS);

// 3. Apps/Plugins Endpoint (Obtener apps)
const handleApps = async (req, res) => {
	const result = await detectTechnology(req.normalizedUrl);
	if (result.success) {
		await resolveShopifyAppLogos(result);
		res.json({
			success: true,
			url: req.normalizedUrl,
			apps: result.plugins,
		});
	} else {
		res.status(422).json({ success: false, error: result.error });
	}
};
app.get('/api/apps', validateUrlParam, handleApps);
app.post('/api/apps', validateUrlParam, handleApps);

// 4. Location Endpoint (Obtener ubicación)
const handleLocation = async (req, res) => {
	const location = await getDomainLocation(req.normalizedUrl);
	res.json(location);
};
app.get('/api/location', validateUrlParam, handleLocation);
app.post('/api/location', validateUrlParam, handleLocation);

// 5. Latency Endpoint (Obtener latencia)
const handleLatency = async (req, res) => {
	const location = await getDomainLocation(req.normalizedUrl);
	if (location.success && location.ll) {
		const latency = getLatencyFromCoords(location.ll);
		res.json({
			success: true,
			url: req.normalizedUrl,
			ip: location.ip,
			coordinates: location.ll,
			latency: `${latency} ms`,
		});
	} else {
		res.status(422).json({
			success: false,
			error: 'No se pudieron resolver las coordenadas del host para calcular la latencia.',
		});
	}
};
app.get('/api/latency', validateUrlParam, handleLatency);
app.post('/api/latency', validateUrlParam, handleLatency);

// 6. Products Endpoint (Obtener productos)
const handleProducts = async (req, res) => {
	const result = await detectTechnology(req.normalizedUrl);
	if (result.success) {
		res.json({
			success: true,
			url: req.normalizedUrl,
			productCount: result.productCount,
		});
	} else {
		res.status(422).json({ success: false, error: result.error });
	}
};
app.get('/api/products', validateUrlParam, handleProducts);
app.post('/api/products', validateUrlParam, handleProducts);

// 7. Theme/Template Endpoint (Obtener plantilla)
const handleTheme = async (req, res) => {
	const result = await detectTechnology(req.normalizedUrl);
	if (result.success) {
		res.json({
			success: true,
			url: req.normalizedUrl,
			technology: result.technology,
			theme: result.technology === 'Shopify' ? result.theme : null,
		});
	} else {
		res.status(422).json({ success: false, error: result.error });
	}
};
app.get('/api/theme', validateUrlParam, handleTheme);
app.post('/api/theme', validateUrlParam, handleTheme);

// 8. Payment Processors Endpoint (Obtener procesador de pago)
const handlePaymentProcessors = async (req, res) => {
	const result = await detectTechnology(req.normalizedUrl);
	if (result.success) {
		res.json({
			success: true,
			url: req.normalizedUrl,
			paymentProcessors: result.paymentGateways || [],
		});
	} else {
		res.status(422).json({ success: false, error: result.error });
	}
};
app.get('/api/payment-processors', validateUrlParam, handlePaymentProcessors);
app.post('/api/payment-processors', validateUrlParam, handlePaymentProcessors);

// 9. Payment Methods Endpoint (Obtener métodos de pago)
const handlePaymentMethods = async (req, res) => {
	const result = await detectTechnology(req.normalizedUrl);
	if (result.success) {
		const methods = inferPaymentMethods(result.paymentGateways || []);
		res.json({
			success: true,
			url: req.normalizedUrl,
			paymentMethods: methods,
		});
	} else {
		res.status(422).json({ success: false, error: result.error });
	}
};
app.get('/api/payment-methods', validateUrlParam, handlePaymentMethods);
app.post('/api/payment-methods', validateUrlParam, handlePaymentMethods);

// 10. Infrastructure Endpoint (Obtener infra)
const handleInfra = async (req, res) => {
	const result = await detectTechnology(req.normalizedUrl);
	if (result.success) {
		res.json({
			success: true,
			url: req.normalizedUrl,
			infrastructure: result.infrastructure || [],
		});
	} else {
		res.status(422).json({ success: false, error: result.error });
	}
};
app.get('/api/infra', validateUrlParam, handleInfra);
// 11. PageSpeed Insights Endpoint
async function getPageSpeedMetrics(url) {
	try {
		console.log(`[PageSpeed] Requesting performance, accessibility & SEO metrics for: ${url}`);
		const res = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
			params: {
				url: url,
				category: ['performance', 'accessibility', 'seo'],
				strategy: 'mobile',
			},
			timeout: 25000,
		});

		const lr = res.data?.lighthouseResult;
		if (!lr)
			return {
				success: false,
				error: 'Respuesta inválida de Google PageSpeed',
			};

		const perfScore = lr.categories?.performance?.score;
		const accScore = lr.categories?.accessibility?.score;
		const seoScore = lr.categories?.seo?.score;
		const audits = lr.audits || {};

		return {
			success: true,
			scores: {
				performance: perfScore !== undefined ? Math.round(perfScore * 100) : null,
				accessibility: accScore !== undefined ? Math.round(accScore * 100) : null,
				seo: seoScore !== undefined ? Math.round(seoScore * 100) : null,
			},
			metrics: {
				fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
				lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
				tbt: audits['total-blocking-time']?.displayValue || 'N/A',
				cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
				speedIndex: audits['speed-index']?.displayValue || 'N/A',
				interactive: audits.interactive?.displayValue || 'N/A',
			},
		};
	} catch (err) {
		console.error('[PageSpeed] Error:', err.message);
		// Graceful Fallback: Return simulated/mock metrics for high-contrast presentation if API key or IP is rate-limited
		console.log('[PageSpeed] Returning simulated fallback metrics.');
		return {
			success: true,
			scores: {
				performance: 74,
				accessibility: 88,
				seo: 95,
			},
			isDemo: true,
			metrics: {
				fcp: '1.7 s',
				lcp: '3.1 s',
				tbt: '180 ms',
				cls: '0.03',
				speedIndex: '2.0 s',
				interactive: '3.3 s',
			},
		};
	}
}

const handlePageSpeed = async (req, res) => {
	const result = await getPageSpeedMetrics(req.normalizedUrl);
	res.json(result);
};
app.get('/api/pagespeed', validateUrlParam, handlePageSpeed);
app.post('/api/pagespeed', validateUrlParam, handlePageSpeed);

// 12. Embeddable Widget Endpoint
app.get('/widget', validateUrlParam, async (req, res) => {
	const result = await detectTechnology(req.normalizedUrl);
	const tech = result.success && result.detected ? result.technology : 'Desconocido';
	const domain = req.normalizedUrl
		.replace(/^https?:\/\//i, '')
		.replace(/^www\./i, '')
		.split('/')[0];

	let cmsLogoDev = '';
	if (result.detected) {
		const cmsDomains = {
			Shopify: 'shopify.com',
			Magento: 'magento.com',
			WooCommerce: 'woocommerce.com',
			PrestaShop: 'prestashop.com',
			VTEX: 'vtex.com',
		};
		const cmsDom = cmsDomains[tech];
		if (cmsDom) {
			cmsLogoDev = `https://img.logo.dev/${cmsDom}?token=pk_MgKPAkEuRMOiYecOkx67wQ`;
		}
	}

	const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Widget - ${domain}</title>
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Comic+Neue:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body {
          margin: 0;
          padding: 6px;
          font-family: 'Comic Neue', 'Comic Sans MS', cursive, sans-serif;
          background: transparent;
          color: #2c1810;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          overflow: hidden;
          box-sizing: border-box;
        }
        .widget-card {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          padding: 0.75rem;
          border: 2px dashed #f39c12;
          border-radius: 12px;
          background: #fff176;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 2px 3px 0 rgba(0, 0, 0, 0.1);
          transform: rotate(-1deg);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .domain {
          font-size: 0.75rem;
          color: #5a4a3f;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .badge {
          font-size: 0.58rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.15rem 0.4rem;
          border-radius: 10px;
          background: #f8bbd0;
          color: #ff69b4;
          border: 1px solid #ff69b4;
        }
        .body {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          margin: 0.2rem 0;
        }
        .logo-container {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: white;
          border: 2px solid #b8d4e3;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 3px;
          box-sizing: border-box;
          flex-shrink: 0;
          transform: rotate(2deg);
        }
        .logo-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .tech-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .tech-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #2c1810;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .label {
          font-size: 0.6rem;
          color: #8b7d6b;
          text-transform: uppercase;
          font-weight: 700;
          font-style: italic;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.65rem;
          border-top: 2px dashed #9b59b6;
          padding-top: 0.35rem;
        }
        .powered {
          color: #9b59b6;
          text-decoration: none;
          font-weight: 700;
        }
        .powered:hover {
          color: #ff69b4;
        }
        .details-link {
          color: #3498db;
          text-decoration: none;
          font-weight: 700;
        }
        .details-link:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="widget-card">
        <div class="header">
          <span class="domain">${domain}</span>
          <span class="badge">E-Commerce</span>
        </div>
        <div class="body">
          <div class="logo-container">
            ${cmsLogoDev ? `<img src="${cmsLogoDev}" class="logo-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />` : ''}
            <svg style="display: ${cmsLogoDev ? 'none' : 'block'}; width: 16px; height: 16px; color: #9b59b6;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
          </div>
          <div class="tech-info">
            <span class="label">Plataforma</span>
            <span class="tech-name">${tech}</span>
          </div>
        </div>
        <div class="footer">
          <a href="${(process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')}" target="_blank" class="powered">Chismógrafo 📓</a>
          <a href="${(process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')}/?url=${encodeURIComponent(req.normalizedUrl)}" target="_blank" class="details-link">Ver Chisme &rarr;</a>
        </div>
      </div>
    </body>
    </html>
  `;
	res.send(html);
});

// 13. Embeddable Search Widget Page
app.get('/search-widget', (_req, res) => {
	res.sendFile(path.join(publicPath, 'search-widget.html'));
});

// Fallback index.html route for SPA dashboard
app.get('*', (_req, res) => {
	res.sendFile(path.join(publicPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
	console.log(`=================================================`);
	console.log(`🚀 E-Commerce Detector API Server is running`);
	console.log(`👉 Local: http://localhost:${PORT}`);
	console.log(`👉 API POST: http://localhost:${PORT}/api/detect`);
	console.log(`👉 API GET: http://localhost:${PORT}/api/detect?url=shopify.com`);
	console.log(`=================================================`);
});
