import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><body><h1>Infra Amazon CloudFront</h1></body></html>`;
const headers = { via: 'cloudfront', 'x-amz-cf-id': '12345' };

const result = analyze(html, headers);
const detectedInfra = (result.infrastructure || []).map((i) => i.name);

if (detectedInfra.includes('Amazon CloudFront')) {
	console.log(`✅ PASSED: ${'Amazon CloudFront'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Amazon CloudFront'} not detected in ${JSON.stringify(detectedInfra)}`
	);
	process.exit(1);
}
