import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><body class="woocommerce woocommerce-page"><h1>WooCommerce</h1></body></html>`;
const headers = {};

const result = analyze(html, headers);

if (result.technology === 'WooCommerce') {
	console.log(`✅ PASSED: ${'WooCommerce'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'WooCommerce'} expected, got ${result.technology}`);
	process.exit(1);
}
