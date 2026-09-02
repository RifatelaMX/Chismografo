import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://sdk.mercadopago.com/js/v2"></script>
  </head>
  <body>
    <h1>Testing Gateway Mercado Pago</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Mercado Pago')) {
	console.log(`✅ PASSED: ${'Mercado Pago'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Mercado Pago'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
