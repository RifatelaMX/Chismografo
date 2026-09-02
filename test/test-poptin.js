import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/poptin.js"></script>
  </head>
  <body>
    <h1>Testing Poptin Exit Popup Email Pop Up</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Poptin Exit Popup Email Pop Up")) {
	console.log('✅ PASSED: ' + "Poptin Exit Popup Email Pop Up");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Poptin Exit Popup Email Pop Up" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
