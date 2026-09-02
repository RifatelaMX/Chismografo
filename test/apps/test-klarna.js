import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/klarna.com.js"></script>
  </head>
  <body>
    <h1>Testing Klarna</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Klarna')) {
	console.log(`✅ PASSED: ${'Klarna'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Klarna'} not detected. Detected: ${JSON.stringify(detectedNames)}`);
	process.exit(1);
}
