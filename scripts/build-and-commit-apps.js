import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, '..');
const techsDir = path.join(workspaceDir, 'techs');
const appsDir = path.join(techsDir, 'apps');
const testDir = path.join(workspaceDir, 'test', 'apps');
const indexPath = path.join(techsDir, 'index.json');
const mdAgregarPath = path.join(workspaceDir, 'md', 'agregar.md');
const mdAgregadasPath = path.join(workspaceDir, 'md', 'agregadas.md');

fs.mkdirSync(appsDir, { recursive: true });
fs.mkdirSync(testDir, { recursive: true });

// Read agregar.md table
const content = fs.readFileSync(mdAgregarPath, 'utf-8');
const lines = content.split('\n');
const tableLines = lines.filter(
	(l) => l.trim().startsWith('|') && !l.includes('---') && !l.includes('NOMBRE')
);

const items = tableLines.map((l) => {
	const sanitized = l.replace(/"\|"/g, '__PIPE__').replace(/\\\|/g, '__PIPE__');
	const parts = sanitized
		.split('|')
		.map((p) => p.trim().replace(/__PIPE__/g, '|'))
		.filter(Boolean);
	const name = parts[0];
	const shopifyUrl = parts[1];
	const logo = parts[2];
	const provider = parts[3];
	const slug = shopifyUrl.replace('https://apps.shopify.com/', '').replace(/\/$/, '');
	return { name, shopifyUrl, slug, logo, provider };
});

console.log(`Encontradas ${items.length} apps en ${mdAgregarPath}`);

// Helper to rebuild unified index
function rebuildIndex() {
	const loadFolderJson = (folderName) => {
		const folderPath = path.join(techsDir, folderName);
		const folderItems = [];
		if (fs.existsSync(folderPath)) {
			const files = fs.readdirSync(folderPath);
			files.forEach((file) => {
				if (file.endsWith('.json')) {
					try {
						const c = fs.readFileSync(path.join(folderPath, file), 'utf-8');
						folderItems.push(JSON.parse(c));
					} catch (e) {
						console.error(`Error loading ${file}:`, e.message);
					}
				}
			});
		}
		return folderItems;
	};

	const cms = loadFolderJson('cms');
	const apps = loadFolderJson('apps');
	const infra = loadFolderJson('infra');
	const gateways = loadFolderJson('gateways');
	const pixels = loadFolderJson('pixels');

	const indexData = { cms, apps, infra, gateways, pixels };
	fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
}

function getAppConfig(item) {
	const { name, slug, logo, provider } = item;
	let developer = name.split(/[:\-‑|]/)[0].trim();
	let category = 'Otros';
	let web = `https://apps.shopify.com/${slug}`;

	if (provider === 'logodev') {
		web = `https://${logo.replace(/\/$/, '')}`;
	}

	const lower = `${name.toLowerCase()} ${slug.toLowerCase()}`;

	if (lower.includes('hotjar')) {
		developer = 'Hotjar';
		category = 'Analítica';
		web = 'https://www.hotjar.com';
	} else if (lower.includes('widgetic')) {
		developer = 'Widgetic';
		if (lower.includes('countdown')) category = 'Checkout / Ofertas';
		else if (
			lower.includes('audio') ||
			lower.includes('video') ||
			lower.includes('gallery') ||
			lower.includes('slider') ||
			lower.includes('zoom') ||
			lower.includes('before and after') ||
			lower.includes('hotspots')
		)
			category = 'Constructor de Páginas';
		else if (lower.includes('social')) category = 'Marketing / Popups';
		else if (lower.includes('faq')) category = 'Soporte / Chat';
		else if (lower.includes('maps')) category = 'Otros';
		else category = 'Constructor de Páginas';
		web = 'https://widgetic.com';
	} else if (lower.includes('powr')) {
		developer = 'POWR';
		if (lower.includes('form') || lower.includes('contact')) category = 'Formularios / Contacto';
		else if (
			lower.includes('popup') ||
			lower.includes('notification') ||
			lower.includes('discount')
		)
			category = 'Marketing / Popups';
		else if (lower.includes('survey') || lower.includes('poll') || lower.includes('nps'))
			category = 'Formularios / Contacto';
		else if (lower.includes('countdown')) category = 'Checkout / Ofertas';
		else if (lower.includes('testimonials') || lower.includes('review')) category = 'Reseñas';
		else if (
			lower.includes('instafeed') ||
			lower.includes('instagram') ||
			lower.includes('social') ||
			lower.includes('youtube')
		)
			category = 'Analítica / Marketing';
		else if (lower.includes('faq') || lower.includes('chat')) category = 'Soporte / Chat';
		else if (lower.includes('pricing')) category = 'Checkout / Ofertas';
		else if (lower.includes('fomo') || lower.includes('stock')) category = 'Checkout / Ofertas';
		else category = 'Constructor de Páginas';
		web = 'https://www.powr.io';
	} else if (lower.includes('hulk')) {
		developer = 'HulkApps';
		if (lower.includes('form')) category = 'Formularios / Contacto';
		else if (lower.includes('option')) category = 'Checkout / Ofertas';
		else if (lower.includes('wishlist')) category = 'Fidelización / Lealtad';
		else if (lower.includes('bundle') || lower.includes('discount') || lower.includes('volume'))
			category = 'Checkout / Ofertas';
		else if (lower.includes('age') || lower.includes('verification')) category = 'Seguridad';
		else if (lower.includes('cookie') || lower.includes('gdpr')) category = 'Seguridad';
		else if (lower.includes('order') || lower.includes('tracking')) category = 'Envíos / Pedidos';
		else if (lower.includes('survey')) category = 'Formularios / Contacto';
		else if (lower.includes('mobile')) category = 'Constructor de Páginas';
		else category = 'Otros';
		web = 'https://www.hulkapps.com';
	} else if (lower.includes('pushdaddy') || lower.includes('pd ')) {
		developer = 'Pushdaddy';
		if (lower.includes('chat') || lower.includes('messenger')) category = 'Soporte / Chat';
		else if (lower.includes('countdown')) category = 'Checkout / Ofertas';
		else if (lower.includes('animator') || lower.includes('shaker'))
			category = 'Checkout / Ofertas';
		else if (lower.includes('push') || lower.includes('announcement'))
			category = 'Marketing / Popups';
		else if (lower.includes('cookie') || lower.includes('gdpr')) category = 'Seguridad';
		else if (lower.includes('image') || lower.includes('resize')) category = 'SEO';
		else category = 'Marketing / Popups';
		web = 'https://pushdaddy.com';
	} else if (lower.includes('mintt')) {
		developer = 'Mintt';
		if (lower.includes('feed') || lower.includes('tiktok')) category = 'Analítica / Marketing';
		else if (lower.includes('gift') || lower.includes('upsell') || lower.includes('bogo'))
			category = 'Checkout / Ofertas';
		else category = 'Marketing / Popups';
		web = 'https://mintt.co';
	} else if (lower.includes('shogun')) {
		developer = 'Shogun Labs Inc.';
		if (
			lower.includes('ab') ||
			lower.includes('a/b') ||
			lower.includes('testing') ||
			lower.includes('personalization')
		)
			category = 'A/B Testing / Optimización';
		else category = 'Constructor de Páginas';
		web = 'https://getshogun.com';
	} else if (lower.includes('vanchat')) {
		developer = 'VanChat';
		category = 'Soporte / Chat';
		web = 'https://vanchat.io';
	} else if (lower.includes('wisepops')) {
		developer = 'Wisepops';
		category = 'Marketing / Popups';
		web = 'https://wisepops.com';
	} else if (lower.includes('pickware')) {
		developer = 'Pickware';
		category = 'Inventario / Sincronización';
		web = 'https://pickware.com';
	} else if (lower.includes('recharge') || lower.includes('subscription-payments')) {
		developer = 'Recharge';
		category = 'Suscripciones';
		web = 'https://www.rechargepayments.com';
	} else if (lower.includes('subi')) {
		developer = 'Subi';
		category = 'Suscripciones';
		web = 'https://subi.co';
	} else if (lower.includes('globo') || lower.includes('product-personalizer')) {
		category = 'Checkout / Ofertas';
	} else if (
		lower.includes('popup') ||
		lower.includes('pop up') ||
		lower.includes('pop convert') ||
		lower.includes('poptin') ||
		lower.includes('exit intent')
	) {
		category = 'Marketing / Popups';
	} else if (lower.includes('social proof')) {
		category = 'Marketing / Popups';
	} else if (lower.includes('yeps')) {
		developer = 'Yeps';
		category = 'Marketing / Popups';
		web = 'https://yeps.io';
	} else if (lower.includes('mailmunch') || lower.includes('sendwill') || lower.includes('privy')) {
		category = 'Email Marketing';
	} else if (
		lower.includes('colissimo') ||
		lower.includes('chronopost') ||
		lower.includes('amazon') ||
		lower.includes('simple-reorder')
	) {
		category = 'Envíos / Pedidos';
	} else if (lower.includes('easylocation') || lower.includes('geopro')) {
		developer = 'Geo:Pro';
		category = 'Otros';
		web = 'https://geoproapp.com';
	} else if (lower.includes('fontify')) {
		developer = 'Fontify';
		category = 'Constructor de Páginas';
	} else if (lower.includes('currency')) {
		category = 'Otros';
	} else if (lower.includes('sheets')) {
		developer = 'Sheets Connector';
		category = 'Inventario / Sincronización';
	} else if (lower.includes('spartoo')) {
		developer = 'Spartoo';
		category = 'Envíos / Pedidos';
	} else if (lower.includes('way2enjoy')) {
		developer = 'Way2Enjoy';
		category = 'SEO';
	} else if (lower.includes('special-offers') || lower.includes('ultimate special offers')) {
		developer = 'Pixel Union';
		category = 'Checkout / Ofertas';
	}

	// Clean regex pattern
	const rawSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '');
	const patternParts = new Set([rawSlug]);
	if (rawSlug.includes('-')) {
		patternParts.add(rawSlug.replace(/-/g, '[_-]?'));
	}
	if (provider === 'logodev') {
		const domainClean = logo.replace(/\.[a-z]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '');
		if (domainClean && domainClean.length > 3) {
			patternParts.add(domainClean);
		}
	}
	const pattern = Array.from(patternParts).join('|');

	const appJson = {
		id: slug,
		name,
		developer,
		category,
		compatibleCMS: ['Shopify'],
		web,
		precios: [],
		appStores: [
			{
				cms: 'Shopify',
				link: slug,
			},
		],
		logo: {
			id: logo,
			provider: provider,
		},
		detectionRules: [
			{
				type: 'script-src',
				pattern: pattern,
				description: `Script o recurso de integración de ${name} detectado`,
			},
		],
	};

	const testJs = `import { analyze } from '../../src/detector.js';

const html = \`
<!DOCTYPE html>
<html>
  <head>
    <title>Test Store</title>
    <meta name="generator" content="Shopify">
    <script src="https://cdn.example.com/assets/${slug}.js"></script>
  </head>
  <body>
    <h1>Testing ${name.replace(/`/g, '\\`')}</h1>
  </body>
</html>
\`;

const result = analyze(html, { 'content-type': 'text/html' });
const detectedNames = (result.plugins || []).map((p) => p.name);

if (detectedNames.includes(${JSON.stringify(name)})) {
	console.log('✅ PASSED: ' + ${JSON.stringify(name)});
	process.exit(0);
} else {
	console.error('❌ FAILED: ' + ${JSON.stringify(name)} + ' not detected. Detected: ' + JSON.stringify(detectedNames));
	process.exit(1);
}
`;

	return { appJson, testJs, slug, name };
}

// Process all apps
let processed = 0;
for (const item of items) {
	const { appJson, testJs, slug, name } = getAppConfig(item);
	const appFilePath = path.join(appsDir, `${slug}.json`);
	const testFilePath = path.join(testDir, `test-${slug}.js`);

	fs.writeFileSync(appFilePath, JSON.stringify(appJson, null, '\t') + '\n', 'utf-8');
	fs.writeFileSync(testFilePath, testJs, 'utf-8');

	rebuildIndex();

	// Run test
	try {
		execSync(`node "test/apps/test-${slug}.js"`, {
			cwd: workspaceDir,
			stdio: 'pipe',
			env: { ...process.env, NODE_ENV: 'test' },
		});
	} catch (err) {
		console.error(`❌ Test failed for ${name} (${slug}):`, err.message);
		process.exit(1);
	}

	// Git add and commit
	const filesToStage = [`"${appFilePath}"`, `"${testFilePath}"`, `"${indexPath}"`];
	if (item.provider === 'local') {
		const possibleLogoPaths = [
			path.join(workspaceDir, 'public', 'brand', 'logo', 'apps', item.logo),
			path.join(workspaceDir, 'public', 'brand', 'logo', 'apps', `${item.logo}.png`),
			path.join(workspaceDir, 'public', 'brand', 'logo', 'apps', `${item.logo}.jpeg`),
			path.join(workspaceDir, 'public', 'brand', 'logo', 'apps', `${item.logo}.jpg`),
			path.join(workspaceDir, 'public', 'brand', 'logo', 'apps', `${item.logo}.svg`),
		];
		for (const p of possibleLogoPaths) {
			if (fs.existsSync(p)) {
				filesToStage.push(`"${p}"`);
			}
		}
	}

	const commitMsg = `feat(techs): agregar plantilla y test para ${name} en apps`;
	execSync(`git add ${filesToStage.join(' ')}`, {
		cwd: workspaceDir,
		stdio: 'pipe',
	});

	// Check if there are staged changes to commit
	const staged = execSync('git diff --cached --name-only', { cwd: workspaceDir }).toString();
	if (staged.trim().length > 0) {
		execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, {
			cwd: workspaceDir,
			stdio: 'pipe',
		});
		console.log(`[${++processed}/${items.length}] Committed: ${name}`);
	} else {
		console.log(`[${++processed}/${items.length}] Unchanged / Already committed: ${name}`);
	}
}

// Generate md/agregadas.md table
let mdTable = `# Tecnologías Añadidas al Scrapper

| NOMBRE | URL DE SHOPIFY | LOGO | PROVEEDOR |
| --- | --- | --- | --- |
`;

for (const item of items) {
	mdTable += `| ${item.name} | ${item.shopifyUrl} | ${item.logo} | ${item.provider} |\n`;
}

fs.writeFileSync(mdAgregadasPath, mdTable, 'utf-8');
console.log(`\n🎉 Todas las ${items.length} apps fueron procesadas, probadas y comiteadas.`);
