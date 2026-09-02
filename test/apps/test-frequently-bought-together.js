import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/frequently-bought-together.js"></script>
  </head>
  <body>
    <h1>Testing Frequently Bought Together</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Frequently Bought Together')) {
	console.log(`✅ PASSED: ${'Frequently Bought Together'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Frequently Bought Together'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
