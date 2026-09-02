import { analyze } from '../../src/detector.js';

const html = `<!DOCTYPE html><html><head><script src="/static/frontend/Magento/luma/en_US/mage.js"></script></head><body><h1>Magento</h1></body></html>`;
const headers = {};

const result = analyze(html, headers);

if (result.technology === 'Magento') {
	console.log(`✅ PASSED: ${'Magento'}`);
	process.exit(0);
} else {
	console.error(`❌ FAILED: ${'Magento'} expected, got ${result.technology}`);
	process.exit(1);
}
