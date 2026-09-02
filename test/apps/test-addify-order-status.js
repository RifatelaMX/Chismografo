import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/addify-order-status.js"></script>
  </head>
  <body>
    <h1>Testing COS : Custom Order Status</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('COS : Custom Order Status')) {
	console.log(`✅ PASSED: ${'COS : Custom Order Status'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'COS : Custom Order Status'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
