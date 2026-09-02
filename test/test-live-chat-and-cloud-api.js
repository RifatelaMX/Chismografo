import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/live-chat-and-cloud-api.js"></script>
  </head>
  <body>
    <h1>Testing Pushdaddy Many Chat ,Cloud API</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Pushdaddy Many Chat ,Cloud API')) {
	console.log('✅ PASSED: ' + 'Pushdaddy Many Chat ,Cloud API');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Pushdaddy Many Chat ,Cloud API' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
