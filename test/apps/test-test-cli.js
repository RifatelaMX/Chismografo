import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/test-cli.js"></script>
  </head>
  <body>
    <h1>Testing Test CLI</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Test CLI')) {
	console.log(`✅ PASSED: ${'Test CLI'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Test CLI'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
