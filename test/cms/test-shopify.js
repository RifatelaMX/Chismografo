import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><head><meta name="generator" content="Shopify"></head><body><h1>Shopify</h1></body></html>`;
const headers = {};

const result = analyze(html, headers);

if (result.technology === 'Shopify') {
	console.log(`✅ PASSED: ${'Shopify'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Shopify'} expected, got ${result.technology}`);
	process.exit(1);
}
