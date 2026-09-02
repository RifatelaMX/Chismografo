import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/tools.luckyorange.com.js"></script>
  </head>
  <body>
    <h1>Testing Lucky Orange Heatmaps & Replay</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Lucky Orange Heatmaps & Replay')) {
	console.log(`✅ PASSED: ${'Lucky Orange Heatmaps & Replay'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Lucky Orange Heatmaps & Replay'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
