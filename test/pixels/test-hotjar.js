import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script src="https://static.hotjar.com/c/hotjar-123.js"></script>
  </head>
  <body>
    <h1>Testing Pixel Hotjar</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('Hotjar')) {
	console.log(`✅ PASSED: ${'Hotjar'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Hotjar'} not detected in ${JSON.stringify(detectedPixels)}`);
	process.exit(1);
}
