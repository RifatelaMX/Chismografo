import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/zipify.js"></script>
  </head>
  <body>
    <h1>Testing Zipify Landing Page Builder</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Zipify Landing Page Builder')) {
	console.log(`✅ PASSED: ${'Zipify Landing Page Builder'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Zipify Landing Page Builder'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
