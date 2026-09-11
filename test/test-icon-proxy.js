import assert from 'node:assert';
import {
	enrichReportWithProxyLogos,
	fetchIconProxy,
	generateFallbackSvg,
	getLocalIcon,
	getProxyLogoUrl,
	getTechIcon,
} from '../src/iconProxyService.js';

console.log('=== Iniciando Pruebas Unitarias de Icon Proxy ===\n');

// 1. Prueba de archivo local existente
const localResult = getLocalIcon('infinite-microsoft-clarity.png');
assert.ok(localResult, 'Debe encontrar el archivo local infinite-microsoft-clarity.png');
assert.strictEqual(localResult.contentType, 'image/png');
assert.ok(Buffer.isBuffer(localResult.buffer));
assert.ok(localResult.buffer.length > 1000);
console.log(
	'✅ [1/9] getLocalIcon encuentra archivos locales existentes con Content-Type adecuado'
);

// 2. Prueba de resolución sin extensión explícita
const localNoExt = getLocalIcon('infinite-microsoft-clarity');
assert.ok(localNoExt, 'Debe autocompletar la extensión para infinite-microsoft-clarity');
assert.strictEqual(localNoExt.contentType, 'image/png');
console.log('✅ [2/9] getLocalIcon resuelve extensiones automáticamente (.png, .svg)');

// 3. Prueba de seguridad contra Path Traversal
const traversalAttempt1 = getLocalIcon('../../package.json');
const traversalAttempt2 = getLocalIcon('../../../etc/passwd');
const traversalAttempt3 = getLocalIcon('..\\..\\secret.txt');
assert.strictEqual(traversalAttempt1, null, 'No debe permitir navegación relativa');
assert.strictEqual(traversalAttempt2, null, 'No debe permitir acceso a rutas del sistema');
assert.strictEqual(traversalAttempt3, null, 'No debe permitir traversal con backslashes');
console.log('✅ [3/9] Protección estricta contra Path Traversal verificada');

// 4. Prueba de generación de SVG de respaldo
const fallbackSvg = generateFallbackSvg('Klaviyo');
assert.ok(Buffer.isBuffer(fallbackSvg));
const svgText = fallbackSvg.toString('utf-8');
assert.ok(svgText.includes('<svg'), 'Debe contener etiqueta svg');
assert.ok(svgText.includes('>K<'), 'Debe contener la letra inicial K');
console.log('✅ [4/9] generateFallbackSvg genera SVG válido con letra inicial');

// 5. Prueba de getTechIcon para tecnología con provider local
const techIconLocal = await getTechIcon('apps', 'infinite-microsoft-clarity');
assert.ok(techIconLocal, 'Debe resolver el ícono de infinite-microsoft-clarity');
assert.strictEqual(techIconLocal.contentType, 'image/png');
assert.strictEqual(techIconLocal.source, 'local');
console.log('✅ [5/9] getTechIcon resuelve correctamente tecnología con proveedor local');

// 6. Prueba de fetchIconProxy con provider no existente -> fallback limpio
const nonExistent = await fetchIconProxy({
	id: 'non-existent-tech-xyz-12345',
	provider: 'local',
	name: 'Mi App',
});
assert.ok(nonExistent);
assert.strictEqual(nonExistent.contentType, 'image/svg+xml');
assert.strictEqual(nonExistent.source, 'svg-fallback');
console.log('✅ [6/9] fetchIconProxy genera fallback SVG elegante cuando el archivo no existe');

// 7. Prueba de caché en memoria
const firstCall = await fetchIconProxy({ id: 'infinite-microsoft-clarity.png', provider: 'local' });
assert.ok(firstCall.buffer);
const secondCall = await fetchIconProxy({
	id: 'infinite-microsoft-clarity.png',
	provider: 'local',
});
assert.strictEqual(secondCall.cached, true, 'La segunda llamada debe ser recuperada de la caché');
console.log('✅ [7/9] Almacenamiento en caché en memoria funciona correctamente');

// 8. Prueba de getProxyLogoUrl
const proxyAppLogo = getProxyLogoUrl(
	{
		id: 'infinite-microsoft-clarity.png',
		logo: { id: 'infinite-microsoft-clarity.png', provider: 'local' },
	},
	'apps'
);
assert.strictEqual(
	proxyAppLogo,
	'/api/icon?provider=local&id=infinite-microsoft-clarity.png&collection=apps'
);
console.log('✅ [8/9] getProxyLogoUrl genera URLs proxy estructuradas');

// 9. Prueba de enrichReportWithProxyLogos
const mockReport = {
	technology: 'Shopify',
	plugins: [
		{ name: 'Klaviyo', web: 'https://klaviyo.com' },
		{ name: 'Infinite Clarity', logo: { id: 'infinite-microsoft-clarity.png', provider: 'local' } },
	],
	infrastructure: [{ name: 'Cloudflare', web: 'https://cloudflare.com' }],
	pixels: [{ name: 'Meta Pixel', web: 'https://facebook.com' }],
};
const enriched = enrichReportWithProxyLogos(mockReport);
assert.ok(enriched.cmsLogo.includes('/api/icon'));
assert.ok(enriched.plugins[0].logo.includes('/api/icon'));
assert.ok(enriched.plugins[1].logo.includes('/api/icon'));
assert.ok(enriched.infrastructure[0].logo.includes('/api/icon'));
assert.ok(enriched.pixels[0].logo.includes('/api/icon'));
console.log(
	'✅ [9/9] enrichReportWithProxyLogos asigna logos proxy a todas las tecnologías del reporte'
);

console.log('\n🎉 ¡Todas las pruebas unitarias de Icon Proxy pasaron exitosamente!');
