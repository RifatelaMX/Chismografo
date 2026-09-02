import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script src="https://s.pinimg.com/ct/core.js"></script>
  </head>
  <body>
    <h1>Testing Pixel Pinterest Tag</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('Pinterest Tag')) {
	console.log(`✅ PASSED: ${'Pinterest Tag'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Pinterest Tag'} not detected in ${JSON.stringify(detectedPixels)}`);
	process.exit(1);
}
