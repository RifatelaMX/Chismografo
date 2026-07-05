import { analyze } from './src/detector.js';

// Define mock test suites
const testCases = [
	{
		name: 'Shopify site (Standard generator, CDN & App signatures)',
		html: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>My Shopify Store</title>
          <meta name="generator" content="Shopify">
          <link rel="stylesheet" href="https://cdn.shopify.com/s/files/1/1234/5678/t/1/assets/theme.css">
          <script src="https://static.klaviyo.com/onsite/js/klaviyo.js"></script>
          <script src="https://x.klarnacdn.net/kp/lib/v1/api.js"></script>
          <script src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"></script>
        </head>
        <body>
          <h1>Welcome to Shopify Store</h1>
          <script src="https://cdn.shopify.com/s/files/1/1234/5678/t/1/assets/theme.js"></script>
          <script src="https://loox-cdn.loox.io/assets/loox.js"></script>
          <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
        </body>
      </html>
    `,
		headers: {
			'content-type': 'text/html',
		},
		expectedTech: 'Shopify',
		minConfidence: 0.99,
		expectedPlugins: ['Klaviyo', 'Loox', 'Klarna', 'Google Tag Manager', 'Meta Pixel (Facebook)'],
	},
	{
		name: 'Shopify site (JS variable & Cart Form match & PageFly & LatAm gateways)',
		html: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Custom Shopify Store</title>
          <script src="https://sdk.mercadopago.com/js/v2"></script>
          <script src="https://cdn.conekta.io/js/latest/conekta.js"></script>
        </head>
        <body>
          <form action="/cart/add" method="post">
            <button type="submit">Add to Cart</button>
          </form>
          <script>
            window.Shopify = { shop: "custom.myshopify.com" };
          </script>
          <script src="/cdn/pagefly/core.js"></script>
          <script src="https://openpay.mx/openpay.js"></script>
        </body>
      </html>
    `,
		headers: {
			'content-type': 'text/html',
		},
		expectedTech: 'Shopify',
		minConfidence: 0.95,
		expectedPlugins: ['PageFly', 'Mercado Pago', 'Conekta', 'Openpay'],
	},
	{
		name: 'Magento site (RequireJS, static paths & Magento Tax module)',
		html: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Magento Store</title>
          <link rel="stylesheet" href="/static/frontend/Magento/luma/en_US/css/styles-m.css">
          <link rel="stylesheet" href="/static/frontend/Magento/luma/en_US/Magento_Tax/css/tax.css">
        </head>
        <body>
          <h1>Welcome to Magento</h1>
          <script>
            require(['jquery', 'domReady!'], function($) {
              console.log("Magento Loaded");
            });
          </script>
        </body>
      </html>
    `,
		headers: {
			'set-cookie': 'frontend=abcdefg; Path=/; Secure',
		},
		expectedTech: 'Magento',
		minConfidence: 0.95,
		expectedPlugins: ['Magento Tax'],
	},
	{
		name: 'WooCommerce site (Body classes, parameters & dynamic WordPress plugins)',
		html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>WordPress Shop</title>
          <link rel="stylesheet" href="https://example.com/wp-content/plugins/woocommerce/assets/css/woocommerce.css">
          <link rel="stylesheet" href="https://example.com/wp-content/plugins/contact-form-7/includes/css/styles.css">
        </head>
        <body class="archive post-type-archive woocommerce woocommerce-page">
          <div class="product-item">WooCommerce Product</div>
          <script src="https://example.com/wp-content/plugins/wordfence/js/wordfence.js"></script>
          <script>
            var wc_add_to_cart_params = {"ajax_url":"/wp-admin/admin-ajax.php"};
          </script>
        </body>
      </html>
    `,
		headers: {},
		expectedTech: 'WooCommerce',
		minConfidence: 0.99,
		expectedPlugins: ['Contact Form 7', 'Wordfence'],
	},
	{
		name: 'PrestaShop site (Generator, prestashop global js & Blockcart module)',
		html: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>PrestaShop Store</title>
          <meta name="generator" content="PrestaShop">
        </head>
        <body>
          <img src="/img/p/12/12-medium_default.jpg">
          <script src="/modules/blockcart/blockcart.js"></script>
          <script>
            var prestashop = { "cart": {} };
          </script>
        </body>
      </html>
    `,
		headers: {},
		expectedTech: 'PrestaShop',
		minConfidence: 1.0,
		expectedPlugins: ['Blockcart'],
	},
	{
		name: 'VTEX site (CDN domains & Headers & classes)',
		html: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>VTEX Store</title>
          <link rel="stylesheet" href="https://example.vteximg.com.br/arquivos/vtex-style.css">
        </head>
        <body>
          <div class="vtex-store-components-3-x-container">
            <h1>VTEX E-Commerce</h1>
          </div>
          <script src="https://io.vtex.com.br/vtexjs/1.2.3/vtexjs.min.js"></script>
        </body>
      </html>
    `,
		headers: {
			server: 'VTEX',
			'x-vtex-api': 'active',
		},
		expectedTech: 'VTEX',
		minConfidence: 0.99,
		expectedPlugins: [],
	},
	{
		name: 'Generic non-ecommerce site',
		html: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Simple Personal Blog</title>
          <meta name="generator" content="Hexo">
        </head>
        <body>
          <h1>Welcome to my blog</h1>
        </body>
      </html>
    `,
		headers: {
			server: 'nginx',
		},
		expectedTech: null,
		minConfidence: 0,
		expectedPlugins: [],
	},
	{
		name: 'Shopify site theme detection (Dawn theme)',
		html: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dawn Theme Store</title>
          <meta name="generator" content="Shopify">
          <meta id="shopify-theme-name" content="Dawn">
        </head>
        <body>
          <h1>Dawn Theme Store</h1>
        </body>
      </html>
    `,
		headers: {
			'content-type': 'text/html',
		},
		expectedTech: 'Shopify',
		minConfidence: 0.99,
		expectedPlugins: [],
		expectedTheme: 'Dawn',
	},
	{
		name: 'Shopify site theme detection from script object (schema_name priority)',
		html: `
      <!DOCTYPE html>
      <html>
        <head>
          <title>My Store</title>
          <meta name="generator" content="Shopify">
          <script>
            var Shopify = Shopify || {};
            Shopify.theme = {"name":"My Custom Dawn Theme","id":120977834044,"theme_store_id":887,"role":"main","schema_name":"Dawn"};
          </script>
        </head>
        <body>
          <h1>Dawn Theme Store</h1>
        </body>
      </html>
    `,
		headers: {
			'content-type': 'text/html',
		},
		expectedTech: 'Shopify',
		minConfidence: 0.99,
		expectedPlugins: [],
		expectedTheme: 'Dawn',
	},
];

// Run the verification tests
console.log('=== Running E-Commerce Detector & Plugin Verification Tests ===\n');
let passed = 0;

for (const t of testCases) {
	try {
		const result = analyze(t.html, t.headers);

		const isTechMatch = result.technology === t.expectedTech;
		const isConfidenceMatch = result.confidence >= t.minConfidence;
		const isThemeMatch = t.expectedTheme ? result.theme === t.expectedTheme : true;

		// Verify plugins list
		const detectedPluginNames = result.plugins.map((p) => p.name);
		let pluginsMatch = true;
		for (const expectedPlg of t.expectedPlugins) {
			if (!detectedPluginNames.includes(expectedPlg)) {
				pluginsMatch = false;
				break;
			}
		}

		if (isTechMatch && isConfidenceMatch && pluginsMatch && isThemeMatch) {
			console.log(`✅ PASSED: ${t.name}`);
			let techDisplay = result.technology
				? `${result.technology} (Confidence: ${(result.confidence * 100).toFixed(2)}%)`
				: 'None';
			if (result.theme) {
				techDisplay += ` [Theme: ${result.theme}]`;
			}
			console.log(`   Detected: ${techDisplay}`);
			if (result.plugins.length > 0) {
				console.log(`   Plugins:  ${detectedPluginNames.join(', ')}`);
			}
			passed++;
		} else {
			console.log(`❌ FAILED: ${t.name}`);
			console.log(
				`   Expected: Tech: ${t.expectedTech} (Conf >= ${t.minConfidence}), Theme: ${t.expectedTheme || 'Any'}, Plugins: [${t.expectedPlugins.join(', ')}]`
			);
			console.log(
				`   Actual:   Tech: ${result.technology} (Conf: ${result.confidence}), Theme: ${result.theme || 'None'}, Plugins: [${detectedPluginNames.join(', ')}]`
			);
			console.log(`   Full Result:`, JSON.stringify(result, null, 2));
		}
	} catch (err) {
		console.error(`💥 CRASHED: ${t.name}`);
		console.error(err);
	}
	console.log('--------------------------------------------------');
}

console.log(`\nVerification finished: ${passed}/${testCases.length} tests passed.`);
if (passed !== testCases.length) {
	process.exit(1);
} else {
	console.log('All tests passed successfully! 🎉');
	process.exit(0);
}
