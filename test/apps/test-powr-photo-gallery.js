import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-photo-gallery.js"></script>
  </head>
  <body>
    <h1>Testing POWR Lookbook Gallery</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR Lookbook Gallery')) {
	console.log(`✅ PASSED: ${'POWR Lookbook Gallery'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'POWR Lookbook Gallery'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
