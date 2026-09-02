import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/sheets.js"></script>
  </head>
  <body>
    <h1>Testing Sheets ‑ Data Connector</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('Sheets ‑ Data Connector')) {
	console.log('✅ PASSED: ' + 'Sheets ‑ Data Connector');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'Sheets ‑ Data Connector' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
