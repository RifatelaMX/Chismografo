import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/shoppop.js"></script>
  </head>
  <body>
    <h1>Testing SalesPop: Order & Sales Popup</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("SalesPop: Order & Sales Popup")) {
	console.log('✅ PASSED: ' + "SalesPop: Order & Sales Popup");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "SalesPop: Order & Sales Popup" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
