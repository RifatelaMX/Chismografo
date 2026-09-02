import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/alireviews.js"></script>
  </head>
  <body>
    <h1>Testing Ali Reviews</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Ali Reviews')) {
	console.log(`✅ PASSED: ${'Ali Reviews'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Ali Reviews'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
