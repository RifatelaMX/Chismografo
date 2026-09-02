import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://www.paypal.com/sdk/js"></script>
  </head>
  <body>
    <h1>Testing Gateway PayPal</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('PayPal')) {
	console.log(`✅ PASSED: ${'PayPal'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'PayPal'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
