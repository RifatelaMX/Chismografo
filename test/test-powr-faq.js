import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-faq.js"></script>
  </head>
  <body>
    <h1>Testing POWR: FAQ Page | Help Center</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: FAQ Page | Help Center')) {
	console.log('✅ PASSED: ' + 'POWR: FAQ Page | Help Center');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'POWR: FAQ Page | Help Center' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
