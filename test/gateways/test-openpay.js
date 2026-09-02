import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://openpay.mx/openpay.js"></script>
  </head>
  <body>
    <h1>Testing Gateway Openpay</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Openpay')) {
	console.log(`✅ PASSED: ${'Openpay'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Openpay'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
