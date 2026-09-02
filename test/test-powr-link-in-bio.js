import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-link-in-bio.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Link‑in‑Bio</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: Link‑in‑Bio')) {
	console.log('✅ PASSED: ' + 'POWR: Link‑in‑Bio');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'POWR: Link‑in‑Bio' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
