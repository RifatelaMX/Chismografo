import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><body><h1>Infra Apache</h1></body></html>`;
const headers = { server: 'apache/2.4.41' };

const result = analyze(html, headers);
const detectedInfra = (result.infrastructure || []).map((i) => i.name);

if (detectedInfra.includes('Apache')) {
	console.log(`✅ PASSED: ${'Apache'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Apache'} not detected in ${JSON.stringify(detectedInfra)}`);
	process.exit(1);
}
