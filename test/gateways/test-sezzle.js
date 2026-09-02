import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://checkout.sezzle.com/widget.js"></script>
  </head>
  <body>
    <h1>Testing Gateway Sezzle</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Sezzle')) {
	console.log('✅ PASSED: "Sezzle"');
	process.exit(0);
} else {
	console.error(`❌ FAILED: "Sezzle" not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
