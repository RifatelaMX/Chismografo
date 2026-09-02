import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/pop-convert.js"></script>
  </head>
  <body>
    <h1>Testing Pop Convert ‑ Pop Ups, Banners</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Pop Convert ‑ Pop Ups, Banners')) {
	console.log('✅ PASSED: ' + 'Pop Convert ‑ Pop Ups, Banners');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Pop Convert ‑ Pop Ups, Banners' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
