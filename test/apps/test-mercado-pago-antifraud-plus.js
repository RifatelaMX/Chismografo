import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/mercado-pago-antifraud.js"></script>
  </head>
  <body>
    <h1>Testing Mercado Pago Antifraude Plus</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Mercado Pago Antifraude Plus')) {
	console.log(`✅ PASSED: ${'Mercado Pago Antifraude Plus'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Mercado Pago Antifraude Plus'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
