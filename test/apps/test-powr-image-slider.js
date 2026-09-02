import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-image-slider.js"></script>
  </head>
  <body>
    <h1>Testing POWR Image Slider & Carousel</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR Image Slider & Carousel')) {
	console.log(`✅ PASSED: ${'POWR Image Slider & Carousel'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'POWR Image Slider & Carousel'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
