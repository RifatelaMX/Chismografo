import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powerful-countdown-timer.js"></script>
  </head>
  <body>
    <h1>Testing Pushdaddy Countdown Timer</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Pushdaddy Countdown Timer')) {
	console.log(`✅ PASSED: ${'Pushdaddy Countdown Timer'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Pushdaddy Countdown Timer'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
