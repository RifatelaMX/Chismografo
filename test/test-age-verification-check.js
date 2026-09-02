import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/age-verification-check.js"></script>
  </head>
  <body>
    <h1>Testing Hulk Age Verification Popup</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Hulk Age Verification Popup")) {
	console.log('✅ PASSED: ' + "Hulk Age Verification Popup");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Hulk Age Verification Popup" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
