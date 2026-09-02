import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script src="https://www.google-analytics.com/analytics.js"></script>
  </head>
  <body>
    <h1>Testing Pixel Google Analytics</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('Google Analytics')) {
	console.log(`✅ PASSED: ${'Google Analytics'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Google Analytics'} not detected in ${JSON.stringify(detectedPixels)}`
	);
	process.exit(1);
}
