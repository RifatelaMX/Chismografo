import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/add-to-cart-animator-shaker.js"></script>
  </head>
  <body>
    <h1>Testing Pushdaddy Add to Cart Animator</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Pushdaddy Add to Cart Animator')) {
	console.log(`✅ PASSED: ${'Pushdaddy Add to Cart Animator'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Pushdaddy Add to Cart Animator'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
