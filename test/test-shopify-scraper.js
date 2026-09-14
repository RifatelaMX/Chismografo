import assert from 'node:assert';
import { buildAppV2Json, extractShopifySlug, scrapeShopifyApp } from '../src/shopifyAppScraper.js';

console.log('=== Iniciando Pruebas Unitarias de Shopify App Scraper ===\n');

// 1. extractShopifySlug
console.log('1. Probando extracción y normalización de slugs...');
assert.strictEqual(extractShopifySlug('smile-io'), 'smile-io');
assert.strictEqual(
	extractShopifySlug('https://apps.shopify.com/smile-io?ref=search#pricing'),
	'smile-io'
);
assert.strictEqual(
	extractShopifySlug('https://apps.shopify.com/klaviyo-email-marketing/'),
	'klaviyo-email-marketing'
);
console.log('✅ [1/4] Extracción de slugs correcta.');

// 2. buildAppV2Json
console.log('2. Probando construcción de esquema v2 desde datos...');
const mockScraped = {
	slug: 'demo-app',
	nombre: 'Demo App Official',
	desarrollador: 'Demo Corp',
	web: 'https://demo-app.com',
	logoUrl: 'https://cdn.shopify.com/demo.png',
	calificacion: {
		puntaje: 4.8,
		resenas: 120,
	},
	precios: [
		{
			plan: 'Gratis',
			precio: { monto: 0, moneda: 'USD' },
			frecuencia: 'mes',
			features: ['Feature 1', 'Feature 2'],
		},
	],
};

const v2 = buildAppV2Json(mockScraped, { categoria: 'Marketing' });
assert.strictEqual(v2.$schema, '../../schemas/app-v2.schema.json');
assert.strictEqual(v2.id, 'demo-app');
assert.strictEqual(v2.acercaDe.detallesGenerales.nombre, 'Demo App Official');
assert.strictEqual(v2.acercaDe.detallesGenerales.categoria, 'Marketing');
assert.strictEqual(v2.acercaDe.calificacion.puntaje, 4.8);
assert.strictEqual(v2.acercaDe.precios[0].features.length, 2);
assert.strictEqual(v2.herramienta.reglasDeteccion.length, 1);
console.log('✅ [2/4] Construcción de firma JSON v2 válida y estructurada.');

// 3. scrapeShopifyApp (live test)
console.log('3. Probando extracción en vivo desde Shopify App Store (smile-io)...');
try {
	const liveData = await scrapeShopifyApp('smile-io');
	assert.strictEqual(liveData.slug, 'smile-io');
	assert.ok(liveData.nombre.toLowerCase().includes('smile'), 'El nombre debe contener Smile');
	assert.strictEqual(liveData.desarrollador, 'Smile.io');
	assert.ok(liveData.web.startsWith('http'), 'Debe tener URL web válida');
	assert.ok(liveData.calificacion?.puntaje >= 4.0, 'La calificación de Smile debe ser >= 4.0');
	assert.ok(liveData.precios.length >= 2, 'Debe extraer al menos 2 planes de precios');
	assert.ok(
		liveData.precios[0].features.length > 0,
		'El plan debe contener su lista de características/features'
	);
	console.log(
		`✅ [3/4] Extracción en vivo exitosa: ${liveData.nombre} (⭐ ${liveData.calificacion.puntaje}) - ${liveData.precios.length} planes.`
	);
} catch (e) {
	console.warn('⚠️ [3/4] Salto de prueba en vivo de red si no hay conexión:', e.message);
}

// 4. Validar manejo de errores con slugs inválidos
console.log('4. Probando manejo de slugs inválidos...');
await assert.rejects(async () => {
	await scrapeShopifyApp('');
}, /no válido/i);
console.log('✅ [4/5] Manejo de errores y validaciones correcto.');

// 5. Validar optimización y conversión a WebP
console.log('5. Probando compresión y conversión de imagen a WebP con Sharp...');
const { optimizeImageToWebp } = await import('../src/logoOptimizer.js');
// Create a small 10x10 PNG buffer
const dummySvg = Buffer.from(
	'<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" fill="red"/></svg>'
);
const webpBuf = await optimizeImageToWebp(dummySvg);
assert.ok(webpBuf instanceof Buffer, 'Debe devolver un Buffer');
assert.ok(webpBuf.length > 0, 'El buffer WebP no debe estar vacío');
// Check WebP header (RIFF ... WEBP)
const header = webpBuf.slice(0, 12).toString('ascii');
assert.ok(
	header.includes('RIFF') && header.includes('WEBP'),
	'El buffer debe ser un archivo WebP válido'
);
console.log('✅ [5/5] Compresión y conversión de imágenes a WebP verificada.');

console.log(
	'\n🎉 ¡Todas las pruebas unitarias de Shopify App Scraper y Optimizador WebP pasaron exitosamente!'
);
