import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script src="https://snap.licdn.com/li/lms-analytics/insight.min.js"></script>
  </head>
  <body>
    <h1>Testing Pixel LinkedIn Insight Tag</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('LinkedIn Insight Tag')) {
	console.log('✅ PASSED: "LinkedIn Insight Tag"');
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: "LinkedIn Insight Tag" not detected in ${JSON.stringify(detectedPixels)}`
	);
	process.exit(1);
}
