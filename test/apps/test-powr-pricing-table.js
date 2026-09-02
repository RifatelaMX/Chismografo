import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-pricing-table.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Pricing Table Comparison</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: Pricing Table Comparison')) {
	console.log(`✅ PASSED: ${'POWR: Pricing Table Comparison'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'POWR: Pricing Table Comparison'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
