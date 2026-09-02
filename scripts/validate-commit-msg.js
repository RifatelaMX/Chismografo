#!/usr/bin/env node

import fs from 'node:fs';

const msgPath = process.argv[2];
let commitMsg = '';

if (msgPath && fs.existsSync(msgPath)) {
	commitMsg = fs.readFileSync(msgPath, 'utf-8');
} else if (process.argv[2]) {
	commitMsg = process.argv.slice(2).join(' ');
} else {
	console.error('Uso: node scripts/validate-commit-msg.js "<mensaje>" o <archivo>');
	process.exit(1);
}

// Extract first line (header)
const firstLine = commitMsg.trim().split('\n')[0].trim();

// Skip automated release commits or merge commits
if (
	firstLine.startsWith('chore(release):') ||
	firstLine.startsWith('Merge ') ||
	firstLine.startsWith('Revert ')
) {
	process.exit(0);
}

const pattern =
	/^(feat|fix|perf|refactor|style|docs|test|build|ci|chore|revert)(?:\(([^)]+)\))?(!)?:\s+(.+)$/;

const match = firstLine.match(pattern);

if (!match) {
	console.error('\n❌ \x1b[31mError: Mensaje de commit inválido.\x1b[0m');
	console.error(`   Mensaje recibido: "${firstLine}"\n`);
	console.error(
		'   Debe cumplir con Conventional Commits en español: \x1b[36m<tipo>(<scope>): <descripción en español>\x1b[0m'
	);
	console.error('   Ejemplos válidos:');
	console.error('     • \x1b[32mfeat(techs): agregar plantilla de hotjar en apps\x1b[0m');
	console.error('     • \x1b[32mfeat(techs/gateways): agregar pasarela afterpay\x1b[0m');
	console.error('     • \x1b[32mfeat(cli): agregar flag --json para exportar\x1b[0m');
	console.error('     • \x1b[32mfix(ui): corregir layout en pantalla móvil\x1b[0m');
	console.error('     • \x1b[32mfeat(api): soportar nuevo proveedor de capturas\x1b[0m');
	console.error('     • \x1b[32mdocs: actualizar instrucciones de despliegue\x1b[0m');
	console.error('     • \x1b[32mchore(deps): actualizar dependencias\x1b[0m\n');
	process.exit(1);
}

console.log('✅ Mensaje de commit válido:', firstLine);
process.exit(0);
