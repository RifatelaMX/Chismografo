import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><body><h1>Infra Varnish</h1></body></html>`;
const headers = { via: 'varnish', 'x-varnish': '123456' };

const result = analyze(html, headers);
const detectedInfra = (result.infrastructure || []).map((i) => i.name);

if (detectedInfra.includes('Varnish')) {
	console.log(`✅ PASSED: ${'Varnish'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Varnish'} not detected in ${JSON.stringify(detectedInfra)}`);
	process.exit(1);
}
