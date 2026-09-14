import assert from 'node:assert';
import {
	createTech,
	deleteTech,
	getTechById,
	listTechs,
	updateTech,
} from '../src/techCatalogService.js';

console.log('=== Iniciando Pruebas de Catálogo CRUD, Esquema v2 y Retrocompatibilidad v1 ===\n');

// 1. Prueba de listado y paginación por defecto (limit = 5)
const appsPage1 = listTechs('apps', { page: 1, limit: 5 });
assert.strictEqual(appsPage1.success, true);
assert.strictEqual(appsPage1.limit, 5);
assert.strictEqual(appsPage1.page, 1);
assert.strictEqual(appsPage1.data.length, 5);
assert.ok(appsPage1.total > 100, 'Total de apps debe ser mayor a 100');
assert.ok(appsPage1.totalPages >= 20, 'TotalPages debe ser al menos 20');
console.log(`✅ [1/9] Paginación de Apps correcta (5 por página, total: ${appsPage1.total})`);

// 2. Prueba de filtrado por categoría
const analyticsApps = listTechs('apps', { category: 'Analítica', limit: 10 });
assert.strictEqual(analyticsApps.success, true);
assert.ok(analyticsApps.total > 0, 'Debe haber apps de analítica');
analyticsApps.data.forEach((app) => {
	assert.ok(
		app.category.toLowerCase().includes('analítica'),
		`Categoría "${app.category}" debe coincidir con el filtro`
	);
});
console.log(
	`✅ [2/9] Filtrado por categoría "Analítica" correcto (${analyticsApps.total} encontradas)`
);

// 3. Prueba de obtención por ID único y presencia de esquema v2 con compatibilidad legacy
const clarityApp = getTechById('apps', 'microsoft-clarity');
assert.ok(clarityApp, 'Microsoft Clarity debe existir');
assert.strictEqual(clarityApp.id, 'microsoft-clarity');
assert.ok(clarityApp.$schema, 'Debe incluir $schema');
assert.ok(clarityApp.chismografo, 'Debe incluir objeto chismografo');
assert.strictEqual(clarityApp.chismografo.tipo, 1);
assert.ok(
	clarityApp.acercaDe?.detallesGenerales?.nombre,
	'Debe incluir acercaDe.detallesGenerales'
);
assert.strictEqual(clarityApp.nombre, 'Microsoft Clarity: AI Insights');
assert.ok(Array.isArray(clarityApp.precios), 'Debe tener campo precios como array');
assert.ok(Array.isArray(clarityApp.reglasDeteccion), 'Debe tener reglas de detección');
console.log('✅ [3/9] Obtención por ID "microsoft-clarity" y validación de esquema v2 correcta');

// 4. Prueba de Creación CRUD con payload v2 nativo
const testAppId = 'test-suite-demo-app-v2';
try {
	deleteTech('apps', testAppId);
} catch (_e) {}

const newAppDataV2 = {
	$schema: '../../schemas/app-v2.schema.json',
	id: testAppId,
	chismografo: {
		tipo: 1,
		version: 1.0,
		ultimaActualizacion: '2026-09-11',
		revision: 0,
		entorno: 0,
	},
	acercaDe: {
		detallesGenerales: {
			nombre: 'Test Suite Demo App v2',
			desarrollador: 'QA Dev v2',
			web: 'https://demoapp.example.com',
			categoria: 'Analítica',
			logo: {
				id: 'demoapp.png',
				proveedor: 'local',
			},
		},
		cmsCompatibles: [
			{
				id: 'shopify',
				slug: 'demoapp-shopify',
			},
		],
		precios: [
			{
				plan: 'Free',
				precio: { monto: 0, moneda: 'USD' },
				frecuencia: 1,
			},
		],
	},
	herramienta: {
		reglasDeteccion: [
			{
				tipo: 'script-src',
				patron: 'demoapp\\.js',
				descripcion: 'Regla de prueba v2',
			},
		],
	},
};

const createdAppV2 = createTech('apps', newAppDataV2);
assert.strictEqual(createdAppV2.id, testAppId);
assert.strictEqual(createdAppV2.nombre, 'Test Suite Demo App v2');
assert.strictEqual(createdAppV2.chismografo.tipo, 1);
assert.strictEqual(createdAppV2.acercaDe.detallesGenerales.desarrollador, 'QA Dev v2');
assert.strictEqual(createdAppV2.precios.length, 1);
console.log('✅ [4/9] Creación de tecnología con esquema v2 nativo exitosa');

// 5. Prueba de Actualización CRUD
const updatedAppV2 = updateTech('apps', testAppId, {
	acercaDe: {
		detallesGenerales: {
			desarrollador: 'QA Lead Dev',
		},
	},
});
assert.strictEqual(updatedAppV2.desarrollador, 'QA Lead Dev');
assert.strictEqual(updatedAppV2.acercaDe.detallesGenerales.desarrollador, 'QA Lead Dev');
deleteTech('apps', testAppId);
console.log('✅ [5/9] Actualización y eliminación con esquema v2 exitosa');

// 6. Prueba de Retrocompatibilidad: Creación con payload plano v1 (legacy)
const legacyAppId = 'test-suite-legacy-app';
try {
	deleteTech('apps', legacyAppId);
} catch (_e) {}

const legacyPayload = {
	id: legacyAppId,
	name: 'Legacy Test App',
	developer: 'Legacy Dev',
	category: 'Marketing',
	precios: [{ plan: 'Legacy Plan', precio: 10, moneda: 'USD' }],
	detectionRules: [{ type: 'script-src', pattern: 'legacy-app\\.js' }],
};

const createdLegacy = createTech('apps', legacyPayload);
assert.strictEqual(createdLegacy.id, legacyAppId);
assert.strictEqual(createdLegacy.nombre, 'Legacy Test App');
assert.strictEqual(createdLegacy.name, 'Legacy Test App');
assert.ok(createdLegacy.chismografo, 'Debe generar chismografo automáticamente');
assert.ok(createdLegacy.acercaDe, 'Debe generar estructura acercaDe automáticamente');
deleteTech('apps', legacyAppId);
console.log('✅ [6/9] Retrocompatibilidad con payloads v1 (legacy) verificada');

// 7. Pruebas para Infra, Pixels y Gateways
const infraList = listTechs('infra', { limit: 5 });
assert.strictEqual(infraList.success, true);
assert.ok(infraList.total >= 6);

const pixelsList = listTechs('pixels', { limit: 5 });
assert.strictEqual(pixelsList.success, true);
assert.ok(pixelsList.total >= 10);

const gatewaysList = listTechs('gateways', { limit: 5 });
assert.strictEqual(gatewaysList.success, true);
assert.ok(gatewaysList.total >= 15);
console.log('✅ [7/9] Listados de Infra, Pixels y Gateways verificados');

// 8. Verificación de IDs, Precios y Esquema en todo el catálogo
let totalVerified = 0;
for (const col of ['apps', 'infra', 'pixels', 'gateways', 'cms']) {
	const all = listTechs(col, { limit: 500 });
	all.data.forEach((item) => {
		assert.ok(item.id, `Elemento en ${col} debe tener ID`);
		assert.ok(item.nombre, `Elemento ${item.id} en ${col} debe tener 'nombre'`);
		assert.ok(
			Array.isArray(item.precios),
			`Elemento ${item.id} en ${col} debe tener precios array`
		);
		// Todas las 5 colecciones son ahora v2
		assert.ok(item.$schema, `Elemento ${item.id} en ${col} debe tener $schema`);
		assert.ok(item.chismografo, `Elemento ${item.id} en ${col} debe tener chismografo`);
		assert.ok(item.acercaDe, `Elemento ${item.id} en ${col} debe tener acercaDe`);
		assert.ok(item.herramienta, `Elemento ${item.id} en ${col} debe tener herramienta`);
		assert.strictEqual(
			item.toolData.responsable,
			undefined,
			`Elemento ${item.id} NO debe contener 'responsable' en toolData`
		);
		totalVerified++;
	});
}
console.log(
	`✅ [8/9] Integridad de IDs, precios, estructura v2 y compatibilidad legacy verificada en ${totalVerified} tecnologías.`
);

// 9. Verificación de validación estricta de 'revision' en toolData
assert.throws(
	() => {
		createTech('apps', {
			nombre: 'Invalid Revision App',
			toolData: { revision: 'automatica' },
		});
	},
	/revision.*"ia" o "manual"/i,
	'Debe fallar si revision no es "ia" o "manual"'
);
console.log('✅ [9/9] Validación estricta de "revision" (solo "ia" o "manual") verificada.');

console.log('\n🎉 ¡Todas las pruebas unitarias de catálogo CRUD pasaron exitosamente!');
