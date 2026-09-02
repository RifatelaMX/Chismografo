import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/colissimo-1.js"></script>
  </head>
  <body>
    <h1>Testing Colissimo by Common‑Services</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Colissimo by Common‑Services")) {
	console.log('✅ PASSED: ' + "Colissimo by Common‑Services");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Colissimo by Common‑Services" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
