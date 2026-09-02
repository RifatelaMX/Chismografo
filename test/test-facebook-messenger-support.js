import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/facebook-messenger-support.js"></script>
  </head>
  <body>
    <h1>Testing PD Facebook Messenger Support</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("PD Facebook Messenger Support")) {
	console.log('✅ PASSED: ' + "PD Facebook Messenger Support");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "PD Facebook Messenger Support" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
