import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-media-gallery.js"></script>
  </head>
  <body>
    <h1>Testing POWR YouTube Gallery</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR YouTube Gallery')) {
	console.log(`✅ PASSED: ${'POWR YouTube Gallery'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'POWR YouTube Gallery'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
