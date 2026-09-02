import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/live-product-options.js"></script>
  </head>
  <body>
    <h1>Testing LPO Live Product Options</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('LPO Live Product Options')) {
	console.log(`✅ PASSED: ${'LPO Live Product Options'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'LPO Live Product Options'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
