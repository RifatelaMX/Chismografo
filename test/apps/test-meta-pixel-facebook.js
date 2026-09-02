import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
  </head>
  <body>
    <h1>Testing Meta Pixel (Facebook)</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Meta Pixel (Facebook)')) {
	console.log('✅ PASSED: Meta Pixel (Facebook)');
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: Meta Pixel (Facebook) not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
