import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/powr-job-posting.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Job Posting Careers Page</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes("POWR: Job Posting Careers Page")) {
	console.log('✅ PASSED: ' + "POWR: Job Posting Careers Page");
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + "POWR: Job Posting Careers Page" + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
