import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/shogun-personalization.js"></script>
  </head>
  <body>
    <h1>Testing Shogun ‑ Personalization</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Shogun ‑ Personalization")) {
	console.log('✅ PASSED: ' + "Shogun ‑ Personalization");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Shogun ‑ Personalization" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
