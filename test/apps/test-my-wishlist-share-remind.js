import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/my-wishlist-share-remind.js"></script>
  </head>
  <body>
    <h1>Testing Hulk AI Wishlist & Favorites</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Hulk AI Wishlist & Favorites')) {
	console.log(`✅ PASSED: ${'Hulk AI Wishlist & Favorites'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Hulk AI Wishlist & Favorites'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
