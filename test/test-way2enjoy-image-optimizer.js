import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/way2enjoy-image-optimizer.js"></script>
  </head>
  <body>
    <h1>Testing Way2Enjoy Image Optimizer</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Way2Enjoy Image Optimizer')) {
	console.log('✅ PASSED: ' + 'Way2Enjoy Image Optimizer');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Way2Enjoy Image Optimizer' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
