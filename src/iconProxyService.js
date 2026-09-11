import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getTechById } from './techCatalogService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, '..');
const publicDir = path.join(workspaceDir, 'public');
const appsLogoDir = path.join(publicDir, 'brand', 'logo', 'apps');
const mainLogoDir = path.join(publicDir, 'brand', 'logo');

// MIME types mapping
const MIME_TYPES = {
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
};

// In-memory cache for proxied icons (TTL: 24 hours, max 1000 items)
const iconCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ITEMS = 1000;

function setInCache(key, data) {
	if (iconCache.size >= MAX_CACHE_ITEMS) {
		const firstKey = iconCache.keys().next().value;
		if (firstKey) iconCache.delete(firstKey);
	}
	iconCache.set(key, { ...data, timestamp: Date.now() });
}

function getFromCache(key) {
	const entry = iconCache.get(key);
	if (!entry) return null;
	if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
		iconCache.delete(key);
		return null;
	}
	return entry;
}

/**
 * Genera un SVG estilizado de respaldo con la inicial
 * @param {string} text
 * @returns {Buffer}
 */
export function generateFallbackSvg(text = 'A') {
	const initial = (text || 'A').trim().charAt(0).toUpperCase() || 'A';
	// Generar un color agradable basado en el texto
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		hash = text.charCodeAt(i) + ((hash << 5) - hash);
	}
	const hue = Math.abs(hash % 360);
	const bgColor = `hsl(${hue}, 65%, 45%)`;

	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${bgColor}"/>
  <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initial}</text>
</svg>`;
	return Buffer.from(svg, 'utf-8');
}

/**
 * Busca un archivo estático local en el directorio de logos de apps o general
 * @param {string} rawId
 * @returns {{ buffer: Buffer, contentType: string, filePath: string } | null}
 */
export function getLocalIcon(rawId) {
	if (!rawId) return null;

	// Sanitizar nombre para evitar path traversal
	const cleanName = path.basename(rawId).replace(/[^a-zA-Z0-9._-]/g, '');
	if (!cleanName) return null;

	const extensions = ['', '.png', '.svg', '.jpg', '.jpeg', '.webp', '.gif', '.ico'];
	const searchDirs = [appsLogoDir, mainLogoDir];

	for (const dir of searchDirs) {
		for (const ext of extensions) {
			const candidateName =
				cleanName.includes('.') && ext === ''
					? cleanName
					: `${cleanName.replace(/\.[^.]+$/, '')}${ext}`;
			const candidatePath = path.join(dir, candidateName);

			// Verificar que esté dentro de publicDir
			if (candidatePath.startsWith(publicDir) && fs.existsSync(candidatePath)) {
				try {
					const stats = fs.statSync(candidatePath);
					if (stats.isFile()) {
						const buffer = fs.readFileSync(candidatePath);
						const fileExt = path.extname(candidatePath).toLowerCase();
						const contentType = MIME_TYPES[fileExt] || 'image/png';
						return { buffer, contentType, filePath: candidatePath };
					}
				} catch (_e) {}
			}
		}
	}

	return null;
}

/**
 * Resuelve y extrae el logo de una Shopify App desde su slug
 * @param {string} slug
 * @returns {Promise<string|null>}
 */
export async function fetchShopifyAppLogoUrl(slug) {
	const cleanSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '').trim();
	if (!cleanSlug) return null;

	const targetUrl = `https://apps.shopify.com/${cleanSlug}`;
	try {
		const res = await axios.get(targetUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			},
			timeout: 5000,
		});
		const $ = cheerio.load(res.data);
		const ogImage = $('meta[property="og:image"]').attr('content');
		if (ogImage) return ogImage;
	} catch (e) {
		console.log(`[IconProxy] Shopify scrape error para "${cleanSlug}": ${e.message}`);
	}
	return null;
}

/**
 * Obtiene o descarga un ícono a través del proxy según el proveedor
 * @param {object} params
 * @param {string} params.id - Identificador (slug, nombre de archivo o dominio)
 * @param {string} [params.provider=''] - Proveedor ('local', 'logodev', 'brandicons', 'brandfetch', 'ninjapear', 'shopify')
 * @param {number|string} [params.size=64] - Tamaño deseado
 * @param {string} [params.name=''] - Nombre de la tecnología (para fallback de inicial)
 * @returns {Promise<{ buffer: Buffer, contentType: string, source: string, cached?: boolean }>}
 */
export async function fetchIconProxy({ id, provider = '', size = 64, name = '' }) {
	let rawId = (id || '').toString().trim();
	let cleanProvider = (provider || '').toString().toLowerCase().trim();

	// Quitar protocolo si es una URL
	if (rawId.startsWith('http://') || rawId.startsWith('https://')) {
		try {
			rawId = new URL(rawId).hostname.replace(/^www\./i, '');
		} catch (_e) {}
	}

	// Si no se especificó proveedor, deducir por la extensión o si existe localmente
	if (!cleanProvider) {
		const localMatch = getLocalIcon(rawId);
		if (localMatch) {
			cleanProvider = 'local';
		} else if (rawId.includes('.')) {
			cleanProvider = 'logodev';
		} else {
			cleanProvider = 'local';
		}
	}

	const cacheKey = `${cleanProvider}:${rawId}:${size}`;
	const cached = getFromCache(cacheKey);
	if (cached) {
		return { ...cached, cached: true };
	}

	// 1. Proveedor LOCAL
	if (cleanProvider === 'local') {
		const local = getLocalIcon(rawId);
		if (local) {
			const result = { buffer: local.buffer, contentType: local.contentType, source: 'local' };
			setInCache(cacheKey, result);
			return result;
		}
	}

	// 2. Proveedor LOGODEV
	if (cleanProvider === 'logodev') {
		const domain = rawId
			.replace(/^https?:\/\//i, '')
			.replace(/^www\./i, '')
			.split('/')[0];
		const token = process.env.LOGODEV_PUBLISHABLE_KEY || 'pk_MgKPAkEuRMOiYecOkx67wQ';
		const targetUrl = `https://img.logo.dev/${domain}?token=${token}&size=${size || 64}`;

		try {
			const res = await axios.get(targetUrl, {
				responseType: 'arraybuffer',
				timeout: 7000,
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; ChismografoIconProxy/1.0)',
				},
			});

			if (res.data && res.data.length > 50) {
				const contentType = res.headers['content-type'] || 'image/png';
				const result = { buffer: res.data, contentType, source: 'logodev' };
				setInCache(cacheKey, result);
				return result;
			}
		} catch (err) {
			console.warn(`[IconProxy] Logodev falló para "${domain}": ${err.message}`);
		}
	}

	// 3. Proveedor BRANDICONS
	if (cleanProvider === 'brandicons') {
		const domain = rawId
			.replace(/^https?:\/\//i, '')
			.replace(/^www\./i, '')
			.split('/')[0];
		const keyParam = process.env.BRANDICONS_API_KEY ? `?key=${process.env.BRANDICONS_API_KEY}` : '';
		const targetUrl = `https://cdn.brandicons.dev/icons/${domain}${keyParam}`;

		try {
			const res = await axios.get(targetUrl, {
				responseType: 'arraybuffer',
				timeout: 7000,
			});

			if (res.data && res.data.length > 50) {
				const contentType = res.headers['content-type'] || 'image/svg+xml';
				const result = { buffer: res.data, contentType, source: 'brandicons' };
				setInCache(cacheKey, result);
				return result;
			}
		} catch (err) {
			console.warn(`[IconProxy] Brandicons falló para "${domain}": ${err.message}`);
		}
	}

	// 4. Proveedor BRANDFETCH
	if (cleanProvider === 'brandfetch') {
		const domain = rawId
			.replace(/^https?:\/\//i, '')
			.replace(/^www\./i, '')
			.split('/')[0];
		const keyParam = process.env.BRANDFETCH_API_KEY ? `?c=${process.env.BRANDFETCH_API_KEY}` : '';
		const targetUrl = `https://asset.brandfetch.io/${domain}${keyParam}`;

		try {
			const res = await axios.get(targetUrl, {
				responseType: 'arraybuffer',
				timeout: 7000,
			});

			if (res.data && res.data.length > 50) {
				const contentType = res.headers['content-type'] || 'image/png';
				const result = { buffer: res.data, contentType, source: 'brandfetch' };
				setInCache(cacheKey, result);
				return result;
			}
		} catch (err) {
			console.warn(`[IconProxy] Brandfetch falló para "${domain}": ${err.message}`);
		}
	}

	// 5. Proveedor NINJAPEAR
	if (cleanProvider === 'ninjapear') {
		const domain = rawId
			.replace(/^https?:\/\//i, '')
			.replace(/^www\./i, '')
			.split('/')[0];
		const keyParam = process.env.NINJAPEAR_API_KEY ? `?key=${process.env.NINJAPEAR_API_KEY}` : '';
		const targetUrl = `https://logo.ninjapear.com/${domain}${keyParam}`;

		try {
			const res = await axios.get(targetUrl, {
				responseType: 'arraybuffer',
				timeout: 7000,
			});

			if (res.data && res.data.length > 50) {
				const contentType = res.headers['content-type'] || 'image/png';
				const result = { buffer: res.data, contentType, source: 'ninjapear' };
				setInCache(cacheKey, result);
				return result;
			}
		} catch (err) {
			console.warn(`[IconProxy] NinjaPear falló para "${domain}": ${err.message}`);
		}
	}

	// 6. Proveedor SHOPIFY
	if (cleanProvider === 'shopify') {
		const logoUrl = await fetchShopifyAppLogoUrl(rawId);
		if (logoUrl) {
			try {
				const res = await axios.get(logoUrl, {
					responseType: 'arraybuffer',
					timeout: 7000,
				});
				if (res.data && res.data.length > 50) {
					const contentType = res.headers['content-type'] || 'image/png';
					const result = { buffer: res.data, contentType, source: 'shopify' };
					setInCache(cacheKey, result);
					return result;
				}
			} catch (err) {
				console.warn(`[IconProxy] Descarga Shopify logo falló para "${rawId}": ${err.message}`);
			}
		}
	}

	// Si no fue local pero falló el proveedor remoto, intentar si existe archivo local como respaldo
	const localFallback = getLocalIcon(rawId);
	if (localFallback) {
		const result = {
			buffer: localFallback.buffer,
			contentType: localFallback.contentType,
			source: 'local-fallback',
		};
		setInCache(cacheKey, result);
		return result;
	}

	// Respaldo final: SVG estilizado con inicial
	const fallbackBuffer = generateFallbackSvg(name || rawId);
	const fallbackResult = {
		buffer: fallbackBuffer,
		contentType: 'image/svg+xml',
		source: 'svg-fallback',
	};
	return fallbackResult;
}

/**
 * Resuelve el ícono de una tecnología en catálogo
 * @param {string} collection - 'apps', 'infra', 'pixels', 'gateways', 'cms'
 * @param {string} id - ID de la tecnología
 * @param {number|string} [size=64]
 * @returns {Promise<{ buffer: Buffer, contentType: string, source: string }>}
 */
export async function getTechIcon(collection, id, size = 64) {
	const tech = getTechById(collection, id);
	if (!tech) {
		// Fallback directo por ID
		return fetchIconProxy({ id, size, name: id });
	}

	let iconId = '';
	let provider = '';

	if (tech.logo && typeof tech.logo === 'object') {
		iconId = tech.logo.id || '';
		provider = tech.logo.provider || '';
	} else if (typeof tech.logo === 'string') {
		iconId = tech.logo;
	}

	if (!iconId) {
		if (tech.web) {
			try {
				iconId = new URL(tech.web).hostname.replace(/^www\./i, '');
			} catch (_e) {
				iconId = tech.id || id;
			}
		} else {
			iconId = tech.id || id;
		}
	}

	return fetchIconProxy({
		id: iconId,
		provider: provider || 'local',
		size,
		name: tech.name || tech.id || id,
	});
}

/**
 * Genera la URL del proxy para una tecnología o configuración de logo
 * @param {object|string} techOrLogo
 * @param {string} [collection='']
 * @returns {string} URL proxy '/api/icon?...'
 */
export function getProxyLogoUrl(techOrLogo, collection = '') {
	if (!techOrLogo) return '';

	if (typeof techOrLogo === 'string') {
		if (techOrLogo.startsWith('/api/icon') || techOrLogo.startsWith('http')) {
			if (techOrLogo.includes('/api/icon')) return techOrLogo;
		}
		const isFile = /\.(svg|png|jpg|jpeg|webp|gif|ico)$/i.test(techOrLogo);
		if (isFile) {
			return `/api/icon?provider=local&id=${encodeURIComponent(techOrLogo)}`;
		}
		if (techOrLogo.includes('.')) {
			return `/api/icon?provider=logodev&id=${encodeURIComponent(techOrLogo)}`;
		}
		return `/api/icon?id=${encodeURIComponent(techOrLogo)}`;
	}

	let id = '';
	let provider = '';

	if (techOrLogo.logo) {
		if (typeof techOrLogo.logo === 'object') {
			id = techOrLogo.logo.id || '';
			provider = techOrLogo.logo.provider || '';
		} else if (typeof techOrLogo.logo === 'string') {
			id = techOrLogo.logo;
		}
	}

	if (!id && techOrLogo.id) {
		id = techOrLogo.id;
	}

	if (!id && techOrLogo.web) {
		try {
			id = new URL(techOrLogo.web).hostname.replace(/^www\./i, '');
			if (!provider) provider = 'logodev';
		} catch (_e) {}
	}

	if (!id && techOrLogo.name) {
		id = techOrLogo.name;
	}

	if (!id) return '';

	if (!provider) {
		if (id.includes('.') && /\.(svg|png|jpg|jpeg|webp|gif|ico)$/i.test(id)) {
			provider = 'local';
		} else if (id.includes('.')) {
			provider = 'logodev';
		} else {
			provider = 'local';
		}
	}

	const collParam = collection ? `&collection=${encodeURIComponent(collection)}` : '';
	return `/api/icon?provider=${encodeURIComponent(provider)}&id=${encodeURIComponent(id)}${collParam}`;
}

/**
 * Enriquece un objeto de reporte para que todas las tecnologías lleven su logo como proxy
 * @param {object} reportData
 * @returns {object}
 */
export function enrichReportWithProxyLogos(reportData) {
	if (!reportData || typeof reportData !== 'object') return reportData;

	const cmsDomains = {
		Shopify: 'shopify.com',
		Magento: 'magento.com',
		WooCommerce: 'woocommerce.com',
		PrestaShop: 'prestashop.com',
		VTEX: 'vtex.com',
		Odoo: 'odoo.com',
	};

	if (reportData.technology && !reportData.cmsLogo) {
		const cmsDom =
			cmsDomains[reportData.technology] || `${reportData.technology.toLowerCase()}.com`;
		reportData.cmsLogo = `/api/icon?provider=logodev&id=${encodeURIComponent(cmsDom)}&size=64`;
	}

	if (Array.isArray(reportData.plugins)) {
		reportData.plugins = reportData.plugins.map((p) => {
			if (typeof p === 'object' && p !== null) {
				const proxyLogo = getProxyLogoUrl(p, 'apps');
				return { ...p, logo: proxyLogo };
			}
			return p;
		});
	}

	if (Array.isArray(reportData.apps)) {
		reportData.apps = reportData.apps.map((a) => {
			if (typeof a === 'object' && a !== null) {
				const proxyLogo = getProxyLogoUrl(a, 'apps');
				return { ...a, logo: proxyLogo };
			}
			return a;
		});
	}

	if (Array.isArray(reportData.infrastructure)) {
		reportData.infrastructure = reportData.infrastructure.map((i) => {
			if (typeof i === 'object' && i !== null) {
				const proxyLogo = getProxyLogoUrl(i, 'infra');
				return { ...i, logo: proxyLogo };
			}
			return i;
		});
	}

	if (Array.isArray(reportData.pixels)) {
		reportData.pixels = reportData.pixels.map((px) => {
			if (typeof px === 'object' && px !== null) {
				const proxyLogo = getProxyLogoUrl(px, 'pixels');
				return { ...px, logo: proxyLogo };
			}
			return px;
		});
	}

	return reportData;
}
