import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/atelier.js"></script>
  </head>
  <body>
    <h1>Testing Atelier | Private Sales</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Atelier | Private Sales')) {
	console.log('✅ PASSED: ' + 'Atelier | Private Sales');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Atelier | Private Sales' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
