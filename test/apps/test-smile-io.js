import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/smile.io.js"></script>
  </head>
  <body>
    <h1>Testing Smile: Lealtad y Recompensas</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Smile: Lealtad y Recompensas')) {
	console.log(`✅ PASSED: ${'Smile: Lealtad y Recompensas'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Smile: Lealtad y Recompensas'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
