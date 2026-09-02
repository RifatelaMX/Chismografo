import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/afterpay.com.js"></script>
  </head>
  <body>
    <h1>Testing Afterpay</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Afterpay')) {
	console.log(`✅ PASSED: ${'Afterpay'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Afterpay'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
