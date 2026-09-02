import { analyze } from '../../src/detector.js';

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Pixel Test</title>
    <script type="text/javascript">
      (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "clarity-test-id");
    </script>
  </head>
  <body>
    <h1>Testing Pixel Microsoft Clarity</h1>
  </body>
</html>
`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedPixels = (result.pixels || []).map((p) => p.name);

if (detectedPixels.includes('Microsoft Clarity')) {
	console.log(`✅ PASSED: ${'Microsoft Clarity'}`);
	process.exit(0);
} else {
	console.error(
		`❌ FAILED: ${'Microsoft Clarity'} not detected in ${JSON.stringify(detectedPixels)}`
	);
	process.exit(1);
}
