import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/okendo.co.js"></script>
  </head>
  <body>
    <h1>Testing Okendo: Reviews & Loyalty</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Okendo: Reviews & Loyalty')) {
	console.log(`✅ PASSED: ${'Okendo: Reviews & Loyalty'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Okendo: Reviews & Loyalty'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
