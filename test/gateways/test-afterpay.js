import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://static.afterpay.com/afterpay-sdk.js"></script>
  </head>
  <body>
    <h1>Testing Gateway Afterpay</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Afterpay')) {
	console.log('✅ PASSED: Afterpay');
	process.exit(0);
} else {
	console.error(`❌ FAILED: Afterpay not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
