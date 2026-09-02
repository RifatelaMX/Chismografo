import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/pushdaddy-cookie-gdpr-alert.js"></script>
  </head>
  <body>
    <h1>Testing Pushdaddy cookie gdpr alert</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Pushdaddy cookie gdpr alert')) {
	console.log('✅ PASSED: ' + 'Pushdaddy cookie gdpr alert');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Pushdaddy cookie gdpr alert' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
