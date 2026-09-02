import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><head><link rel="stylesheet" href="https://example.vteximg.com.br/style.css"></head><body><h1>VTEX</h1></body></html>`;
const headers = { server: 'VTEX' };

const result = analyze(html, headers);

if (result.technology === 'VTEX') {
	console.log(`✅ PASSED: ${'VTEX'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'VTEX'} expected, got ${result.technology}`);
	process.exit(1);
}
