import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/vanchat.js"></script>
  </head>
  <body>
    <h1>Testing VanChat AI Chatbot & Live Chat</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('VanChat AI Chatbot & Live Chat')) {
	console.log('✅ PASSED: ' + 'VanChat AI Chatbot & Live Chat');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'VanChat AI Chatbot & Live Chat' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
