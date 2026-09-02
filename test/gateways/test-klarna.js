import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://x.klarnacdn.net/kp/lib/v1/api.js"></script>
  </head>
  <body>
    <h1>Testing Gateway Klarna</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Klarna')) {
	console.log(`✅ PASSED: ${'Klarna'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Klarna'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
