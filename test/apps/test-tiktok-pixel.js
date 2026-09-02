import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/analytics.tiktok.com/i18n/pixel/events.js.js"></script>
  </head>
  <body>
    <h1>Testing TikTok Pixel</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('TikTok Pixel')) {
	console.log(`✅ PASSED: ${'TikTok Pixel'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'TikTok Pixel'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
