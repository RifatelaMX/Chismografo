import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-video-slider.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Video Slider & Carousel</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: Video Slider & Carousel')) {
	console.log(`✅ PASSED: ${'POWR: Video Slider & Carousel'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'POWR: Video Slider & Carousel'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
