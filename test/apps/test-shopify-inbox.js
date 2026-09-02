import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/shopify-chat.js"></script>
  </head>
  <body>
    <h1>Testing Shopify Inbox</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Shopify Inbox')) {
	console.log(`✅ PASSED: ${'Shopify Inbox'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Shopify Inbox'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
