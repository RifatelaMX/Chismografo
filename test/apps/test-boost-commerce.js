import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/boostcommerce.net.js"></script>
  </head>
  <body>
    <h1>Testing Boost Commerce</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Boost Commerce')) {
	console.log(`✅ PASSED: ${'Boost Commerce'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Boost Commerce'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
