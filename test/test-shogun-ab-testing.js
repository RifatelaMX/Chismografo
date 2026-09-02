import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/shogun-ab-testing.js"></script>
  </head>
  <body>
    <h1>Testing Shogun ‑ AB Testing</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Shogun ‑ AB Testing')) {
	console.log('✅ PASSED: ' + 'Shogun ‑ AB Testing');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Shogun ‑ AB Testing' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
