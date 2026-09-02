import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/whatsapp-chat-button-squadkin.js"></script>
  </head>
  <body>
    <h1>Testing SK: WhatsApp Chat Button</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('SK: WhatsApp Chat Button')) {
	console.log(`✅ PASSED: ${'SK: WhatsApp Chat Button'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'SK: WhatsApp Chat Button'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
