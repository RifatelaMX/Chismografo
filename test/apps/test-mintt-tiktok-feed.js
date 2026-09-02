import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/mintt-tiktok-feed.js"></script>
  </head>
  <body>
    <h1>Testing Mintt TikTok Feed</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Mintt TikTok Feed')) {
	console.log(`✅ PASSED: ${'Mintt TikTok Feed'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Mintt TikTok Feed'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
