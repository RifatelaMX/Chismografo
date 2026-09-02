import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/privy.js"></script>
  </head>
  <body>
    <h1>Testing Privy ‑ Email, SMS & Pop Ups</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Privy ‑ Email, SMS & Pop Ups")) {
	console.log('✅ PASSED: ' + "Privy ‑ Email, SMS & Pop Ups");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Privy ‑ Email, SMS & Pop Ups" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
