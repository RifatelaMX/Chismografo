import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/mailchimp-forms.js"></script>
  </head>
  <body>
    <h1>Testing Mailmunch Forms for Mailchimp</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Mailmunch Forms for Mailchimp")) {
	console.log('✅ PASSED: ' + "Mailmunch Forms for Mailchimp");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Mailmunch Forms for Mailchimp" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
