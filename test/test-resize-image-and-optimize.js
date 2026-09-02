import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/resize-image-and-optimize.js"></script>
  </head>
  <body>
    <h1>Testing Pushdaddy Resize Image</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Pushdaddy Resize Image')) {
	console.log('✅ PASSED: ' + 'Pushdaddy Resize Image');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Pushdaddy Resize Image' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
