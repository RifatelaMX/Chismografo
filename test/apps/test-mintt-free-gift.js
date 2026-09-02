import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/mintt-free-gift.js"></script>
  </head>
  <body>
    <h1>Testing Mintt Free Gift & BOGO Upsell</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Mintt Free Gift & BOGO Upsell')) {
	console.log(`✅ PASSED: ${'Mintt Free Gift & BOGO Upsell'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Mintt Free Gift & BOGO Upsell'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
