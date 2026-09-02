import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/byob-build-your-own-bundle.js"></script>
  </head>
  <body>
    <h1>Testing BYOB ‑ Build Your Own Bundles</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('BYOB ‑ Build Your Own Bundles')) {
	console.log(`✅ PASSED: ${'BYOB ‑ Build Your Own Bundles'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'BYOB ‑ Build Your Own Bundles'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
