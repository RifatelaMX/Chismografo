import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/chimpstatic.com.js"></script>
  </head>
  <body>
    <h1>Testing Mailchimp: Email & SMS</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Mailchimp: Email & SMS')) {
	console.log(`✅ PASSED: ${'Mailchimp: Email & SMS'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Mailchimp: Email & SMS'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
