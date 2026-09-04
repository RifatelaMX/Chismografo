import assert from 'node:assert';
import http from 'node:http';
import app from '../server.js';

const PORT = 3456;
const server = http.createServer(app);

function request(path, options = {}) {
	return new Promise((resolve, reject) => {
		const reqOptions = {
			hostname: '127.0.0.1',
			port: PORT,
			path: encodeURI(path),
			method: options.method || 'GET',
			headers: {
				'Content-Type': 'application/json',
				...(options.headers || {}),
			},
		};

		const req = http.request(reqOptions, (res) => {
			let data = '';
			res.on('data', (chunk) => {
				data += chunk;
			});
			res.on('end', () => {
				try {
					const json = data ? JSON.parse(data) : {};
					resolve({ status: res.statusCode, data: json });
				} catch {
					resolve({ status: res.statusCode, data });
				}
			});
		});

		req.on('error', reject);

		if (options.body) {
			req.write(JSON.stringify(options.body));
		}
		req.end();
	});
}

server.listen(PORT, async () => {
	console.log(`=== Probando Servidor HTTP en puerto ${PORT} ===\n`);
	try {
		// 1. GET /api/techs/apps con paginación
		const resApps = await request('/api/techs/apps?limit=5&page=1');
		assert.strictEqual(resApps.status, 200);
		assert.strictEqual(resApps.data.success, true);
		assert.strictEqual(resApps.data.data.length, 5);
		assert.strictEqual(resApps.data.limit, 5);
		console.log('✅ [1/9] GET /api/techs/apps (paginación limit=5, page=1)');

		// 2. GET /api/techs/apps con categoría
		const resCat = await request('/api/techs/apps?category=Analítica');
		assert.strictEqual(resCat.status, 200);
		assert.ok(resCat.data.data.length > 0);
		console.log('✅ [2/9] GET /api/techs/apps?category=Analítica');

		// 3. GET /api/techs/apps/:id
		const resGetId = await request('/api/techs/apps/microsoft-clarity');
		assert.strictEqual(resGetId.status, 200);
		assert.strictEqual(resGetId.data.data.id, 'microsoft-clarity');
		assert.ok(Array.isArray(resGetId.data.data.precios));
		console.log('✅ [3/9] GET /api/techs/apps/microsoft-clarity');

		// 4. POST /api/techs/apps
		const resPost = await request('/api/techs/apps', {
			method: 'POST',
			body: {
				name: 'Express HTTP Test App',
				developer: 'Test Inc',
				category: 'Analítica',
				precios: [{ id: 1, plan: 'Basic', precio: 10, moneda: 'USD' }],
				detectionRules: [{ type: 'script-src', pattern: 'express-http-test' }],
			},
		});
		assert.strictEqual(resPost.status, 201);
		assert.strictEqual(resPost.data.data.id, 'express-http-test-app');
		console.log('✅ [4/9] POST /api/techs/apps (creación exitosa)');

		// 5. PUT /api/techs/apps/:id
		const resPut = await request('/api/techs/apps/express-http-test-app', {
			method: 'PUT',
			body: {
				developer: 'Updated Test Inc',
				precios: [{ id: 1, plan: 'Pro', precio: 25, moneda: 'USD' }],
			},
		});
		assert.strictEqual(resPut.status, 200);
		assert.strictEqual(resPut.data.data.developer, 'Updated Test Inc');
		assert.strictEqual(resPut.data.data.precios[0].plan, 'Pro');
		console.log('✅ [5/12] PUT /api/techs/apps/:id (actualización completa)');

		// 5b. PATCH /api/techs/apps/:id
		const resPatch = await request('/api/techs/apps/express-http-test-app', {
			method: 'PATCH',
			body: {
				category: 'Buscador / Filtros',
			},
		});
		assert.strictEqual(resPatch.status, 200);
		assert.strictEqual(resPatch.data.data.category, 'Buscador / Filtros');
		assert.strictEqual(resPatch.data.data.developer, 'Updated Test Inc');
		console.log('✅ [6/12] PATCH /api/techs/apps/:id (actualización parcial)');

		// 6. DELETE /api/techs/apps/:id
		const resDel = await request('/api/techs/apps/express-http-test-app', {
			method: 'DELETE',
		});
		assert.strictEqual(resDel.status, 200);
		assert.strictEqual(resDel.data.success, true);
		console.log('✅ [6/9] DELETE /api/techs/apps/:id (eliminación exitosa)');

		// 7. CMS, Infra, Pixels, Gateways endpoints
		const resCms = await request('/api/techs/cms?limit=5');
		assert.strictEqual(resCms.status, 200);
		assert.strictEqual(resCms.data.success, true);
		assert.strictEqual(resCms.data.data.length, 5);
		assert.ok(resCms.data.total >= 6);

		const resGetCmsId = await request('/api/techs/cms/shopify');
		assert.strictEqual(resGetCmsId.status, 200);
		assert.strictEqual(resGetCmsId.data.data.id, 'shopify');

		const resInfra = await request('/api/techs/infra?limit=5');
		assert.strictEqual(resInfra.status, 200);

		const resPixels = await request('/api/techs/pixels?limit=5');
		assert.strictEqual(resPixels.status, 200);

		const resGateways = await request('/api/techs/gateways?limit=5');
		assert.strictEqual(resGateways.status, 200);
		console.log(
			'✅ [7/10] GET /api/techs/{cms,infra,pixels,gateways} con paginación y búsqueda por ID'
		);

		// 8. Screenshots DELETE endpoint
		const resDeleteScreen = await request('/api/screenshots?url=test-domain-delete.com', {
			method: 'DELETE',
		});
		assert.strictEqual(resDeleteScreen.status, 200);
		assert.strictEqual(resDeleteScreen.data.success, true);
		console.log('✅ [8/10] DELETE /api/screenshots');

		// 9. Aliases directos /api/apps, /api/infra sin url (devuelven catálogo)
		const resAliasApps = await request('/api/apps?limit=3');
		assert.strictEqual(resAliasApps.status, 200);
		assert.strictEqual(resAliasApps.data.data.length, 3);
		console.log('✅ [9/10] GET /api/apps (alias catálogo directo sin url)');

		// 10. Alias directo /api/cms sin url (devuelve catálogo)
		const resAliasCms = await request('/api/cms?limit=3');
		assert.strictEqual(resAliasCms.status, 200);
		assert.strictEqual(resAliasCms.data.data.length, 3);
		console.log('✅ [10/11] GET /api/cms (alias catálogo directo sin url)');

		// 11. OPTIONS Preflight en /api/techs/apps
		const resOptions = await request('/api/techs/apps', {
			method: 'OPTIONS',
			headers: {
				Origin: 'http://localhost:3000',
				'Access-Control-Request-Method': 'POST',
				'Access-Control-Request-Headers': 'Content-Type',
			},
		});
		assert.strictEqual(resOptions.status, 204);
		console.log('✅ [11/11] OPTIONS /api/techs/apps preflight (Status 204)');

		console.log('\n🎉 ¡Todas las pruebas HTTP pasaron con 100% de éxito!');
		server.close();
		process.exit(0);
	} catch (err) {
		console.error('❌ Error en pruebas HTTP:', err);
		server.close();
		process.exit(1);
	}
});
