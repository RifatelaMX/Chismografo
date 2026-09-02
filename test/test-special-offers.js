import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/special-offers.js"></script>
  </head>
  <body>
    <h1>Testing USO: Ultimate Special Offers</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("USO: Ultimate Special Offers")) {
	console.log('✅ PASSED: ' + "USO: Ultimate Special Offers");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "USO: Ultimate Special Offers" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
