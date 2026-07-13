import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, '..');
const techsDir = path.join(workspaceDir, 'techs');

const indexPath = path.join(techsDir, 'index.json');

let cmsList = [];
let appsList = [];
let infraList = [];
let gatewaysList = [];

// Helper to safely load JSON files from a folder
function loadFolderJson(folderName) {
	const folderPath = path.join(techsDir, folderName);
	const items = [];
	if (fs.existsSync(folderPath)) {
		const files = fs.readdirSync(folderPath);
		files.forEach((file) => {
			if (file.endsWith('.json')) {
				try {
					const content = fs.readFileSync(path.join(folderPath, file), 'utf-8');
					const data = JSON.parse(content);
					items.push(data);
				} catch (err) {
					console.error(
						`[TechRulesLoader] Failed to parse JSON file ${file} in techs/${folderName}:`,
						err.message
					);
				}
			}
		});
	}
	return items;
}

// Generate the unified index.json file
export function buildIndex() {
	console.log('[TechRulesLoader] Generating unified techs index...');
	const cms = loadFolderJson('cms');
	const apps = loadFolderJson('apps');
	const infra = loadFolderJson('infra');
	const gateways = loadFolderJson('gateways');

	const indexData = { cms, apps, infra, gateways };
	try {
		fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
		console.log(`[TechRulesLoader] Unified index.json generated successfully at ${indexPath}`);
	} catch (err) {
		console.warn(`[TechRulesLoader] Skipping write of index.json (read-only FS): ${err.message}`);
	}
	return indexData;
}

// Load and compile all rules
export function loadAllTechRules() {
	const isDev =
		process.env.DEV === 'true' ||
		process.env.NODE_ENV === 'development' ||
		process.env.NODE_ENV === 'dev';
	let indexData;

	if (!isDev && fs.existsSync(indexPath)) {
		console.log('[TechRulesLoader] Loading rules from optimized index.json...');
		try {
			const content = fs.readFileSync(indexPath, 'utf-8');
			indexData = JSON.parse(content);
		} catch (err) {
			console.error('[TechRulesLoader] Failed to read index.json, rebuilding...', err.message);
			indexData = buildIndex();
		}
	} else {
		indexData = buildIndex();
	}

	cmsList = indexData.cms || [];
	appsList = indexData.apps || [];
	infraList = indexData.infra || [];
	gatewaysList = indexData.gateways || [];

	// Compile regex patterns for cms
	cmsList.forEach((cms) => {
		if (Array.isArray(cms.detectionRules)) {
			cms.detectionRules.forEach((rule) => {
				if (rule.pattern) {
					rule.regex = new RegExp(rule.pattern, 'i');
				}
			});
		}
	});

	// Compile regex patterns for apps
	appsList.forEach((app) => {
		if (Array.isArray(app.detectionRules)) {
			app.detectionRules.forEach((rule) => {
				if (rule.pattern) {
					rule.regex = new RegExp(rule.pattern, 'i');
				}
			});
		}
	});

	// Compile regex patterns for infra
	infraList.forEach((infra) => {
		if (Array.isArray(infra.detectionRules)) {
			infra.detectionRules.forEach((rule) => {
				if (rule.pattern) {
					rule.regex = new RegExp(rule.pattern, 'i');
				}
			});
		}
	});

	// Compile regex patterns for gateways
	gatewaysList.forEach((gw) => {
		if (Array.isArray(gw.detectionRules)) {
			gw.detectionRules.forEach((rule) => {
				if (rule.pattern) {
					rule.regex = new RegExp(rule.pattern, 'i');
				}
			});
		}
	});

	console.log(
		`[TechRulesLoader] Rules loaded and compiled: ${cmsList.length} CMS, ${appsList.length} Apps, ${infraList.length} Infra, ${gatewaysList.length} Gateways.`
	);
}

export function getCmsRules() {
	return cmsList;
}

export function getAppRules() {
	return appsList;
}

export function getInfraRules() {
	return infraList;
}

export function getGatewayRules() {
	return gatewaysList;
}

// Run initial load
loadAllTechRules();
