import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const newVersion = process.argv[2];
if (!newVersion) {
	console.error('Falta la versión para actualizar.');
	process.exit(1);
}

const versionPath = path.join(rootDir, 'version.json');
if (fs.existsSync(versionPath)) {
	try {
		const data = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
		// Update all to match the unified release version
		data.cli = newVersion;
		data.ui = newVersion;
		data.api = newVersion;
		fs.writeFileSync(versionPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
		console.log(`Actualizado version.json a la versión ${newVersion}`);
	} catch (e) {
		console.error('Error al actualizar version.json:', e.message);
	}
} else {
	const data = { cli: newVersion, ui: newVersion, api: newVersion };
	fs.writeFileSync(versionPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
	console.log(`Creado version.json con la versión ${newVersion}`);
}
