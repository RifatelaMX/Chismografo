import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/yeps-announcement-bar-banners.js"></script>
  </head>
  <body>
    <h1>Testing Yeps Announcement Bar Banner</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Yeps Announcement Bar Banner')) {
	console.log(`✅ PASSED: ${'Yeps Announcement Bar Banner'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Yeps Announcement Bar Banner'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
