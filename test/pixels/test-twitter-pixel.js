import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script src="https://static.ads-twitter.com/uwt.js"></script>
  </head>
  <body>
    <h1>Testing Pixel Twitter / X Pixel</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('Twitter / X Pixel')) {
	console.log(`✅ PASSED: ${'Twitter / X Pixel'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Twitter / X Pixel'} not detected in ${JSON.stringify(detectedPixels)}`
	);
	process.exit(1);
}
