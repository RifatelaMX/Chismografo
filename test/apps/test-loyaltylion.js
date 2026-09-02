import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/loyaltylion.js"></script>
  </head>
  <body>
    <h1>Testing LoyaltyLion Loyalty Program</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('LoyaltyLion Loyalty Program')) {
	console.log(`✅ PASSED: ${'LoyaltyLion Loyalty Program'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'LoyaltyLion Loyalty Program'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
