import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/ecomsend.js"></script>
  </head>
  <body>
    <h1>Testing SendWILL Popup Email Marketing</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("SendWILL Popup Email Marketing")) {
	console.log('✅ PASSED: ' + "SendWILL Popup Email Marketing");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "SendWILL Popup Email Marketing" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
