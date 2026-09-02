import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><head><meta name="generator" content="Odoo"><link rel="stylesheet" href="/web/assets/1/web.assets_frontend.min.css"></head><body id="wrapwrap"><div data-oe-model="ir.ui.view"><h1>Odoo Store</h1></div><script src="/web/assets/1/web.assets_frontend.min.js"></script></body></html>`;
const headers = { server: 'Werkzeug/2.0.2' };

const result = analyze(html, headers);

if (result.technology === 'Odoo') {
	console.log(`✅ PASSED: ${'Odoo'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Odoo'} expected, got ${result.technology}`);
	process.exit(1);
}
