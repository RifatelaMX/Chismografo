import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://js.stripe.com/v3/"></script>
  </head>
  <body>
    <h1>Testing Gateway Stripe</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Stripe')) {
	console.log(`✅ PASSED: ${'Stripe'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Stripe'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
