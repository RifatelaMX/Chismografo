import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/avada-seo.js"></script>
  </head>
  <body>
    <h1>Testing Avada SEO</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Avada SEO')) {
	console.log(`✅ PASSED: ${'Avada SEO'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Avada SEO'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
