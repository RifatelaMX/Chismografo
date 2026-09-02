import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/pop-up-builder-wisepops.js"></script>
  </head>
  <body>
    <h1>Testing Wisepops: Popup Builder & CRO</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Wisepops: Popup Builder & CRO")) {
	console.log('✅ PASSED: ' + "Wisepops: Popup Builder & CRO");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Wisepops: Popup Builder & CRO" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
