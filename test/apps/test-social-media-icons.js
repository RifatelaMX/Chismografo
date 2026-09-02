import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/social-media-icons.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Social Media Icons Bar</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: Social Media Icons Bar')) {
	console.log(`✅ PASSED: ${'POWR: Social Media Icons Bar'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'POWR: Social Media Icons Bar'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
