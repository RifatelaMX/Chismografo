import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, '..');
const appsLogoDir = path.join(workspaceDir, 'public', 'brand', 'logo', 'apps');
const techsAppsDir = path.join(workspaceDir, 'techs', 'apps');

/**
 * Convierte y comprime un buffer de imagen a formato WebP optimizado
 * @param {Buffer} inputBuffer - Buffer original de la imagen
 * @param {object} [options] - Opciones de calidad y tamaño
 * @returns {Promise<Buffer>} - Buffer optimizado en WebP
 */
export async function optimizeImageToWebp(inputBuffer, options = {}) {
	const quality = options.quality || 85;
	const effort = options.effort !== undefined ? options.effort : 4;
	const maxWidth = options.maxWidth || 512;
	const maxHeight = options.maxHeight || 512;

	let pipeline = sharp(inputBuffer);
	const metadata = await pipeline.metadata();

	if (
		metadata.width &&
		(metadata.width > maxWidth || (metadata.height && metadata.height > maxHeight))
	) {
		pipeline = pipeline.resize({
			width: maxWidth,
			height: maxHeight,
			fit: 'inside',
			withoutEnlargement: true,
		});
	}

	return await pipeline
		.webp({
			quality,
			effort,
		})
		.toBuffer();
}

/**
 * Descarga el logo de una Shopify App desde una URL, lo convierte a WebP y lo guarda en public/brand/logo/apps/
 * @param {string} slug - Slug de la aplicación
 * @param {string} logoUrl - URL remota del logo (CDN de Shopify u otro)
 * @returns {Promise<{ fileName: string, filePath: string, sizeBytes: number }>}
 */
export async function saveShopifyAppLogoFromUrl(slug, logoUrl) {
	if (!slug || !logoUrl) {
		throw new Error('Slug y logoUrl son obligatorios para guardar el logo.');
	}

	fs.mkdirSync(appsLogoDir, { recursive: true });

	const cleanSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
	const targetFileName = `${cleanSlug}.webp`;
	const targetFilePath = path.join(appsLogoDir, targetFileName);

	const fullUrl = logoUrl.startsWith('//') ? `https:${logoUrl}` : logoUrl;

	const response = await axios.get(fullUrl, {
		responseType: 'arraybuffer',
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		},
		timeout: 15000,
	});

	const rawBuffer = Buffer.from(response.data);
	const webpBuffer = await optimizeImageToWebp(rawBuffer);

	fs.writeFileSync(targetFilePath, webpBuffer);

	// Eliminar cualquier imagen previa o no-webp del mismo slug para conservar solo la versión webp comprimida
	const nonWebpExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];
	for (const ext of nonWebpExtensions) {
		const candidatePath = path.join(appsLogoDir, `${cleanSlug}${ext}`);
		if (fs.existsSync(candidatePath) && candidatePath !== targetFilePath) {
			try {
				fs.unlinkSync(candidatePath);
			} catch (_e) {}
		}
	}

	return {
		fileName: targetFileName,
		filePath: targetFilePath,
		sizeBytes: webpBuffer.length,
	};
}

/**
 * Convierte y comprime todos los logos existentes en public/brand/logo/apps a WebP,
 * eliminando los archivos originales no-webp para conservar solo la versión comprimida,
 * y actualiza las firmas JSON en techs/apps/ para que referencien el archivo .webp
 * @param {object} [options]
 * @returns {Promise<{ processed: number, converted: number, updatedConfigs: number, originalBytes: number, optimizedBytes: number }>}
 */
export async function optimizeAllLogos(options = {}) {
	fs.mkdirSync(appsLogoDir, { recursive: true });

	const shouldDeleteOriginal = options.deleteOriginal !== false;
	const files = fs.readdirSync(appsLogoDir);
	let processed = 0;
	let converted = 0;
	let originalBytes = 0;
	let optimizedBytes = 0;
	const conversions = new Map(); // original base -> webp filename

	for (const file of files) {
		if (file.startsWith('.')) continue;
		const ext = path.extname(file).toLowerCase();
		const base = path.basename(file, ext);
		const fullPath = path.join(appsLogoDir, file);

		if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) {
			try {
				const stats = fs.statSync(fullPath);
				originalBytes += stats.size;
				processed++;

				const targetFileName = `${base}.webp`;
				const targetFilePath = path.join(appsLogoDir, targetFileName);

				const rawBuffer = fs.readFileSync(fullPath);
				const webpBuffer = await optimizeImageToWebp(rawBuffer);
				optimizedBytes += webpBuffer.length;

				fs.writeFileSync(targetFilePath, webpBuffer);
				conversions.set(file, targetFileName);
				conversions.set(base, targetFileName);
				converted++;

				// Eliminar el archivo original no-webp para conservar solo la versión webp comprimida
				if (shouldDeleteOriginal && ext !== '.webp') {
					try {
						fs.unlinkSync(fullPath);
					} catch (_e) {}
				}
			} catch (err) {
				console.error(`[LogoOptimizer] Error al optimizar ${file}:`, err.message);
			}
		} else if (ext === '.webp') {
			const stats = fs.statSync(fullPath);
			optimizedBytes += stats.size;
			originalBytes += stats.size;
			processed++;
			conversions.set(file, file);
			conversions.set(base, file);

			// Si existe un archivo no-webp con el mismo base name, eliminarlo
			if (shouldDeleteOriginal) {
				const otherExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg'];
				for (const otherExt of otherExts) {
					const otherPath = path.join(appsLogoDir, `${base}${otherExt}`);
					if (fs.existsSync(otherPath)) {
						try {
							fs.unlinkSync(otherPath);
						} catch (_e) {}
					}
				}
			}
		}
	}

	// Actualizar referencias en techs/apps/*.json
	let updatedConfigs = 0;
	if (fs.existsSync(techsAppsDir)) {
		const appFiles = fs.readdirSync(techsAppsDir);
		for (const appFile of appFiles) {
			if (!appFile.endsWith('.json')) continue;
			const appFilePath = path.join(techsAppsDir, appFile);
			try {
				const content = fs.readFileSync(appFilePath, 'utf-8');
				const data = JSON.parse(content);
				let modified = false;

				// Verificar logo en acercaDe.detallesGenerales.logo
				const logoObj = data.acercaDe?.detallesGenerales?.logo || data.logo;
				if (logoObj?.id) {
					const currentId = logoObj.id;
					const currentBase = path.basename(currentId, path.extname(currentId));
					const webpVersion = `${currentBase}.webp`;
					const webpPath = path.join(appsLogoDir, webpVersion);

					if (fs.existsSync(webpPath) && currentId !== webpVersion) {
						if (data.acercaDe?.detallesGenerales?.logo) {
							data.acercaDe.detallesGenerales.logo.id = webpVersion;
							data.acercaDe.detallesGenerales.logo.proveedor = 'local';
						}
						if (data.logo) {
							data.logo.id = webpVersion;
							data.logo.proveedor = 'local';
						}
						modified = true;
					}
				}

				if (modified) {
					fs.writeFileSync(appFilePath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
					updatedConfigs++;
				}
			} catch (err) {
				console.error(`[LogoOptimizer] Error al actualizar JSON de ${appFile}:`, err.message);
			}
		}
	}

	return {
		processed,
		converted,
		updatedConfigs,
		originalBytes,
		optimizedBytes,
	};
}
