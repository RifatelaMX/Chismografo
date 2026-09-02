import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/image-hotspots-by-widgetic.js"></script>
  </head>
  <body>
    <h1>Testing Widgetic (Image Hotspots)</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Widgetic (Image Hotspots)')) {
	console.log(`✅ PASSED: ${'Widgetic (Image Hotspots)'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Widgetic (Image Hotspots)'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
