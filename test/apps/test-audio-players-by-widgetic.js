import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/audio-players-by-widgetic.js"></script>
  </head>
  <body>
    <h1>Testing Widgetic (Audio Players)</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Widgetic (Audio Players)')) {
	console.log(`✅ PASSED: ${'Widgetic (Audio Players)'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Widgetic (Audio Players)'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
