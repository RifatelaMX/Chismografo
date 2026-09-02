import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script src="https://analytics.tiktok.com/i18n/pixel/events.js"></script>
  </head>
  <body>
    <h1>Testing Pixel TikTok Pixel</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('TikTok Pixel')) {
	console.log(`✅ PASSED: ${'TikTok Pixel'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'TikTok Pixel'} not detected in ${JSON.stringify(detectedPixels)}`);
	process.exit(1);
}
