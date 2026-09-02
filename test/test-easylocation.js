import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/easylocation.js"></script>
  </head>
  <body>
    <h1>Testing Geolocation Redirects Geo:Pro</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Geolocation Redirects Geo:Pro')) {
	console.log('✅ PASSED: ' + 'Geolocation Redirects Geo:Pro');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Geolocation Redirects Geo:Pro' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
