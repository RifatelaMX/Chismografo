import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/gdpr-cookie-notice.js"></script>
  </head>
  <body>
    <h1>Testing Hulk GDPR Cookie Consent Bar</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Hulk GDPR Cookie Consent Bar')) {
	console.log(`✅ PASSED: ${'Hulk GDPR Cookie Consent Bar'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Hulk GDPR Cookie Consent Bar'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
