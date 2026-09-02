import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-about-us.js"></script>
  </head>
  <body>
    <h1>Testing POWR: About Us | Team Profile</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("POWR: About Us | Team Profile")) {
	console.log('✅ PASSED: ' + "POWR: About Us | Team Profile");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "POWR: About Us | Team Profile" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
