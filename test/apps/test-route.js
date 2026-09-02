import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/routeapp.io.js"></script>
  </head>
  <body>
    <h1>Testing Route ‑ Protection & Tracking</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Route ‑ Protection & Tracking')) {
	console.log(`✅ PASSED: ${'Route ‑ Protection & Tracking'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Route ‑ Protection & Tracking'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
