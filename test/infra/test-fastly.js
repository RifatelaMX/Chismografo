import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><body><h1>Infra Fastly</h1></body></html>`;
const headers = { 'x-served-by': 'cache-iad-123', 'x-cache': 'HIT' };

const result = analyze(html, headers);
const detectedInfra = (result.infrastructure || []).map((i) => i.name);

if (detectedInfra.includes('Fastly')) {
	console.log(`✅ PASSED: ${'Fastly'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Fastly'} not detected in ${JSON.stringify(detectedInfra)}`);
	process.exit(1);
}
