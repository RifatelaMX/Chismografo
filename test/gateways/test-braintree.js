import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://cdn.example.com/braintree.js"></script>
  </head>
  <body>
    <h1>Testing Gateway Braintree</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Braintree')) {
	console.log(`✅ PASSED: ${'Braintree'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Braintree'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
