import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/clarity.ms/tag/.js"></script>
  </head>
  <body>
    <h1>Testing Microsoft Clarity: AI Insights</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Microsoft Clarity: AI Insights')) {
	console.log(`✅ PASSED: ${'Microsoft Clarity: AI Insights'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Microsoft Clarity: AI Insights'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
