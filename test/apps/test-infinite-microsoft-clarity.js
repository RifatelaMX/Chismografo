import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/infinite-microsoft-clarity.js"></script>
  </head>
  <body>
    <h1>Testing ∞ Microsoft Clarity & Heatmap</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('∞ Microsoft Clarity & Heatmap')) {
	console.log(`✅ PASSED: ${'∞ Microsoft Clarity & Heatmap'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'∞ Microsoft Clarity & Heatmap'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
