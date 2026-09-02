import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-popup.js"></script>
  </head>
  <body>
    <h1>Testing POWR Sales Popup, Email Pop up</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("POWR Sales Popup, Email Pop up")) {
	console.log('✅ PASSED: ' + "POWR Sales Popup, Email Pop up");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "POWR Sales Popup, Email Pop up" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
