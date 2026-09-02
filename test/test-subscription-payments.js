import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/subscription-payments.js"></script>
  </head>
  <body>
    <h1>Testing Recharge Subscriptions App</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Recharge Subscriptions App')) {
	console.log('✅ PASSED: ' + 'Recharge Subscriptions App');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Recharge Subscriptions App' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
