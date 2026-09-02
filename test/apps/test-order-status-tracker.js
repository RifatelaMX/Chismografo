import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/order-status-tracker.js"></script>
  </head>
  <body>
    <h1>Testing Hulk Order Tracking & Upsell</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Hulk Order Tracking & Upsell')) {
	console.log(`✅ PASSED: ${'Hulk Order Tracking & Upsell'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Hulk Order Tracking & Upsell'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
