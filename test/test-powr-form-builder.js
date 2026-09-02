import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-form-builder.js"></script>
  </head>
  <body>
    <h1>Testing POWR Contact Form Builder</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("POWR Contact Form Builder")) {
	console.log('✅ PASSED: ' + "POWR Contact Form Builder");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "POWR Contact Form Builder" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
