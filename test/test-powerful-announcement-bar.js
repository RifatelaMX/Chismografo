import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powerful-announcement-bar.js"></script>
  </head>
  <body>
    <h1>Testing Pushdaddy Announcement Bar</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("Pushdaddy Announcement Bar")) {
	console.log('✅ PASSED: ' + "Pushdaddy Announcement Bar");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "Pushdaddy Announcement Bar" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
