import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/exit-intent-popup.js"></script>
  </head>
  <body>
    <h1>Testing Exit intent popup with coupon</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Exit intent popup with coupon")) {
	console.log('✅ PASSED: ' + "Exit intent popup with coupon");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Exit intent popup with coupon" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
