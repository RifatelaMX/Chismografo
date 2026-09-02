import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/seomanager.js"></script>
  </head>
  <body>
    <h1>Testing SEO Manager</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('SEO Manager')) {
	console.log(`✅ PASSED: ${'SEO Manager'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'SEO Manager'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
