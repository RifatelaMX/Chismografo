import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/connected-inventory.js"></script>
  </head>
  <body>
    <h1>Testing NASP Connected Inventory</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('NASP Connected Inventory')) {
	console.log(`✅ PASSED: ${'NASP Connected Inventory'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'NASP Connected Inventory'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
