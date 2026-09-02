import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/wholesale-pricing-discount.js"></script>
  </head>
  <body>
    <h1>Testing Wholesale Pricing Discount B2B</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Wholesale Pricing Discount B2B')) {
	console.log(`✅ PASSED: ${'Wholesale Pricing Discount B2B'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Wholesale Pricing Discount B2B'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
