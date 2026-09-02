import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/facturama.mx.js"></script>
  </head>
  <body>
    <h1>Testing Facturama: Facturación CFDI</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Facturama: Facturación CFDI')) {
	console.log(`✅ PASSED: ${'Facturama: Facturación CFDI'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Facturama: Facturación CFDI'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
