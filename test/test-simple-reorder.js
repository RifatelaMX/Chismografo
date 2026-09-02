import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/simple-reorder.js"></script>
  </head>
  <body>
    <h1>Testing Reorder Buy Again Repeat Order</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Reorder Buy Again Repeat Order')) {
	console.log('✅ PASSED: ' + 'Reorder Buy Again Repeat Order');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Reorder Buy Again Repeat Order' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
