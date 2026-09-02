import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-survey.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Customer Survey | Poll</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: Customer Survey | Poll')) {
	console.log('✅ PASSED: ' + 'POWR: Customer Survey | Poll');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'POWR: Customer Survey | Poll' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
