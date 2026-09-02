import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-tabs.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Accordion Product Tabs</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: Accordion Product Tabs')) {
	console.log('✅ PASSED: ' + 'POWR: Accordion Product Tabs');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'POWR: Accordion Product Tabs' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
