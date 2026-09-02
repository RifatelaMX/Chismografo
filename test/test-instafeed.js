import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/instafeed.js"></script>
  </head>
  <body>
    <h1>Testing Instafeed ‑ Instagram Feed</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Instafeed ‑ Instagram Feed")) {
	console.log('✅ PASSED: ' + "Instafeed ‑ Instagram Feed");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Instafeed ‑ Instagram Feed" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
