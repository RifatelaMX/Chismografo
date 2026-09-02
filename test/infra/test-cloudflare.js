import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><body><h1>Infra Cloudflare</h1></body></html>`;
const headers = { server: 'cloudflare', 'cf-ray': '12345' };

const result = analyze(html, headers);
const detectedInfra = (result.infrastructure || []).map((i) => i.name);

if (detectedInfra.includes('Cloudflare')) {
	console.log(`✅ PASSED: ${'Cloudflare'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Cloudflare'} not detected in ${JSON.stringify(detectedInfra)}`);
	process.exit(1);
}
