import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Gateway Test</title>
    <script src="https://cdn.example.com/dlocal.js"></script>
  </head>
  <body>
    <h1>Testing Gateway dLocal</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedGateways = result.paymentGateways || [];

if (detectedGateways.includes('dLocal')) {
	console.log(`✅ PASSED: ${'dLocal'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'dLocal'} not detected in ${JSON.stringify(detectedGateways)}`);
	process.exit(1);
}
