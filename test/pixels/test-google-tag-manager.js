import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script src="https://www.googletagmanager.com/gtm.js"></script>
  </head>
  <body>
    <h1>Testing Pixel Google Tag Manager</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('Google Tag Manager')) {
	console.log(`✅ PASSED: ${'Google Tag Manager'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Google Tag Manager'} not detected in ${JSON.stringify(detectedPixels)}`
	);
	process.exit(1);
}
