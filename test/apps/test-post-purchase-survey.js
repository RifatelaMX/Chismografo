import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/post-purchase-survey.js"></script>
  </head>
  <body>
    <h1>Testing Hulk NPS Post Purchase Survey</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Hulk NPS Post Purchase Survey')) {
	console.log(`✅ PASSED: ${'Hulk NPS Post Purchase Survey'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Hulk NPS Post Purchase Survey'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
