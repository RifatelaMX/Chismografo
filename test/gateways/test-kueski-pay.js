import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://cdn.example.com/kueski-pay.js"></script>
  </head>
  <body>
    <h1>Testing Gateway Kueski Pay</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Kueski Pay')) {
	console.log(`✅ PASSED: ${'Kueski Pay'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Kueski Pay'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
