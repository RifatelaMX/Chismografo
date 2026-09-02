import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://cdn.example.com/adyen.js"></script>
  </head>
  <body>
    <h1>Testing Gateway Adyen</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Adyen')) {
	console.log(`✅ PASSED: ${'Adyen'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Adyen'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
