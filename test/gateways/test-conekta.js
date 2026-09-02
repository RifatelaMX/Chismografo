import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://cdn.conekta.io/js/latest/conekta.js"></script>
  </head>
  <body>
    <h1>Testing Gateway Conekta</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Conekta')) {
	console.log(`✅ PASSED: ${'Conekta'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Conekta'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
