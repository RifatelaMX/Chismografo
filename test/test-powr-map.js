import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-map.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Store Locator Map</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: Store Locator Map')) {
	console.log('✅ PASSED: ' + 'POWR: Store Locator Map');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'POWR: Store Locator Map' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
