import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { saveShopifyAppLogoFromUrl } from './logoOptimizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, '..');
const techsAppsDir = path.join(workspaceDir, 'techs', 'apps');

/**
 * Normaliza un slug o URL de Shopify App Store
 * @param {string} input - Slug o URL completa (ej. "smile-io" o "https://apps.shopify.com/smile-io")
 * @returns {string} - Slug limpio
 */
export function extractShopifySlug(input) {
	if (!input) return '';
	let clean = input.trim();
	if (clean.includes('apps.shopify.com/')) {
		clean = clean.split('apps.shopify.com/')[1].split('?')[0].split('#')[0];
	}
	return clean.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
}

/**
 * Extrae la información completa de una aplicación desde la Shopify App Store
 * @param {string} slugOrUrl - Slug o URL de la aplicación
 * @returns {Promise<object>} - Metadatos extraídos de la app
 */
export async function scrapeShopifyApp(slugOrUrl) {
	const slug = extractShopifySlug(slugOrUrl);
	if (!slug) {
		throw new Error('Slug o URL de Shopify App Store no válido.');
	}

	const appUrl = `https://apps.shopify.com/${slug}`;
	let html = '';

	try {
		const res = await axios.get(appUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
			},
			timeout: 12000,
		});
		html = res.data;
	} catch (err) {
		throw new Error(`Error al conectar con Shopify App Store para "${slug}": ${err.message}`);
	}

	const $ = cheerio.load(html);

	// 1. JSON-LD estructurado
	let jsonLd = null;
	$('script[type="application/ld+json"]').each((_, el) => {
		try {
			const data = JSON.parse($(el).html() || '{}');
			if (data['@type'] === 'SoftwareApplication' || data['@type'] === 'Product' || data.name) {
				jsonLd = data;
			}
		} catch (_e) {}
	});

	// 2. Título / Nombre
	let nombre =
		$('h1').first().text().trim() ||
		$('meta[property="og:title"]').attr('content') ||
		jsonLd?.name ||
		slug;

	nombre = nombre
		.replace(/\s*[-–|:]\s*Shopify App Store.*$/i, '')
		.replace(/\s*\|\s*Shopify.*$/i, '')
		.trim();

	// 3. Desarrollador
	let desarrollador =
		$('a[href*="/partners/"]').first().text().trim() ||
		$('meta[name="author"]').attr('content') ||
		jsonLd?.author?.name ||
		jsonLd?.publisher?.name ||
		'';

	if (!desarrollador) {
		const devText = $('p:contains("Por "), p:contains("By ")').first().text().trim();
		if (devText) {
			desarrollador = devText.replace(/^(Por|By)\s+/i, '').trim();
		}
	}

	// 4. Logo
	let logoUrl =
		$('meta[property="og:image"]').attr('content') ||
		$('img[src*="shopifyapps"]').first().attr('src') ||
		jsonLd?.image ||
		'';

	if (logoUrl?.startsWith('//')) {
		logoUrl = `https:${logoUrl}`;
	}

	// 5. Calificación (Rating)
	let calificacion = null;
	if (jsonLd?.aggregateRating) {
		const val = parseFloat(jsonLd.aggregateRating.ratingValue);
		const count = parseInt(
			jsonLd.aggregateRating.ratingCount || jsonLd.aggregateRating.reviewCount,
			10
		);
		if (!Number.isNaN(val)) {
			calificacion = {
				puntaje: val,
				resenas: Number.isNaN(count) ? 0 : count,
			};
		}
	}

	if (!calificacion) {
		const ratingText =
			$(
				'span[aria-label*="star" i], span[aria-label*="estrellas" i], [aria-label*="calificación" i]'
			)
				.first()
				.attr('aria-label') ||
			$('span[aria-label*="star" i], span[aria-label*="estrellas" i]').first().text();

		const scoreMatch = ratingText?.match(/([0-9]+(?:\.[0-9]+)?)/);
		if (scoreMatch) {
			const countMatch = ratingText?.match(/\(([\d,.]+)\)/);
			calificacion = {
				puntaje: parseFloat(scoreMatch[1]),
				resenas: countMatch ? parseInt(countMatch[1].replace(/,/g, ''), 10) : 0,
			};
		}
	}

	// 6. Sitio web del desarrollador / oficial
	let web = '';
	$('a[href^="http"]').each((_, el) => {
		if (web) return;
		const href = $(el).attr('href') || '';
		const text = $(el).text().trim().toLowerCase();
		const isExcluded =
			href.includes('shopify.com') ||
			href.includes('shopify.dev') ||
			href.includes('google.com') ||
			href.includes('facebook.com') ||
			href.includes('twitter.com') ||
			href.includes('apple.com') ||
			href.includes('shopifystatus.com');

		if (!isExcluded) {
			if (
				text.includes('sitio web') ||
				text.includes('website') ||
				text.includes('desarrollador') ||
				text.includes('developer') ||
				href.includes('ref=apps.shopify.com') ||
				href.includes('ref=appstore')
			) {
				web = href;
			}
		}
	});

	if (web) {
		try {
			const u = new URL(web);
			u.search = '';
			web = u.toString().replace(/\/$/, '');
		} catch (_e) {}
	} else {
		web = jsonLd?.author?.url || jsonLd?.url || `https://apps.shopify.com/${slug}`;
	}

	// 7. Planes de Precios y Features
	const precios = [];

	let planCards = $(
		'.app-details-pricing-plan-card, [data-test-id="pricing-cards-track"] > div, #adp-pricing .tw-shadow-pricingCard, #pricing .tw-shadow-pricingCard'
	);

	if (planCards.length === 0) {
		planCards = $(
			'#adp-pricing, #pricing, section:has(h2:contains("Pricing")), section:has(h2:contains("Precios"))'
		).find('.tw-rounded-sm, .tw-rounded-lg, [class*="pricing-card"], [class*="plan-card"]');
	}

	planCards.each((_, card) => {
		const cardText = $(card).text().trim().replace(/\s+/g, ' ');

		// 1. Nombre del plan
		let planName =
			$(card).find('[data-test-id="name"]').first().text().trim() ||
			$(card).find('p.tw-text-label-md, .tw-text-label-lg').first().text().trim();

		// 2. Texto de precio
		const priceHeader = $(card)
			.find(
				'.tw-text-heading-xl, .tw-text-heading-lg, .tw-text-title-xl, .tw-text-title-lg, [data-test-id="price"], h3, h4'
			)
			.first()
			.text()
			.trim()
			.replace(/\s+/g, ' ');

		if (!planName) {
			const potentialTitles = $(card)
				.find('h3, h4, p, span')
				.map((_, el) => $(el).text().trim())
				.get()
				.filter(
					(t) =>
						t &&
						t.length < 40 &&
						!t.includes('$') &&
						!t.toLowerCase().includes('funciones') &&
						!t.toLowerCase().includes('features')
				);
			planName = potentialTitles[0] || 'Plan';
		}

		let monto = 0;
		const moneda = 'USD';
		let frecuencia = 'mes';

		const combinedPriceStr = `${priceHeader} ${cardText}`;
		const priceMatch = combinedPriceStr.match(/\$([0-9]+(?:\.[0-9]+)?)/);
		if (priceMatch) {
			monto = parseFloat(priceMatch[1]);
		} else if (
			planName.toLowerCase().includes('gratis') ||
			planName.toLowerCase().includes('free') ||
			combinedPriceStr.toLowerCase().includes('gratis') ||
			combinedPriceStr.toLowerCase().includes('free')
		) {
			monto = 0;
		}

		if (combinedPriceStr.match(/año|year|anual/i)) {
			frecuencia = 'año';
		} else if (combinedPriceStr.match(/mes|month|mensual/i) || monto > 0) {
			frecuencia = 'mes';
		} else if (combinedPriceStr.match(/orden|pedido|order/i)) {
			frecuencia = 'por orden';
		}

		// 3. Features
		const features = [];
		$(card)
			.find('ul li, li')
			.each((_, li) => {
				const f = $(li).text().trim().replace(/\s+/g, ' ');
				if (
					f &&
					!features.includes(f) &&
					f.length < 250 &&
					!f.toLowerCase().includes('elegir plan') &&
					!f.toLowerCase().includes('seleccionar') &&
					!f.toLowerCase().includes('comenzar prueba')
				) {
					features.push(f);
				}
			});

		precios.push({
			plan: planName,
			precio: {
				monto,
				moneda,
			},
			frecuencia,
			features,
		});
	});

	// Deduplicar planes
	const uniquePrecios = [];
	const seenPlans = new Set();
	for (const p of precios) {
		const key = `${p.plan.toLowerCase()}_${p.precio.monto}_${p.frecuencia}`;
		if (!seenPlans.has(key)) {
			seenPlans.add(key);
			uniquePrecios.push(p);
		}
	}

	return {
		slug,
		nombre,
		desarrollador,
		web,
		logoUrl,
		calificacion,
		precios: uniquePrecios,
	};
}

/**
 * Construye el objeto JSON v2 estándar a partir de los datos scrapeados
 * @param {object} scraped - Datos scrapeados de Shopify
 * @param {object} [options] - Opciones adicionales (categoria, logoId, logoProveedor, etc.)
 * @returns {object} - Objeto listo para formato app-v2.schema.json
 */
export function buildAppV2Json(scraped, options = {}) {
	const today = new Date().toISOString().split('T')[0];
	const slug = scraped.slug;
	const nombre = scraped.nombre || slug;
	const categoria = options.categoria || 'Otros';
	const logoId = options.logoId || `${slug}.webp`;
	const logoProveedor = options.logoProveedor || 'local';

	const patternParts = new Set([slug]);
	if (slug.includes('-')) {
		patternParts.add(slug.replace(/-/g, '[_-]?'));
	}
	const patron = Array.from(patternParts).join('|');

	return {
		$schema: '../../schemas/app-v2.schema.json',
		id: slug,
		chismografo: {
			tipo: 1,
			version: 1,
			ultimaActualizacion: today,
			revision: 0,
			entorno: 0,
		},
		acercaDe: {
			detallesGenerales: {
				nombre,
				desarrollador: scraped.desarrollador || nombre,
				web: scraped.web || `https://apps.shopify.com/${slug}`,
				categoria,
				logo: {
					id: logoId,
					proveedor: logoProveedor,
				},
			},
			cmsCompatibles: [
				{
					id: 'shopify',
					slug: slug,
					enlace: slug,
				},
			],
			calificacion: scraped.calificacion || {
				puntaje: 5.0,
				resenas: 0,
			},
			precios: scraped.precios || [],
		},
		herramienta: {
			reglasDeteccion: [
				{
					tipo: 'script-src',
					patron,
					descripcion: `Script o recurso de integración de ${nombre} detectado`,
				},
			],
		},
	};
}

/**
 * Guarda una app scrapeada en disco, descargando y convirtiendo su logo a WebP
 * @param {object} scraped - Datos scrapeados de Shopify
 * @param {object} [options] - Opciones de guardado
 * @returns {Promise<{ filePath: string, logoPath?: string }>}
 */
export async function saveScrapedApp(scraped, options = {}) {
	const slug = scraped.slug;
	let logoFileName = `${slug}.webp`;
	let savedLogoPath = null;

	if (scraped.logoUrl) {
		try {
			const logoResult = await saveShopifyAppLogoFromUrl(slug, scraped.logoUrl);
			logoFileName = logoResult.fileName;
			savedLogoPath = logoResult.filePath;
		} catch (err) {
			console.warn(`[ShopifyScraper] No se pudo descargar el logo para "${slug}": ${err.message}`);
		}
	}

	const appV2 = buildAppV2Json(scraped, {
		categoria: options.categoria,
		logoId: logoFileName,
		logoProveedor: 'local',
	});

	fs.mkdirSync(techsAppsDir, { recursive: true });
	const targetPath = path.join(techsAppsDir, `${slug}.json`);
	fs.writeFileSync(targetPath, `${JSON.stringify(appV2, null, 2)}\n`, 'utf-8');

	return {
		filePath: targetPath,
		logoPath: savedLogoPath,
		appJson: appV2,
	};
}
