import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/notification-bar.js"></script>
  </head>
  <body>
    <h1>Testing POWR Email Popup & Discounts</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR Email Popup & Discounts')) {
	console.log('✅ PASSED: ' + 'POWR Email Popup & Discounts');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'POWR Email Popup & Discounts' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
