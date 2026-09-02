import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/form-builder-by-hulkapps.js"></script>
  </head>
  <body>
    <h1>Testing Hulk Contact Form Builder</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Hulk Contact Form Builder')) {
	console.log(`✅ PASSED: ${'Hulk Contact Form Builder'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Hulk Contact Form Builder'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
