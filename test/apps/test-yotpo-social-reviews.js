import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/yotpo.js.js"></script>
  </head>
  <body>
    <h1>Testing Yotpo</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Yotpo')) {
	console.log(`✅ PASSED: ${'Yotpo'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Yotpo'} not detected. Detected: ${JSON.stringify(detectedNames)}`);
	process.exit(1);
}
