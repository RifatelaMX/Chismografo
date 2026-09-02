import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/fontify-change-customize-font-for-your-store.js"></script>
  </head>
  <body>
    <h1>Testing Fontify: Google & Custom Fonts</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Fontify: Google & Custom Fonts')) {
	console.log(`✅ PASSED: ${'Fontify: Google & Custom Fonts'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Fontify: Google & Custom Fonts'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
