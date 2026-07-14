#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { detectTechnology } from '../../src/detector.js';

function askQuestion(query) {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	return new Promise((resolve) =>
		rl.question(query, (answer) => {
			rl.close();
			resolve(answer.trim());
		})
	);
}

// Load categories list
function loadCategories() {
	const categoriesPath = path.join(techsDir, 'categories.json');
	if (fs.existsSync(categoriesPath)) {
		try {
			return JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
		} catch (e) {
			console.error('Error al leer techs/categories.json, usando listado por defecto.', e.message);
		}
	}
	return ['Otros'];
}

function askCategoryInteractive(defaultCat) {
	const categories = loadCategories();
	let selectedIndex = categories.indexOf(defaultCat);
	if (selectedIndex === -1) selectedIndex = 0;

	return new Promise((resolve) => {
		// Hide cursor
		process.stdout.write('\x1b[?25l');

		const render = () => {
			console.log(
				'\n\x1b[36m%s\x1b[0m',
				'⌨  Use las flechas [↑/↓] para navegar, [Enter] para seleccionar:'
			);
			categories.forEach((cat, idx) => {
				if (idx === selectedIndex) {
					// Highlight selected option
					console.log(`\x1b[36m\x1b[1m >  ${cat} \x1b[0m`);
				} else {
					console.log(`    ${cat}`);
				}
			});
		};

		render();

		const onKeypress = (_str, key) => {
			if (!key) return;

			const linesToClear = categories.length + 2;
			readline.moveCursor(process.stdout, 0, -linesToClear);
			readline.clearScreenDown(process.stdout);

			if (key.name === 'up') {
				selectedIndex = (selectedIndex - 1 + categories.length) % categories.length;
				render();
			} else if (key.name === 'down') {
				selectedIndex = (selectedIndex + 1) % categories.length;
				render();
			} else if (key.name === 'return' || key.name === 'enter') {
				process.stdin.removeListener('keypress', onKeypress);
				// Restore cursor
				process.stdout.write('\x1b[?25h');

				const selection = categories[selectedIndex];
				console.log(`\x1b[32m✓ Categoría seleccionada: ${selection}\x1b[0m\n`);

				setTimeout(() => {
					if (process.stdin.isTTY) {
						process.stdin.setRawMode(false);
					}
					process.stdin.pause();
					resolve(selection);
				}, 50);
			} else if (key.ctrl && key.name === 'c') {
				process.stdin.removeListener('keypress', onKeypress);
				if (process.stdin.isTTY) {
					process.stdin.setRawMode(false);
				}
				process.stdin.pause();
				process.stdout.write('\x1b[?25h');
				console.log('\x1b[31mProceso cancelado.\x1b[0m');
				process.exit(0);
			} else {
				render();
			}
		};

		readline.emitKeypressEvents(process.stdin);
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
		}
		process.stdin.resume();
		process.stdin.on('keypress', onKeypress);
	});
}

function getCmsList() {
	const cmsFolder = path.join(techsDir, 'cms');
	const list = [];
	if (fs.existsSync(cmsFolder)) {
		fs.readdirSync(cmsFolder).forEach((file) => {
			if (file.endsWith('.json')) {
				try {
					const content = fs.readFileSync(path.join(cmsFolder, file), 'utf-8');
					const data = JSON.parse(content);
					if (data.name) list.push(data.name);
				} catch (_e) {
					list.push(file.replace('.json', '').toUpperCase());
				}
			}
		});
	}
	if (list.length === 0) {
		list.push('Shopify', 'Magento', 'WooCommerce', 'PrestaShop', 'VTEX');
	}
	return list;
}

function askCmsMultiSelect() {
	const cmsOptions = getCmsList();
	const selectedIndices = new Set([0]);
	let activeIndex = 0;

	return new Promise((resolve) => {
		// Hide cursor
		process.stdout.write('\x1b[?25l');

		const render = () => {
			console.log(
				'\n\x1b[36m%s\x1b[0m',
				'⌨  [↑/↓] Navegar, [Espacio] Seleccionar/Deseleccionar, [Enter] Confirmar:'
			);
			cmsOptions.forEach((cmsName, idx) => {
				const isSelected = selectedIndices.has(idx);
				const checkIcon = isSelected ? '[x]' : '[ ]';

				if (idx === activeIndex) {
					console.log(`\x1b[36m\x1b[1m >  ${checkIcon} ${cmsName} \x1b[0m`);
				} else {
					console.log(`    ${checkIcon} ${cmsName}`);
				}
			});
		};

		render();

		const onKeypress = (_str, key) => {
			if (!key) return;

			const linesToClear = cmsOptions.length + 2;
			readline.moveCursor(process.stdout, 0, -linesToClear);
			readline.clearScreenDown(process.stdout);

			if (key.name === 'up') {
				activeIndex = (activeIndex - 1 + cmsOptions.length) % cmsOptions.length;
				render();
			} else if (key.name === 'down') {
				activeIndex = (activeIndex + 1) % cmsOptions.length;
				render();
			} else if (key.name === 'space') {
				if (selectedIndices.has(activeIndex)) {
					selectedIndices.delete(activeIndex);
				} else {
					selectedIndices.add(activeIndex);
				}
				render();
			} else if (key.name === 'return' || key.name === 'enter') {
				process.stdin.removeListener('keypress', onKeypress);
				process.stdout.write('\x1b[?25h');

				if (selectedIndices.size === 0) {
					selectedIndices.add(0);
				}

				const selection = Array.from(selectedIndices)
					.map((idx) => cmsOptions[idx])
					.join(',');
				console.log(`\x1b[32m✓ CMS compatibles seleccionados: ${selection}\x1b[0m\n`);

				setTimeout(() => {
					if (process.stdin.isTTY) {
						process.stdin.setRawMode(false);
					}
					process.stdin.pause();
					resolve(selection);
				}, 50);
			} else if (key.ctrl && key.name === 'c') {
				process.stdin.removeListener('keypress', onKeypress);
				if (process.stdin.isTTY) {
					process.stdin.setRawMode(false);
				}
				process.stdin.pause();
				process.stdout.write('\x1b[?25h');
				console.log('\x1b[31mProceso cancelado.\x1b[0m');
				process.exit(0);
			} else {
				render();
			}
		};

		readline.emitKeypressEvents(process.stdin);
		if (process.stdin.isTTY) {
			process.stdin.setRawMode(true);
		}
		process.stdin.resume();
		process.stdin.on('keypress', onKeypress);
	});
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const techsDir = path.join(__dirname, '../../techs');
const templatesDir = path.join(__dirname, '../../templates');
const indexPath = path.join(techsDir, 'index.json');

const args = process.argv.slice(2);
const command = args[0];

// Help text
const helpText = `
\x1b[1m\x1b[35m╔══════════════════════════════════════════════════════════════╗\x1b[0m
\x1b[1m\x1b[35m║\x1b[0m  \x1b[1m\x1b[32m🤫 CHISMÓGRAFO\x1b[0m \x1b[90mv1.0\x1b[0m                                         \x1b[1m\x1b[35m║\x1b[0m
\x1b[1m\x1b[35m║\x1b[0m  \x1b[3m\x1b[33m¡El que todo lo sabe de tu competencia!\x1b[0m \x1b[33m⚡\x1b[0m                  \x1b[1m\x1b[35m║\x1b[0m
\x1b[1m\x1b[35m╚══════════════════════════════════════════════════════════════╝\x1b[0m

\x1b[1m\x1b[33m📣 Comandos para sacar el chisme:\x1b[0m
  \x1b[1m\x1b[36mdev\x1b[0m                                     Despierta el Chismógrafo Web para cotillear a gusto.
  
  \x1b[1m\x1b[36mtest-domain\x1b[0m \x1b[33m<url>\x1b[0m                         Saca el expediente chismoso completo de un sitio web.
    \x1b[90m--attr <propiedad>                    Filtra solo el chisme que te interesa.
                                           Valores: cms, theme, plugins, infrastructure, location.\x1b[0m

\x1b[1m\x1b[33m🗂  Comandos para armar el catálogo de chismes:\x1b[0m
  \x1b[1m\x1b[36mbuild-index\x1b[0m                               Empaqueta todo el catálogo de chismes en index.json.
    \x1b[90m--category <categoria>                Filtra por categoría de chisme.
    \x1b[90m--cms <cms>                           Filtra las apps compatibles con este CMS.\x1b[0m

  \x1b[1m\x1b[36mvalidate-index\x1b[0m                            Revisa que index.json no tenga chismes rotos o inventados.
  \x1b[1m\x1b[36mcheck-tech\x1b[0m \x1b[33m<ruta_archivo>\x1b[0m                 Audita que una firma JSON esté bien armada.

\x1b[1m\x1b[33m📝 Comandos para registrar nuevos chismes:\x1b[0m
  \x1b[1m\x1b[36madd-cms\x1b[0m \x1b[33m<nombre> [opciones]\x1b[0m              Registra un nuevo CMS en el expediente.
    \x1b[90m--web <url>                           URL del sitio web del CMS.
    \x1b[90m--logo <logo>                         Logo identificador (ej. shopify.com).\x1b[0m

  \x1b[1m\x1b[36madd-app\x1b[0m \x1b[33m<nombre> [opciones]\x1b[0m              Agrega una nueva app/plugin al radar del Chismógrafo.
    \x1b[90m--category <categoria>                Categoría de la app (Por defecto: Otros).
    \x1b[90m--cms <cms>                           CMS compatibles (separados por comas).
    \x1b[90m--links <links>                       Links de la tienda de apps.
    \x1b[90m--web <url>                           URL oficial de la app.
    \x1b[90m--logo <logo>                         Logo de la app (ej. loox.app).\x1b[0m

  \x1b[1m\x1b[36madd-infra\x1b[0m \x1b[33m<nombre> [opciones]\x1b[0m            Ficha un nuevo elemento de infraestructura.
    \x1b[90m--category <categoria>                Categoría del elemento (Por defecto: CDN / Proxy).
    \x1b[90m--web <url>                           URL oficial del proveedor.
    \x1b[90m--logo <logo>                         Logo de la infraestructura.\x1b[0m

  \x1b[1m\x1b[36madd-gateway\x1b[0m \x1b[33m<nombre> [opciones]\x1b[0m          Registra una nueva pasarela de pago en el archivo.
    \x1b[90m--web <url>                           URL del sitio de la pasarela.
    \x1b[90m--logo <logo>                         Logo de la pasarela (ej. stripe.com).\x1b[0m

  \x1b[1m\x1b[36mversion, --version, -v\x1b[0m                 Muestra la versión actual del Chismógrafo.

\x1b[90m  Uso: chismografo <comando> [argumentos] [opciones]\x1b[0m
`;

function getOption(flag) {
	const idx = args.indexOf(flag);
	if (idx !== -1 && idx + 1 < args.length) {
		return args[idx + 1];
	}
	return null;
}

function toSlug(name) {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

// 0. Command: version / --version / -v / -V
if (
	command === 'version' ||
	command === '--version' ||
	command === '-v' ||
	command === '-V' ||
	args.includes('--version') ||
	args.includes('-v')
) {
	let versions = { cli: '1.0.0', ui: '1.0.0', api: '1.0.0' };
	const versionPath = path.join(__dirname, '../../version.json');
	if (fs.existsSync(versionPath)) {
		try {
			versions = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
		} catch (_e) {}
	}

	const hasCli = args.includes('--cli') || args.includes('-c');
	const hasUi = args.includes('--ui') || args.includes('-u');
	const hasApi = args.includes('--api') || args.includes('-a');

	if (hasCli) {
		console.log(versions.cli);
	} else if (hasUi) {
		console.log(versions.ui);
	} else if (hasApi) {
		console.log(versions.api);
	} else {
		console.log('\x1b[1m\x1b[32m🤫 Chismógrafo\x1b[0m');
		console.log(`  \x1b[36mCLI:\x1b[0m v${versions.cli}`);
		console.log(`  \x1b[36mInterfaz (UI):\x1b[0m v${versions.ui}`);
		console.log(`  \x1b[36mAPI REST:\x1b[0m v${versions.api}`);
	}
	process.exit(0);
}

// 1. Command: dev
if (command === 'dev') {
	console.log(
		'\x1b[36m%s\x1b[0m',
		'🤫 Psst... El Chismógrafo Web se está despertando (modo watch)...'
	);
	const child = spawn('node', ['--watch', 'server.js'], {
		stdio: 'inherit',
		env: { ...process.env, DEV: 'true', NODE_ENV: 'development' },
	});
	child.on('close', (code) => {
		process.exit(code);
	});
}

// 2. Command: build-index
else if (command === 'build-index') {
	const categoryFilter = getOption('--category');
	const cmsFilter = getOption('--cms');

	console.log(
		'\x1b[36m%s\x1b[0m',
		'🤫 El Chismógrafo está recopilando y empaquetando todos los expedientes en index.json...'
	);

	try {
		const loadFolder = (folderName) => {
			const folderPath = path.join(techsDir, folderName);
			const items = [];
			if (fs.existsSync(folderPath)) {
				fs.readdirSync(folderPath).forEach((file) => {
					if (file.endsWith('.json')) {
						const content = fs.readFileSync(path.join(folderPath, file), 'utf-8');
						items.push(JSON.parse(content));
					}
				});
			}
			return items;
		};

		const cms = loadFolder('cms');
		let apps = loadFolder('apps');
		let infra = loadFolder('infra');
		let gateways = loadFolder('gateways');

		// Apply CMS filter (filters apps compatible with the CMS)
		if (cmsFilter) {
			console.log(`  🔎 Filtrando chismes de apps compatibles con: ${cmsFilter}`);
			const cmsLower = cmsFilter.toLowerCase();
			apps = apps.filter(
				(app) =>
					Array.isArray(app.compatibleCMS) &&
					app.compatibleCMS.some((c) => c.toLowerCase() === cmsLower)
			);
		}

		// Apply Category filter
		if (categoryFilter) {
			console.log(`  🔎 Filtrando expedientes por categoría: ${categoryFilter}`);
			const catLower = categoryFilter.toLowerCase();
			apps = apps.filter((app) => app.category?.toLowerCase().includes(catLower));
			infra = infra.filter((inf) => inf.category?.toLowerCase().includes(catLower));
			gateways = gateways.filter((gw) => gw.category?.toLowerCase().includes(catLower));
		}

		const indexData = { cms, apps, infra, gateways };

		// Compress/Minify output (no spaces/newlines in JSON.stringify)
		fs.writeFileSync(indexPath, JSON.stringify(indexData), 'utf-8');

		console.log(
			'\x1b[32m%s\x1b[0m',
			`✓ ¡Expediente listo! El Chismógrafo compiló index.json en ${indexPath}`
		);
		console.log(
			`  📊 Resumen del cotilleo: ${cms.length} CMS, ${apps.length} Apps, ${infra.length} Infraestructuras y ${gateways.length} Pasarelas fichadas.`
		);
	} catch (err) {
		console.error(
			'\x1b[31m%s\x1b[0m',
			'✗ ¡Chisme fallido! Error al compilar index.json:',
			err.message
		);
		process.exit(1);
	}
}

// 3. Command: validate-index
else if (command === 'validate-index') {
	console.log(
		'\x1b[36m%s\x1b[0m',
		'🔍 El Chismógrafo está verificando que index.json no tenga chismes inventados ni rotos...'
	);
	if (!fs.existsSync(indexPath)) {
		console.error(
			'\x1b[31m%s\x1b[0m',
			'✗ ¡No hay expediente! El catálogo techs/index.json no existe. Corre "chismografo build-index" primero.'
		);
		process.exit(1);
	}

	try {
		const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
		const errors = [];

		if (!Array.isArray(data.cms)) errors.push('El campo "cms" debe ser un arreglo.');
		if (!Array.isArray(data.apps)) errors.push('El campo "apps" debe ser un arreglo.');
		if (!Array.isArray(data.infra)) errors.push('El campo "infra" debe ser un arreglo.');

		if (errors.length > 0) {
			errors.forEach((err) => {
				console.error('\x1b[31m%s\x1b[0m', `  - ${err}`);
			});
			process.exit(1);
		}

		console.log(
			'\x1b[32m%s\x1b[0m',
			'✓ ¡Expediente limpio! El Chismógrafo confirma que index.json no tiene chismes rotos.'
		);
	} catch (err) {
		console.error(
			'\x1b[31m%s\x1b[0m',
			'✗ ¡Chisme corrupto! Error al validar index.json:',
			err.message
		);
		process.exit(1);
	}
}

// 4. Command: check-tech
else if (command === 'check-tech') {
	const filepath = args[1];
	if (!filepath) {
		console.error('\x1b[31m%s\x1b[0m', '✗ Debes proporcionar la ruta al archivo JSON.');
		process.exit(1);
	}

	const absolutePath = path.resolve(filepath);
	console.log(
		'\x1b[36m%s\x1b[0m',
		`🔍 El Chismógrafo está auditando la firma en ${absolutePath}...`
	);

	if (!fs.existsSync(absolutePath)) {
		console.error('\x1b[31m%s\x1b[0m', '✗ El archivo no existe.');
		process.exit(1);
	}

	try {
		const app = JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
		const errors = [];

		if (typeof app.name !== 'string' || !app.name)
			errors.push('Falta o es inválido: "name" (string)');
		if (typeof app.category !== 'string' || !app.category)
			errors.push('Falta o es inválido: "category" (string)');
		if (!Array.isArray(app.detectionRules) || app.detectionRules.length === 0) {
			errors.push('Falta o es vacío: "detectionRules" (array)');
		} else {
			app.detectionRules.forEach((rule, idx) => {
				if (!rule.type) errors.push(`Regla #${idx}: Falta "type"`);
				if (!rule.pattern) errors.push(`Regla #${idx}: Falta "pattern"`);
			});
		}

		if (errors.length > 0) {
			console.error('\x1b[31m%s\x1b[0m', '✗ Errores de validación en la firma:');
			errors.forEach((err) => {
				console.error(`  - ${err}`);
			});
			process.exit(1);
		}

		console.log(
			'\x1b[32m%s\x1b[0m',
			'✓ ¡Firma verificada! El Chismógrafo confirma que la estructura es correcta.'
		);
	} catch (err) {
		console.error('\x1b[31m%s\x1b[0m', '✗ Error al analizar el archivo JSON:', err.message);
		process.exit(1);
	}
}

// 5. Command: add-app
else if (command === 'add-app') {
	let name = args[1];
	let category = getOption('--category');
	let cmsInput = getOption('--cms');
	let webVal = getOption('--web');
	let logoVal = getOption('--logo');
	let linksInput = getOption('--links');

	if (!name) {
		console.log(
			'\x1b[36m%s\x1b[0m',
			'🎮 El Chismógrafo abre el creador interactivo de expedientes para Apps...'
		);
		name = await askQuestion('1. Nombre de la aplicación: ');
		if (!name) {
			console.error('\x1b[31m%s\x1b[0m', '✗ El nombre es obligatorio.');
			process.exit(1);
		}
		const tempSlug = toSlug(name);
		category = await askCategoryInteractive('Otros');
		cmsInput = await askCmsMultiSelect();
		webVal =
			(await askQuestion(`4. URL de la Web [https://www.${tempSlug}.com]: `)) ||
			`https://www.${tempSlug}.com`;

		const selectedCmsList = cmsInput.split(',').map((c) => c.trim());
		const linksArray = [];
		console.log('\n🔗 Configurando enlaces de App Stores para cada CMS seleccionado:');
		for (const cmsName of selectedCmsList) {
			const link = await askQuestion(
				`   - Enlace para la tienda de ${cmsName} (deja vacío si no tiene): `
			);
			linksArray.push(link);
		}
		linksInput = linksArray.join(',');

		logoVal =
			(await askQuestion(`6. Identificador de Logo [${tempSlug}.com]: `)) || `${tempSlug}.com`;
	} else {
		category = category || 'Otros';
		cmsInput = cmsInput || 'Shopify';
		const tempSlug = toSlug(name);
		webVal = webVal || `https://www.${tempSlug}.com`;
		logoVal = logoVal || `${tempSlug}.com`;
		linksInput = linksInput || '';
	}

	const slug = toSlug(name);
	const cmsList = cmsInput.split(',').map((c) => c.trim());
	const linksList = linksInput ? linksInput.split(',').map((l) => l.trim()) : [];
	const targetPath = path.join(techsDir, 'apps', `${slug}.json`);

	console.log('\x1b[36m%s\x1b[0m', `📝 El Chismógrafo está fichando la App: ${name}...`);

	const compatibleCMS = cmsList;
	const appStores = cmsList.map((cmsName, idx) => {
		const link = linksList[idx] || '';
		return { cms: cmsName, link };
	});

	const templatePath = path.join(templatesDir, 'app.json');
	try {
		let templateStr = fs.readFileSync(templatePath, 'utf-8');
		templateStr = templateStr
			.replace(/\{\{name\}\}/g, name)
			.replace(/\{\{developer\}\}/g, name)
			.replace(/\{\{category\}\}/g, category)
			.replace(/\{\{slug\}\}/g, slug)
			.replace(/\{\{web\}\}/g, webVal)
			.replace(/\{\{logo\}\}/g, logoVal)
			.replace(/"\{\{compatibleCMS\}\}"/g, JSON.stringify(compatibleCMS))
			.replace(/"\{\{appStores\}\}"/g, JSON.stringify(appStores));

		const template = JSON.parse(templateStr);

		fs.mkdirSync(path.dirname(targetPath), { recursive: true });
		fs.writeFileSync(targetPath, JSON.stringify(template, null, 2), 'utf-8');
		console.log(
			'\x1b[32m%s\x1b[0m',
			`✓ ¡Fichada! El Chismógrafo guardó el expediente de la App en ${targetPath}`
		);
	} catch (err) {
		console.error('\x1b[31m%s\x1b[0m', '✗ ¡Chisme fallido! Error al fichar la app:', err.message);
		process.exit(1);
	}
}

// 6. Command: add-infra
else if (command === 'add-infra') {
	let name = args[1];
	let category = getOption('--category');
	let webVal = getOption('--web');
	let logoVal = getOption('--logo');

	if (!name) {
		console.log(
			'\x1b[36m%s\x1b[0m',
			'🎮 El Chismógrafo abre el creador interactivo de expedientes para Infraestructura...'
		);
		name = await askQuestion('1. Nombre de la infraestructura: ');
		if (!name) {
			console.error('\x1b[31m%s\x1b[0m', '✗ El nombre es obligatorio.');
			process.exit(1);
		}
		const tempSlug = toSlug(name);
		category = await askCategoryInteractive('CDN / Proxy');
		webVal =
			(await askQuestion(`3. URL de la Web [https://www.${tempSlug}.com]: `)) ||
			`https://www.${tempSlug}.com`;
		logoVal =
			(await askQuestion(`4. Identificador de Logo [${tempSlug}.com]: `)) || `${tempSlug}.com`;
	} else {
		category = category || 'CDN / Proxy';
		const tempSlug = toSlug(name);
		webVal = webVal || `https://www.${tempSlug}.com`;
		logoVal = logoVal || `${tempSlug}.com`;
	}

	const slug = toSlug(name);
	const targetPath = path.join(techsDir, 'infra', `${slug}.json`);

	console.log(
		'\x1b[36m%s\x1b[0m',
		`📝 El Chismógrafo está fichando la Infraestructura: ${name}...`
	);

	const templatePath = path.join(templatesDir, 'infra.json');
	try {
		let templateStr = fs.readFileSync(templatePath, 'utf-8');
		templateStr = templateStr
			.replace(/\{\{name\}\}/g, name)
			.replace(/\{\{category\}\}/g, category)
			.replace(/\{\{slug\}\}/g, slug)
			.replace(/\{\{web\}\}/g, webVal)
			.replace(/\{\{logo\}\}/g, logoVal);

		const template = JSON.parse(templateStr);

		fs.mkdirSync(path.dirname(targetPath), { recursive: true });
		fs.writeFileSync(targetPath, JSON.stringify(template, null, 2), 'utf-8');
		console.log(
			'\x1b[32m%s\x1b[0m',
			`✓ ¡Fichada! El Chismógrafo guardó el expediente de Infraestructura en ${targetPath}`
		);
	} catch (err) {
		console.error(
			'\x1b[31m%s\x1b[0m',
			'✗ ¡Chisme fallido! Error al fichar infraestructura:',
			err.message
		);
		process.exit(1);
	}
}

// 7. Command: add-cms
else if (command === 'add-cms') {
	let name = args[1];
	let webVal = getOption('--web');
	let logoVal = getOption('--logo');

	if (!name) {
		console.log(
			'\x1b[36m%s\x1b[0m',
			'🎮 El Chismógrafo abre el creador interactivo de expedientes para CMS...'
		);
		name = await askQuestion('1. Nombre del CMS: ');
		if (!name) {
			console.error('\x1b[31m%s\x1b[0m', '✗ El nombre es obligatorio.');
			process.exit(1);
		}
		const tempSlug = toSlug(name);
		webVal =
			(await askQuestion(`2. URL de la Web [https://www.${tempSlug}.com]: `)) ||
			`https://www.${tempSlug}.com`;
		logoVal =
			(await askQuestion(`3. Identificador de Logo [${tempSlug}.com]: `)) || `${tempSlug}.com`;
	} else {
		const tempSlug = toSlug(name);
		webVal = webVal || `https://www.${tempSlug}.com`;
		logoVal = logoVal || `${tempSlug}.com`;
	}

	const slug = toSlug(name);
	const targetPath = path.join(techsDir, 'cms', `${slug}.json`);

	console.log('\x1b[36m%s\x1b[0m', `📝 El Chismógrafo está fichando el CMS: ${name}...`);

	const templatePath = path.join(templatesDir, 'cms.json');
	try {
		let templateStr = fs.readFileSync(templatePath, 'utf-8');
		templateStr = templateStr
			.replace(/\{\{name\}\}/g, name)
			.replace(/\{\{slug\}\}/g, slug)
			.replace(/\{\{web\}\}/g, webVal)
			.replace(/\{\{logo\}\}/g, logoVal);

		const template = JSON.parse(templateStr);

		fs.mkdirSync(path.dirname(targetPath), { recursive: true });
		fs.writeFileSync(targetPath, JSON.stringify(template, null, 2), 'utf-8');
		console.log(
			'\x1b[32m%s\x1b[0m',
			`✓ ¡Fichado! El Chismógrafo guardó el expediente del CMS en ${targetPath}`
		);
	} catch (err) {
		console.error('\x1b[31m%s\x1b[0m', '✗ ¡Chisme fallido! Error al fichar CMS:', err.message);
		process.exit(1);
	}
}

// 7b. Command: add-gateway
else if (command === 'add-gateway') {
	let name = args[1];
	let webVal = getOption('--web');
	let logoVal = getOption('--logo');

	if (!name) {
		console.log(
			'\x1b[36m%s\x1b[0m',
			'🎮 El Chismógrafo abre el creador interactivo de expedientes para Pasarela de Pago...'
		);
		name = await askQuestion('1. Nombre de la pasarela: ');
		if (!name) {
			console.error('\x1b[31m%s\x1b[0m', '✗ El nombre es obligatorio.');
			process.exit(1);
		}
		const tempSlug = toSlug(name);
		webVal =
			(await askQuestion(`2. URL de la Web [https://www.${tempSlug}.com]: `)) ||
			`https://www.${tempSlug}.com`;
		logoVal =
			(await askQuestion(`3. Identificador de Logo [${tempSlug}.com]: `)) || `${tempSlug}.com`;
	} else {
		const tempSlug = toSlug(name);
		webVal = webVal || `https://www.${tempSlug}.com`;
		logoVal = logoVal || `${tempSlug}.com`;
	}

	const slug = toSlug(name);
	const targetPath = path.join(techsDir, 'gateways', `${slug}.json`);

	console.log(
		'\x1b[36m%s\x1b[0m',
		`📝 El Chismógrafo está fichando la Pasarela de Pago: ${name}...`
	);

	const templatePath = path.join(templatesDir, 'gateway.json');
	try {
		let templateStr = fs.readFileSync(templatePath, 'utf-8');
		templateStr = templateStr
			.replace(/\{\{name\}\}/g, name)
			.replace(/\{\{slug\}\}/g, slug)
			.replace(/\{\{web\}\}/g, webVal)
			.replace(/\{\{logo\}\}/g, logoVal)
			.replace(/\{\{scriptPattern\}\}/g, `${slug}\\\\.js`)
			.replace(/\{\{htmlPattern\}\}/g, `\\\\b${slug}\\\\b`);

		const template = JSON.parse(templateStr);

		fs.mkdirSync(path.dirname(targetPath), { recursive: true });
		fs.writeFileSync(targetPath, JSON.stringify(template, null, 2), 'utf-8');
		console.log(
			'\x1b[32m%s\x1b[0m',
			`✓ ¡Fichada! El Chismógrafo guardó el expediente de la Pasarela de Pago en ${targetPath}`
		);
	} catch (err) {
		console.error(
			'\x1b[31m%s\x1b[0m',
			'✗ ¡Chisme fallido! Error al fichar Pasarela de Pago:',
			err.message
		);
		process.exit(1);
	}
}

// 8. Command: test-domain
else if (command === 'test-domain') {
	let url = args[1];
	if (!url) {
		console.log(
			'\x1b[36m%s\x1b[0m',
			'🎮 El Chismógrafo inicia investigación interactiva de dominio...'
		);
		url = await askQuestion('🤫 ¿A quién le quieres sacar el chisme? (URL o Dominio): ');
		if (!url) {
			console.error(
				'\x1b[31m%s\x1b[0m',
				'✗ ¡Sin chisme! Necesitas dar una URL o Dominio para investigar.'
			);
			process.exit(1);
		}
	}

	// Normalize URL
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		url = `https://${url}`;
	}

	console.log('\x1b[36m%s\x1b[0m', `🤫 El Chismógrafo está investigando: ${url}...`);

	try {
		const result = await detectTechnology(url);
		if (!result.success) {
			console.error(
				'\x1b[31m%s\x1b[0m',
				`✗ ¡Investigación fallida! El Chismógrafo no pudo analizar el sitio: ${result.error}`
			);
			process.exit(1);
		}

		// Single attribute printing override
		const attr = getOption('--attr');
		if (attr) {
			let targetAttr = attr;
			if (attr === 'cms') targetAttr = 'technology';
			if (attr === 'apps') targetAttr = 'plugins';
			if (attr === 'paymentProcessors') targetAttr = 'paymentGateways';

			if (result[targetAttr] !== undefined) {
				if (Array.isArray(result[targetAttr])) {
					if (result[targetAttr].length > 0 && typeof result[targetAttr][0] === 'object') {
						console.log(result[targetAttr].map((item) => item.name).join(', '));
					} else {
						console.log(result[targetAttr].join(', '));
					}
				} else if (typeof result[targetAttr] === 'object') {
					console.log(JSON.stringify(result[targetAttr]));
				} else {
					console.log(result[targetAttr]);
				}
			} else {
				console.log('');
			}
			process.exit(0);
		}

		console.log('\n\x1b[35m%s\x1b[0m', '╔══════════════════════════════════════════════════╗');
		console.log('\x1b[35m\x1b[1m%s\x1b[0m', `║ 🤫 EXPEDIENTE CHISMOSO DE: ${url}`);
		console.log('\x1b[35m%s\x1b[0m', '╚══════════════════════════════════════════════════╝\n');

		// 1. CMS
		if (result.detected && result.technology) {
			const themeText = result.theme ? ` (Tema: ${result.theme})` : '';
			console.log('\x1b[36m\x1b[1m%s\x1b[0m', '📦 Plataforma E-Commerce (CMS):');
			console.log(
				`   💡 Usa ${result.technology} (Certeza del chisme: ${(result.confidence * 100).toFixed(2)}%)${themeText}\n`
			);
		} else {
			console.log('\x1b[36m\x1b[1m%s\x1b[0m', '📦 Plataforma E-Commerce (CMS):');
			console.log('   🤷 No se le encontró plataforma conocida... ¡qué misterio!\n');
		}

		// 2. Apps
		console.log('\x1b[36m\x1b[1m%s\x1b[0m', '🔌 Apps y Plugins que le cachamos:');
		if (result.plugins && result.plugins.length > 0) {
			result.plugins.forEach((app) => {
				console.log(
					`   🔎 [${app.category || 'Plugin'}] ${app.name} (por: ${app.developer || 'Desconocido'})`
				);
			});
			console.log('');
		} else {
			console.log('   🤷 No le encontramos apps... ¡anda bien discreto!\n');
		}

		// 3. Infrastructure
		console.log('\x1b[36m\x1b[1m%s\x1b[0m', '🌐 Infraestructura que le pillamos:');
		if (result.infrastructure && result.infrastructure.length > 0) {
			result.infrastructure.forEach((infra) => {
				console.log(`   🔎 [${infra.category}] ${infra.name}`);
			});
			console.log('');
		} else {
			console.log('   🤷 No se le cachó infraestructura conocida.\n');
		}

		// 4. Payment Gateways
		console.log('\x1b[36m\x1b[1m%s\x1b[0m', '💳 Pasarelas de Pago que le descubrimos:');
		if (result.paymentGateways && result.paymentGateways.length > 0) {
			console.log(`   🔎 ${result.paymentGateways.join(', ')}\n`);
		} else {
			console.log('   🤷 No se le vieron pasarelas de pago en portada.\n');
		}

		// 5. Payment Methods
		console.log('\x1b[36m\x1b[1m%s\x1b[0m', '💵 Métodos de Pago que se le notan:');
		if (result.paymentGateways && result.paymentGateways.length > 0) {
			console.log(`   🔎 ${result.paymentGateways.join(', ')}\n`);
		} else {
			console.log('   🤷 No se le infirieron métodos de pago... ¡bien guardadito!\n');
		}

		console.log('\x1b[35m%s\x1b[0m', '══════════════════════════════════════════════════\n');
		console.log('\x1b[90m%s\x1b[0m', '  🤫 Chisme cortesía del Chismógrafo.\n');
	} catch (err) {
		console.error(
			'\x1b[31m%s\x1b[0m',
			'✗ ¡Ups! El Chismógrafo tropezó durante la investigación:',
			err.message
		);
		process.exit(1);
	}
}

// Default / Help
else {
	console.log(helpText);
}
