import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/form-builder-contact-form.js"></script>
  </head>
  <body>
    <h1>Testing Powerful Contact Form Builder</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Powerful Contact Form Builder')) {
	console.log(`✅ PASSED: ${'Powerful Contact Form Builder'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Powerful Contact Form Builder'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
