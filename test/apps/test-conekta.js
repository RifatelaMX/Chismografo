import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/conekta.js.js"></script>
  </head>
  <body>
    <h1>Testing Conekta</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Conekta')) {
	console.log(`✅ PASSED: ${'Conekta'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Conekta'} not detected. Detected: ${JSON.stringify(detectedNames)}`);
	process.exit(1);
}
