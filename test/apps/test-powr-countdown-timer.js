import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-countdown-timer.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Countdown Timer Bar</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: Countdown Timer Bar')) {
	console.log(`✅ PASSED: ${'POWR: Countdown Timer Bar'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'POWR: Countdown Timer Bar'} not detected. Detected: ${JSON.stringify(detectedNames)}`
	);
	process.exit(1);
}
