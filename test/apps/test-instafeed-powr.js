import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/instafeed-powr.js"></script>
  </head>
  <body>
    <h1>Testing POWR Instagram Feed Instafeed</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR Instagram Feed Instafeed')) {
	console.log(`✅ PASSED: ${'POWR Instagram Feed Instafeed'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'POWR Instagram Feed Instafeed'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
