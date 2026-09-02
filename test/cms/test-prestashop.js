import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><head><meta name="generator" content="PrestaShop"></head><body><h1>PrestaShop</h1></body></html>`;
const headers = {};

const result = analyze(html, headers);

if (result.technology === 'PrestaShop') {
	console.log(`✅ PASSED: ${'PrestaShop'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'PrestaShop'} expected, got ${result.technology}`);
	process.exit(1);
}
