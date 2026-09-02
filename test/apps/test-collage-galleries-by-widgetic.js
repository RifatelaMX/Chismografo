import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/collage-galleries-by-widgetic.js"></script>
  </head>
  <body>
    <h1>Testing Widgetic (Mosaic Gallery)</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Widgetic (Mosaic Gallery)')) {
	console.log(`✅ PASSED: ${'Widgetic (Mosaic Gallery)'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Widgetic (Mosaic Gallery)'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
