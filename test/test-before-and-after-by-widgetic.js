import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/before-and-after-by-widgetic.js"></script>
  </head>
  <body>
    <h1>Testing Widgetic (Before and After)</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Widgetic (Before and After)")) {
	console.log('✅ PASSED: ' + "Widgetic (Before and After)");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Widgetic (Before and After)" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
