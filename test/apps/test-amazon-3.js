import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/amazon-3.js"></script>
  </head>
  <body>
    <h1>Testing CS Amazon Integration & Sync</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('CS Amazon Integration & Sync')) {
	console.log(`✅ PASSED: ${'CS Amazon Integration & Sync'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'CS Amazon Integration & Sync'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
