import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/magno-upsell-cross-sell-funnel.js"></script>
  </head>
  <body>
    <h1>Testing Magno Upsell Cross Sell Funnel</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Magno Upsell Cross Sell Funnel")) {
	console.log('✅ PASSED: ' + "Magno Upsell Cross Sell Funnel");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Magno Upsell Cross Sell Funnel" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
