import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const versionPath = path.join(rootDir, 'version.json');

// Definition of components, their conventional commit scopes and file path patterns
const COMPONENT_DEFINITIONS = {
	cli: {
		name: 'CLI (Terminal)',
		scopes: ['cli', 'terminal', 'console', 'bin'],
		patterns: [/^cli\//],
	},
	ui: {
		name: 'Frontend (UI)',
		scopes: ['ui', 'frontend', 'front', 'web', 'client', 'design', 'css', 'html', 'widget'],
		patterns: [/^public\//, /^templates\/.*\.html$/],
	},
	api: {
		name: 'Backend (API & Techs)',
		scopes: [
			'api',
			'backend',
			'back',
			'server',
			'core',
			'detector',
			'scraper',
			'email',
			'routes',
			'service',
			'techs',
			'tech',
		],
		patterns: [
			/^server\.js$/,
			/^api\//,
			/^src\//,
			/^techs\//,
			/^test\//,
			/^test-detector\.js$/,
			/^vercel\.json$/,
			/^Procfile$/,
		],
	},
};

const BUMP_PRECEDENCE = {
	none: 0,
	patch: 1,
	minor: 2,
	major: 3,
};

function parseSemver(ver) {
	const clean = String(ver).trim().replace(/^v/, '');
	const match = clean.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
	if (!match) return { major: 1, minor: 0, patch: 0, raw: clean };
	return {
		major: Number.parseInt(match[1], 10),
		minor: Number.parseInt(match[2], 10),
		patch: Number.parseInt(match[3], 10),
		prerelease: match[4] || null,
		raw: clean,
	};
}

function bumpVersion(currentVer, bumpType) {
	const parsed = parseSemver(currentVer);
	if (bumpType === 'major') {
		return `${parsed.major + 1}.0.0`;
	}
	if (bumpType === 'minor') {
		return `${parsed.major}.${parsed.minor + 1}.0`;
	}
	if (bumpType === 'patch') {
		return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
	}
	return parsed.raw;
}

function getExistingVersions() {
	if (fs.existsSync(versionPath)) {
		try {
			const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
			return {
				cli: data.cli || '1.0.0',
				ui: data.ui || '1.0.0',
				api: data.api || '1.0.0',
			};
		} catch (_e) {}
	}
	return { cli: '1.0.0', ui: '1.0.0', api: '1.0.0' };
}

function runGit(cmd) {
	try {
		return execSync(cmd, {
			cwd: rootDir,
			encoding: 'utf-8',
			stdio: ['pipe', 'pipe', 'ignore'],
		}).trim();
	} catch (_e) {
		return '';
	}
}

function getLatestTag() {
	const describeTag = runGit('git describe --tags --abbrev=0');
	if (describeTag) return describeTag;

	const allTags = runGit('git tag --sort=-v:refname');
	if (allTags) {
		const firstTag = allTags.split('\n')[0].trim();
		if (firstTag) return firstTag;
	}
	return null;
}

function getCommits(fromRef, toRef = 'HEAD') {
	const range = fromRef ? `${fromRef}..${toRef}` : toRef;
	// Format: %H (hash), %s (subject), %b (body) separated by null bytes and newlines
	const logOutput = runGit(`git log ${range} --format="%H%x1f%s%x1f%b%x1e"`);
	if (!logOutput) return [];

	const rawCommits = logOutput.split('\x1e').filter((c) => c.trim().length > 0);
	const commits = [];

	for (const raw of rawCommits) {
		const parts = raw.split('\x1f');
		const hash = parts[0]?.trim() || '';
		const subject = parts[1]?.trim() || '';
		const body = parts[2]?.trim() || '';

		if (!hash) continue;

		// Get changed files for this commit
		const filesOutput = runGit(`git diff-tree --no-commit-id --name-only -r ${hash}`);
		const files = filesOutput
			.split('\n')
			.map((f) => f.trim())
			.filter(Boolean);

		commits.push({ hash, subject, body, files });
	}

	return commits;
}

function analyzeCommit(commit) {
	const { subject, body, files } = commit;
	const fullMessage = `${subject}\n${body}`;

	// 1. Determine bump type
	let bumpType = 'none';
	const isBreaking =
		/BREAKING[- ]CHANGE:/i.test(fullMessage) || /^[a-z]+(\([^)]+\))?!:/i.test(subject);

	if (isBreaking) {
		bumpType = 'major';
	} else if (/^feat(\([^)]+\))?:/i.test(subject)) {
		bumpType = 'minor';
	} else if (/^(fix|perf|refactor|style|revert|deps)(\([^)]+\))?:/i.test(subject)) {
		bumpType = 'patch';
	} else if (/^(chore|docs|test)(\([^)]+\))?:/i.test(subject)) {
		// Only consider chore/docs/test as patch if it directly modifies component code files
		const hasCodeFiles = files.some(
			(f) =>
				f.startsWith('cli/') ||
				f.startsWith('public/') ||
				f.startsWith('src/') ||
				f.startsWith('techs/') ||
				f.startsWith('api/') ||
				f === 'server.js'
		);
		if (hasCodeFiles) {
			bumpType = 'patch';
		}
	}

	// 2. Extract commit scope
	const scopeMatch = subject.match(/^[a-z]+(?:\(([^)]+)\))?!?:/i);
	const scope = scopeMatch ? scopeMatch[1]?.toLowerCase() : null;

	// 3. Map affected components
	const affectedComponents = new Set();

	// Check scope match
	if (scope) {
		for (const [compKey, compDef] of Object.entries(COMPONENT_DEFINITIONS)) {
			if (compDef.scopes.includes(scope) || compDef.scopes.some((s) => scope.startsWith(`${s}/`))) {
				affectedComponents.add(compKey);
			}
		}
	}

	// Check files match
	for (const file of files) {
		for (const [compKey, compDef] of Object.entries(COMPONENT_DEFINITIONS)) {
			if (compDef.patterns.some((pattern) => pattern.test(file))) {
				affectedComponents.add(compKey);
			}
		}
	}

	// If no specific component detected and commit modified root dependencies, check if any applies
	if (affectedComponents.size === 0 && bumpType !== 'none') {
		const isRootDepChange = files.some((f) => f === 'package.json');
		if (isRootDepChange && scope) {
			// Scoped dependency change
			for (const [compKey, compDef] of Object.entries(COMPONENT_DEFINITIONS)) {
				if (compDef.scopes.includes(scope)) {
					affectedComponents.add(compKey);
				}
			}
		}
	}

	return {
		bumpType,
		affectedComponents: Array.from(affectedComponents),
		subject,
	};
}

export function calculateComponentBumps(options = {}) {
	const currentVersions = getExistingVersions();
	let fromRef = options.fromRef || null;
	const toRef = options.toRef || 'HEAD';

	if (!fromRef) {
		fromRef = getLatestTag();
	}

	const commits = getCommits(fromRef, toRef);
	const componentBumps = {
		cli: 'none',
		ui: 'none',
		api: 'none',
	};

	const componentReasons = {
		cli: [],
		ui: [],
		api: [],
	};

	for (const commit of commits) {
		const analysis = analyzeCommit(commit);
		if (analysis.bumpType === 'none' || analysis.affectedComponents.length === 0) {
			continue;
		}

		for (const comp of analysis.affectedComponents) {
			if (BUMP_PRECEDENCE[analysis.bumpType] > BUMP_PRECEDENCE[componentBumps[comp]]) {
				componentBumps[comp] = analysis.bumpType;
			}
			componentReasons[comp].push({
				bump: analysis.bumpType,
				subject: analysis.subject,
			});
		}
	}

	// Calculate resulting versions
	const newVersions = {
		cli: bumpVersion(currentVersions.cli, componentBumps.cli),
		ui: bumpVersion(currentVersions.ui, componentBumps.ui),
		api: bumpVersion(currentVersions.api, componentBumps.api),
	};

	return {
		fromRef,
		toRef,
		commitsCount: commits.length,
		currentVersions,
		componentBumps,
		componentReasons,
		newVersions,
	};
}

function main() {
	const args = process.argv.slice(2);
	const isDryRun = args.includes('--dry-run');
	const isCheck = args.includes('--check') || args.includes('--status');
	const isJson = args.includes('--json');

	const currentVersions = getExistingVersions();

	// Check manual sync
	const syncIdx = args.indexOf('--sync');
	if (syncIdx !== -1 && syncIdx + 1 < args.length) {
		const syncVer = args[syncIdx + 1].replace(/^v/, '');
		const data = { cli: syncVer, ui: syncVer, api: syncVer };
		if (!isDryRun) {
			fs.writeFileSync(versionPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
		}
		if (isJson) {
			console.log(JSON.stringify(data));
		} else {
			console.log(`[Version Sync] Todas las versiones sincronizadas a v${syncVer}`);
		}
		return;
	}

	// Check manual set or bump flags
	let manualUpdate = false;
	const nextVersions = { ...currentVersions };

	for (const comp of ['cli', 'ui', 'api']) {
		const setIdx = args.indexOf(`--set-${comp}`);
		if (setIdx !== -1 && setIdx + 1 < args.length) {
			nextVersions[comp] = args[setIdx + 1].replace(/^v/, '');
			manualUpdate = true;
		}

		const bumpIdx = args.indexOf(`--bump-${comp}`);
		if (bumpIdx !== -1 && bumpIdx + 1 < args.length) {
			const bumpType = args[bumpIdx + 1].toLowerCase();
			if (['major', 'minor', 'patch'].includes(bumpType)) {
				nextVersions[comp] = bumpVersion(nextVersions[comp], bumpType);
				manualUpdate = true;
			}
		}
	}

	if (manualUpdate) {
		if (!isDryRun) {
			fs.writeFileSync(versionPath, `${JSON.stringify(nextVersions, null, 2)}\n`, 'utf-8');
		}
		if (isJson) {
			console.log(JSON.stringify(nextVersions));
		} else {
			console.log('✅ Versiones actualizadas manualmente:');
			console.log(`   CLI: v${nextVersions.cli}`);
			console.log(`   UI:  v${nextVersions.ui}`);
			console.log(`   API: v${nextVersions.api}`);
		}
		return;
	}

	// Positional arguments from semantic-release: [nextRelease.version, lastRelease.version]
	let fromRef = null;
	const positionalArgs = args.filter((a) => !a.startsWith('-'));
	if (positionalArgs.length >= 2) {
		fromRef = positionalArgs[1] ? `v${positionalArgs[1].replace(/^v/, '')}` : null;
	}

	const fromFlagIdx = args.indexOf('--from');
	if (fromFlagIdx !== -1 && fromFlagIdx + 1 < args.length) {
		fromRef = args[fromFlagIdx + 1];
	}

	const result = calculateComponentBumps({ fromRef });

	if (isJson) {
		console.log(JSON.stringify(result, null, 2));
		return;
	}

	console.log('\n🔎 \x1b[1m\x1b[36mAnálisis de Versiones por Componente\x1b[0m');
	console.log(`   Referencia base: ${result.fromRef || '(inicio del repositorio)'}`);
	console.log(`   Commits analizados: ${result.commitsCount}\n`);

	for (const [comp, def] of Object.entries(COMPONENT_DEFINITIONS)) {
		const current = result.currentVersions[comp];
		const next = result.newVersions[comp];
		const bump = result.componentBumps[comp];
		const changed = current !== next;

		const icon = changed ? '🚀' : '⏸️ ';
		const statusColor = changed ? '\x1b[32m' : '\x1b[90m';
		const bumpLabel = changed ? `(${bump.toUpperCase()})` : '(sin cambios)';

		console.log(
			` ${icon} \x1b[1m${def.name}\x1b[0m: v${current} -> ${statusColor}v${next}\x1b[0m ${bumpLabel}`
		);

		if (result.componentReasons[comp].length > 0) {
			for (const r of result.componentReasons[comp].slice(0, 3)) {
				console.log(`     • [${r.bump}] ${r.subject}`);
			}
			if (result.componentReasons[comp].length > 3) {
				console.log(`     • ...y ${result.componentReasons[comp].length - 3} commits más`);
			}
		}
	}
	console.log('');

	if (!isDryRun && !isCheck) {
		fs.writeFileSync(versionPath, `${JSON.stringify(result.newVersions, null, 2)}\n`, 'utf-8');
		// Keep openapi.json version in sync with API version
		const openApiPath = path.join(rootDir, 'public', 'openapi.json');
		if (fs.existsSync(openApiPath)) {
			try {
				const openApi = JSON.parse(fs.readFileSync(openApiPath, 'utf-8'));
				if (openApi.info) {
					openApi.info.version = result.newVersions.api;
					fs.writeFileSync(openApiPath, `${JSON.stringify(openApi, null, '\t')}\n`, 'utf-8');
				}
			} catch (_e) {}
		}
		console.log(
			`💾 \x1b[32mArchivo version.json y openapi.json actualizados exitosamente.\x1b[0m\n`
		);
	} else if (isDryRun) {
		console.log('ℹ️  \x1b[33mModo dry-run: No se realizaron cambios en version.json.\x1b[0m\n');
	}
}

// If invoked directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	main();
}
