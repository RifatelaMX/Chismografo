import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
  </head>
  <body>
    <h1>Testing Pixel Meta Pixel</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('Meta Pixel')) {
	console.log(`✅ PASSED: ${'Meta Pixel'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Meta Pixel'} not detected in ${JSON.stringify(detectedPixels)}`);
	process.exit(1);
}
