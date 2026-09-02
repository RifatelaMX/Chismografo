import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/tridentab.js"></script>
  </head>
  <body>
    <h1>Testing A/B: Product and Price Testing</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('A/B: Product and Price Testing')) {
	console.log(`✅ PASSED: ${'A/B: Product and Price Testing'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'A/B: Product and Price Testing'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
