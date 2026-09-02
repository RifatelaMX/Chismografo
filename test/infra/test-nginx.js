import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><body><h1>Infra Nginx</h1></body></html>`;
const headers = { server: 'nginx/1.18.0' };

const result = analyze(html, headers);
const detectedInfra = (result.infrastructure || []).map((i) => i.name);

if (detectedInfra.includes('Nginx')) {
	console.log(`✅ PASSED: ${'Nginx'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Nginx'} not detected in ${JSON.stringify(detectedInfra)}`);
	process.exit(1);
}
