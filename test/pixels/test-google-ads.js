import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script src="https://www.googletagmanager.com/gtag/js?id=AW-12345"></script>
  </head>
  <body>
    <h1>Testing Pixel Google Ads</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('Google Ads')) {
	console.log(`✅ PASSED: ${'Google Ads'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Google Ads'} not detected in ${JSON.stringify(detectedPixels)}`);
	process.exit(1);
}
