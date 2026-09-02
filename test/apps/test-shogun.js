import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/shogun.js"></script>
  </head>
  <body>
    <h1>Testing Shogun - Landing Page Builder</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Shogun - Landing Page Builder')) {
	console.log(`✅ PASSED: ${'Shogun - Landing Page Builder'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Shogun - Landing Page Builder'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
