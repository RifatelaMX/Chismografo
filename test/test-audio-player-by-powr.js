import { analyze } from '../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/audio-player-by-powr.js"></script>
  </head>
  <body>
    <h1>Testing POWR: Background Music Player</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes('POWR: Background Music Player')) {
	console.log('✅ PASSED: ' + 'POWR: Background Music Player');
	process.exit(0);
} else {
	console.error(
		'❌ FAILED: ' +
			'POWR: Background Music Player' +
			' not detected. Detected: ' +
			JSON.stringify(detectedNames)
	);
	process.exit(1);
}
