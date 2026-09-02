import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://cdn.example.com/aplazo.js"></script>
  </head>
  <body>
    <h1>Testing Gateway Aplazo</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('Aplazo')) {
	console.log(`✅ PASSED: ${'Aplazo'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Aplazo'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
