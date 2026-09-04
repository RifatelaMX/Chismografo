import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndex, loadAllTechRules } from './techRulesLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceDir = path.resolve(__dirname, '..');
const techsDir = path.join(workspaceDir, 'techs');

const VALID_COLLECTIONS = ['apps', 'infra', 'pixels', 'gateways', 'cms'];

/**
 * Convierte un texto en un slug válido kebab-case para ID
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
	if (!text) return '';
	return text
		.toString()
		.toLowerCase()
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Elimina acentos
		.replace(/[^a-z0-9]+/g, '-') // Reemplaza no alfanuméricos con guión
		.replace(/^-+|-+$/g, ''); // Quita guiones iniciales/finales
}

/**
 * Valida si la colección solicitada es válida
 * @param {string} collection
 */
function assertValidCollection(collection) {
	if (!VALID_COLLECTIONS.includes(collection)) {
		throw new Error(
			`Colección no válida: "${collection}". Las colecciones permitidas son: ${VALID_COLLECTIONS.join(', ')}`
		);
	}
}

/**
 * Obtiene el listado de tecnologías de una colección con soporte para filtrado por categoría y paginación
 * @param {string} collection - Tipo de tecnología ('apps', 'infra', 'pixels', 'gateways', 'cms')
 * @param {object} options - Opciones de filtrado y paginación
 * @param {string} [options.category] - Categoría para filtrar
 * @param {number|string} [options.page=1] - Página actual (1-indexed)
 * @param {number|string} [options.limit=5] - Cantidad de elementos por página (por defecto 5)
 * @returns {{ success: boolean, total: number, page: number, limit: number, totalPages: number, data: Array<object> }}
 */
export function listTechs(collection, options = {}) {
	assertValidCollection(collection);
	const folderPath = path.join(techsDir, collection);

	if (!fs.existsSync(folderPath)) {
		return {
			success: true,
			total: 0,
			page: 1,
			limit: 5,
			totalPages: 0,
			data: [],
		};
	}

	const files = fs.readdirSync(folderPath).filter((f) => f.endsWith('.json'));
	let items = [];

	for (const file of files) {
		try {
			const raw = fs.readFileSync(path.join(folderPath, file), 'utf-8');
			const parsed = JSON.parse(raw);
			if (!parsed.id) {
				parsed.id = file.replace(/\.json$/, '');
			}
			if (!Array.isArray(parsed.precios)) {
				parsed.precios = [];
			}
			items.push(parsed);
		} catch (err) {
			console.error(`[TechCatalog] Error al leer archivo ${file}:`, err.message);
		}
	}

	// Filtrado por categoría si se proporciona
	const categoryFilter = (options.category || options.categoria || '').toString().trim();
	if (categoryFilter) {
		const filterLower = categoryFilter.toLowerCase();
		items = items.filter(
			(item) => item.category && item.category.toLowerCase().includes(filterLower)
		);
	}

	const total = items.length;
	let limit = Number.parseInt(options.limit, 10);
	if (Number.isNaN(limit) || limit <= 0) {
		limit = 5;
	}

	let page = Number.parseInt(options.page, 10);
	if (Number.isNaN(page) || page <= 0) {
		page = 1;
	}

	const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
	const startIndex = (page - 1) * limit;
	const paginatedData = items.slice(startIndex, startIndex + limit);

	return {
		success: true,
		total,
		page,
		limit,
		totalPages,
		data: paginatedData,
	};
}

/**
 * Obtiene una tecnología por su ID único
 * @param {string} collection - Colección ('apps', 'infra', 'pixels', 'gateways', 'cms')
 * @param {string} id - ID / Slug de la tecnología
 * @returns {object|null}
 */
export function getTechById(collection, id) {
	assertValidCollection(collection);
	const cleanId = slugify(id);
	if (!cleanId) return null;

	const filePath = path.join(techsDir, collection, `${cleanId}.json`);
	if (!fs.existsSync(filePath)) {
		return null;
	}

	try {
		const raw = fs.readFileSync(filePath, 'utf-8');
		const parsed = JSON.parse(raw);
		if (!parsed.id) parsed.id = cleanId;
		if (!Array.isArray(parsed.precios)) parsed.precios = [];
		return parsed;
	} catch (err) {
		console.error(`[TechCatalog] Error al leer ${cleanId}.json:`, err.message);
		return null;
	}
}

/**
 * Crea una nueva tecnología y la guarda en su respectiva carpeta
 * @param {string} collection - Colección ('apps', 'infra', 'pixels', 'gateways', 'cms')
 * @param {object} techData - Datos de la tecnología
 * @returns {object} Elemento creado
 */
export function createTech(collection, techData) {
	assertValidCollection(collection);
	if (!techData || typeof techData !== 'object') {
		throw new Error('El cuerpo de la solicitud debe ser un objeto JSON válido.');
	}

	if (!techData.name) {
		throw new Error('El campo "name" es obligatorio para registrar una tecnología.');
	}

	const id = slugify(techData.id || techData.name);
	if (!id) {
		throw new Error('No se pudo generar un ID válido para la tecnología.');
	}

	const folderPath = path.join(techsDir, collection);
	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, { recursive: true });
	}

	const filePath = path.join(folderPath, `${id}.json`);
	if (fs.existsSync(filePath)) {
		throw new Error(
			`Ya existe una tecnología con el ID "${id}" en la colección "${collection}". Utilice PUT para actualizarla.`
		);
	}

	const normalized = {
		id,
		name: techData.name,
		...(techData.developer ? { developer: techData.developer } : {}),
		category: techData.category || 'Otros',
		...(techData.compatibleCMS ? { compatibleCMS: techData.compatibleCMS } : {}),
		...(techData.web ? { web: techData.web } : {}),
		precios: Array.isArray(techData.precios) ? techData.precios : [],
		...(techData.appStores ? { appStores: techData.appStores } : {}),
		...(techData.logo ? { logo: techData.logo } : {}),
		detectionRules: Array.isArray(techData.detectionRules) ? techData.detectionRules : [],
	};

	fs.writeFileSync(filePath, JSON.stringify(normalized, null, '\t') + '\n', 'utf-8');

	// Reconstruir index y recargar reglas en memoria
	buildIndex();
	loadAllTechRules();

	return normalized;
}

/**
 * Actualiza una tecnología existente según su ID
 * @param {string} collection - Colección ('apps', 'infra', 'pixels', 'gateways', 'cms')
 * @param {string} id - ID / Slug de la tecnología a actualizar
 * @param {object} techData - Datos a actualizar
 * @returns {object} Elemento actualizado
 */
export function updateTech(collection, id, techData) {
	assertValidCollection(collection);
	const cleanId = slugify(id);
	if (!cleanId) {
		throw new Error('El ID especificado no es válido.');
	}

	const filePath = path.join(techsDir, collection, `${cleanId}.json`);
	if (!fs.existsSync(filePath)) {
		throw new Error(
			`No se encontró ninguna tecnología con el ID "${cleanId}" en la colección "${collection}".`
		);
	}

	let existing = {};
	try {
		existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
	} catch (_e) {}

	const updated = {
		...existing,
		...techData,
		id: cleanId, // Mantener o fijar ID correspondiente
		name: techData.name || existing.name || cleanId,
		category: techData.category || existing.category || 'Otros',
		precios: Array.isArray(techData.precios)
			? techData.precios
			: Array.isArray(existing.precios)
				? existing.precios
				: [],
		detectionRules: Array.isArray(techData.detectionRules)
			? techData.detectionRules
			: Array.isArray(existing.detectionRules)
				? existing.detectionRules
				: [],
	};

	fs.writeFileSync(filePath, JSON.stringify(updated, null, '\t') + '\n', 'utf-8');

	// Reconstruir index y recargar reglas en memoria
	buildIndex();
	loadAllTechRules();

	return updated;
}

/**
 * Elimina una tecnología según su ID
 * @param {string} collection - Colección ('apps', 'infra', 'pixels', 'gateways', 'cms')
 * @param {string} id - ID / Slug de la tecnología a eliminar
 * @returns {boolean}
 */
export function deleteTech(collection, id) {
	assertValidCollection(collection);
	const cleanId = slugify(id);
	if (!cleanId) {
		throw new Error('El ID especificado no es válido.');
	}

	const filePath = path.join(techsDir, collection, `${cleanId}.json`);
	if (!fs.existsSync(filePath)) {
		throw new Error(
			`No se encontró ninguna tecnología con el ID "${cleanId}" en la colección "${collection}" para eliminar.`
		);
	}

	fs.unlinkSync(filePath);

	// Reconstruir index y recargar reglas en memoria
	buildIndex();
	loadAllTechRules();

	return true;
}
