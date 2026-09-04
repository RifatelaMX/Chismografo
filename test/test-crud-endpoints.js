import assert from 'node:assert';
import {
	createTech,
	deleteTech,
	getTechById,
	listTechs,
	updateTech,
} from '../src/techCatalogService.js';

console.log('=== Iniciando Pruebas de Catálogo CRUD y Precios ===\n');

// 1. Prueba de listado y paginación por defecto (limit = 5)
const appsPage1 = listTechs('apps', { page: 1, limit: 5 });
assert.strictEqual(appsPage1.success, true);
assert.strictEqual(appsPage1.limit, 5);
assert.strictEqual(appsPage1.page, 1);
assert.strictEqual(appsPage1.data.length, 5);
assert.ok(appsPage1.total > 100, 'Total de apps debe ser mayor a 100');
assert.ok(appsPage1.totalPages >= 20, 'TotalPages debe ser al menos 20');
console.log(`✅ [1/8] Paginación de Apps correcta (5 por página, total: ${appsPage1.total})`);

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
	`✅ [2/8] Filtrado por categoría "Analítica" correcto (${analyticsApps.total} encontradas)`
);

// 3. Prueba de obtención por ID único
const clarityApp = getTechById('apps', 'microsoft-clarity');
assert.ok(clarityApp, 'Microsoft Clarity debe existir');
assert.strictEqual(clarityApp.id, 'microsoft-clarity');
assert.ok(Array.isArray(clarityApp.precios), 'Debe tener campo precios como array');
console.log('✅ [3/8] Obtención por ID "microsoft-clarity" correcta');

// 4. Prueba de Creación CRUD con planes de precios
const testAppId = 'test-suite-demo-app';
// Asegurar que no exista previamente
try {
	deleteTech('apps', testAppId);
} catch (_e) {}

const newAppData = {
	name: 'Test Suite Demo App',
	developer: 'QA Dev',
	category: 'Analítica',
	precios: [
		{
			id: 1,
			plan: 'Demo',
			precio: 1.0,
			moneda: 'USD',
		},
		{
			id: 2,
			plan: 'Pro Unlimited',
			precio: 49.99,
			moneda: 'USD',
		},
	],
	detectionRules: [
		{
			type: 'script-src',
			pattern: 'test-suite-demo-app\\.js',
			description: 'Test rule',
		},
	],
};

const createdApp = createTech('apps', newAppData);
assert.strictEqual(createdApp.id, testAppId);
assert.strictEqual(createdApp.name, 'Test Suite Demo App');
assert.strictEqual(createdApp.precios.length, 2);
assert.strictEqual(createdApp.precios[0].plan, 'Demo');
assert.strictEqual(createdApp.precios[0].precio, 1.0);
console.log('✅ [4/8] Creación de tecnología con planes de precios exitosa');

// 5. Prueba de Actualización CRUD
const updatedApp = updateTech('apps', testAppId, {
	developer: 'QA Senior Dev',
	precios: [
		{
			id: 1,
			plan: 'Free Tier',
			precio: 0.0,
			moneda: 'USD',
		},
	],
});
assert.strictEqual(updatedApp.developer, 'QA Senior Dev');
assert.strictEqual(updatedApp.precios.length, 1);
assert.strictEqual(updatedApp.precios[0].plan, 'Free Tier');
console.log('✅ [5/8] Actualización de tecnología y precios exitosa');

// 6. Prueba de Eliminación CRUD
const deleteResult = deleteTech('apps', testAppId);
assert.strictEqual(deleteResult, true);
const deletedCheck = getTechById('apps', testAppId);
assert.strictEqual(deletedCheck, null);
console.log('✅ [6/8] Eliminación de tecnología exitosa');

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
console.log('✅ [7/8] Listados de Infra, Pixels y Gateways verificados');

// 8. Verificación de IDs y Precios en todo el catálogo
let totalVerified = 0;
for (const col of ['apps', 'infra', 'pixels', 'gateways', 'cms']) {
	const all = listTechs(col, { limit: 500 });
	all.data.forEach((item) => {
		assert.ok(item.id, `Elemento en ${col} debe tener ID`);
		assert.ok(
			Array.isArray(item.precios),
			`Elemento ${item.id} en ${col} debe tener precios array`
		);
		totalVerified++;
	});
}
console.log(`✅ [8/8] Integridad de IDs y precios verificada en ${totalVerified} tecnologías.`);

console.log('\n🎉 ¡Todas las pruebas unitarias de catálogo CRUD pasaron exitosamente!');
