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
 * Normaliza y valida el objeto chismografo para el esquema v2
 * @param {object} [inputChismografo]
 * @param {object} [inputToolData]
 * @param {string} [collection='apps']
 * @returns {{ tipo: number, version: number|string, ultimaActualizacion: string, revision: number, entorno: number }}
 */
export function normalizeChismografo(inputChismografo, inputToolData, collection = 'apps') {
	const tipoMap = { apps: 1, cms: 2, gateways: 3, infra: 4, pixels: 5 };
	const today = new Date().toISOString().split('T')[0];
	const ch = inputChismografo && typeof inputChismografo === 'object' ? inputChismografo : null;
	const td = inputToolData && typeof inputToolData === 'object' ? inputToolData : null;

	let tipo = tipoMap[collection] || 1;
	if (ch && ch.tipo !== undefined) {
		tipo = Number(ch.tipo) || tipo;
	}

	let version = 1.0;
	if (ch && ch.version !== undefined) {
		version = ch.version;
	} else if (td && td.version !== undefined) {
		version = Number.isNaN(Number(td.version)) ? td.version : Number(td.version);
	}

	let ultimaActualizacion = today;
	if (ch && (ch.ultimaActualizacion || ch.utlimaActualizacion)) {
		ultimaActualizacion = String(ch.ultimaActualizacion || ch.utlimaActualizacion);
	} else if (td && td.fechaActualizacion) {
		ultimaActualizacion = String(td.fechaActualizacion);
	}

	let revision = 0; // 0=ia, 1=manual, 2=ambos
	if (ch && ch.revision !== undefined) {
		if (typeof ch.revision === 'number') {
			revision = [0, 1, 2].includes(ch.revision) ? ch.revision : 0;
		} else {
			const revStr = String(ch.revision).toLowerCase().trim();
			if (revStr === 'manual' || revStr === '1') revision = 1;
			else if (revStr === 'ambos' || revStr === '2') revision = 2;
			else revision = 0;
		}
	} else if (td && td.revision !== undefined) {
		const revStr = String(td.revision).toLowerCase().trim();
		revision = revStr === 'manual' || revStr === '1' ? 1 : 0;
	}

	let entorno = 0; // 0=desarrollo, 1=preview, 2=producción
	if (ch && ch.entorno !== undefined) {
		entorno = [0, 1, 2].includes(Number(ch.entorno)) ? Number(ch.entorno) : 0;
	}

	return {
		tipo,
		version,
		ultimaActualizacion,
		revision,
		entorno,
	};
}

/**
 * Normaliza y valida el objeto toolData para compatibilidad con el esquema legacy v1
 * @param {object} [inputToolData]
 * @param {object} [inputChismografo]
 * @returns {{ version: string, versionJson: string, fechaActualizacion: string, revision: 'ia'|'manual' }}
 */
export function normalizeToolData(inputToolData, inputChismografo) {
	const today = new Date().toISOString().split('T')[0];
	const td = inputToolData && typeof inputToolData === 'object' ? inputToolData : null;
	const ch = inputChismografo && typeof inputChismografo === 'object' ? inputChismografo : null;

	if (td) {
		const revisionRaw = (td.revision || 'ia').toString().toLowerCase().trim();
		if (td.revision !== undefined && !['ia', 'manual', '0', '1', '2'].includes(revisionRaw)) {
			throw new Error(
				`El campo "revision" en toolData solo permite los valores: "ia" o "manual". Valor recibido: "${td.revision}"`
			);
		}
		return {
			version: td.version ? String(td.version) : '1.0.0',
			versionJson: td.versionJson ? String(td.versionJson) : 'v1',
			fechaActualizacion: td.fechaActualizacion ? String(td.fechaActualizacion) : today,
			revision: ['manual', '1'].includes(revisionRaw) ? 'manual' : 'ia',
		};
	}

	if (ch) {
		return {
			version: ch.version ? String(ch.version) : '1.0.0',
			versionJson: 'v2',
			fechaActualizacion: ch.ultimaActualizacion || ch.utlimaActualizacion || today,
			revision: ch.revision === 1 ? 'manual' : 'ia',
		};
	}

	return {
		version: '1.0.0',
		versionJson: 'v1',
		fechaActualizacion: today,
		revision: 'ia',
	};
}

/**
 * Normaliza CMS compatibles a formato estructurado v2 y retrocompatible
 * @param {Array} rawCms
 * @param {Array} [rawStores]
 * @returns {Array<{ id: string, slug: string, enlace?: string }>}
 */
export function normalizeCmsCompatibles(rawCms, rawStores) {
	if (Array.isArray(rawCms) && rawCms.length > 0) {
		return rawCms.map((item) => {
			if (typeof item === 'object' && item !== null) {
				const id = slugify(item.id || item.cms || '');
				const slug = item.slug || id;
				const res = { id, slug };
				if (item.enlace || item.link) res.enlace = item.enlace || item.link;
				return res;
			}
			const slug = slugify(String(item));
			return { id: slug, slug };
		});
	}

	if (Array.isArray(rawStores) && rawStores.length > 0) {
		return rawStores.map((s) => {
			const id = slugify(s.cms || s.id || '');
			const link = s.enlace || s.link || '';
			const extractedSlug = link ? link.split('/').filter(Boolean).pop() : id;
			const res = { id, slug: extractedSlug || id };
			if (link) res.enlace = link;
			return res;
		});
	}

	return [];
}

/**
 * Normaliza tiendas de aplicaciones a formato legacy español
 * @param {Array} rawStores
 * @returns {Array<{ cms: string, enlace: string }>}
 */
function normalizeTiendasApp(rawStores) {
	if (!Array.isArray(rawStores)) return [];
	return rawStores.map((s) => ({
		cms: s.cms || s.id || '',
		enlace: s.enlace || s.link || '',
	}));
}

/**
 * Normaliza la configuración de logo
 * @param {object} rawLogo
 * @returns {object|undefined}
 */
function normalizeLogo(rawLogo) {
	if (!rawLogo || typeof rawLogo !== 'object') return undefined;
	const proveedor = rawLogo.proveedor || rawLogo.provider || 'local';
	return {
		id: rawLogo.id || '',
		proveedor,
		provider: proveedor, // Compatibilidad
	};
}

/**
 * Normaliza las reglas de detección a formato en español con compatibilidad
 * @param {Array} rawRules
 * @returns {Array<object>}
 */
function normalizeReglasDeteccion(rawRules) {
	if (!Array.isArray(rawRules)) return [];
	return rawRules.map((r) => {
		const tipo = r.tipo || r.type || 'script-src';
		const patron = r.patron || r.pattern || '';
		const descripcion = r.descripcion || r.description || '';
		const llave = r.llave || r.clave || r.key;
		const atributo = r.atributo || r.attribute;
		const peso = r.peso !== undefined ? r.peso : r.weight;

		const rule = {};
		if (r.id) rule.id = r.id;
		rule.tipo = tipo;
		rule.type = tipo; // Compatibilidad
		if (llave) {
			rule.llave = llave;
			rule.key = llave;
		}
		if (atributo) {
			rule.atributo = atributo;
			rule.attribute = atributo;
		}
		rule.patron = patron;
		rule.pattern = patron;
		if (descripcion) {
			rule.descripcion = descripcion;
			rule.description = descripcion;
		}
		if (peso !== undefined) {
			rule.peso = peso;
			rule.weight = peso;
		}
		return rule;
	});
}

/**
 * Normaliza un objeto de tecnología leído para asegurar compatibilidad de lectura en v2 (actual) y v1 (legacy)
 * @param {object} parsed
 * @param {string} id
 * @param {string} [collection='apps']
 * @returns {object}
 */
function normalizeTechRead(parsed, id, collection = 'apps') {
	const cleanId = parsed.id || id;
	const detalles = parsed.acercaDe?.detallesGenerales || {};

	const nombre = detalles.nombre || parsed.nombre || parsed.name || cleanId;
	const categoria = detalles.categoria || parsed.categoria || parsed.category || 'Otros';
	const desarrollador = detalles.desarrollador || parsed.desarrollador || parsed.developer;
	const web = detalles.web || parsed.web;
	const logo = normalizeLogo(detalles.logo || parsed.logo);

	const cmsCompatibles = normalizeCmsCompatibles(
		parsed.acercaDe?.cmsCompatibles || parsed.cmsCompatibles || parsed.compatibleCMS,
		parsed.tiendasApp || parsed.appStores
	);

	const calificacion =
		parsed.acercaDe?.calificacion !== undefined
			? parsed.acercaDe.calificacion
			: parsed.calificacion;

	const precios = Array.isArray(parsed.acercaDe?.precios)
		? parsed.acercaDe.precios
		: Array.isArray(parsed.precios)
			? parsed.precios
			: [];

	const reglasDeteccion = normalizeReglasDeteccion(
		parsed.herramienta?.reglasDeteccion || parsed.reglasDeteccion || parsed.detectionRules
	);

	const chismografo = normalizeChismografo(
		parsed.chismografo,
		parsed.toolData || parsed.datosHerramienta,
		collection
	);
	const toolData = normalizeToolData(parsed.toolData || parsed.datosHerramienta, chismografo);

	const tiendasApp = cmsCompatibles.map((c) => ({
		cms: c.id,
		enlace: c.enlace || '',
	}));

	const isV2 = Boolean(parsed.$schema || parsed.chismografo || parsed.acercaDe);

	return {
		...parsed,
		...(isV2 || collection === 'apps'
			? {
					$schema: parsed.$schema || '../../schemas/app-v2.schema.json',
					chismografo,
					acercaDe: {
						detallesGenerales: {
							nombre,
							...(desarrollador ? { desarrollador } : {}),
							...(web ? { web } : {}),
							categoria,
							...(logo ? { logo } : {}),
						},
						cmsCompatibles,
						...(calificacion !== undefined ? { calificacion } : {}),
						precios,
					},
					herramienta: {
						reglasDeteccion,
					},
				}
			: {}),
		// Propiedades planas para máxima compatibilidad con código existente y tests v1
		id: cleanId,
		nombre,
		name: nombre,
		...(desarrollador ? { desarrollador, developer: desarrollador } : {}),
		categoria,
		category: categoria,
		...(cmsCompatibles.length > 0 ? { cmsCompatibles, compatibleCMS: cmsCompatibles } : {}),
		...(web ? { web } : {}),
		...(calificacion !== undefined ? { calificacion } : {}),
		precios,
		...(tiendasApp.length > 0 ? { tiendasApp, appStores: tiendasApp } : {}),
		...(logo ? { logo } : {}),
		toolData,
		reglasDeteccion,
		detectionRules: reglasDeteccion,
	};
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

	const files = fs
		.readdirSync(folderPath)
		.filter((f) => f.endsWith('.json') && !f.includes('sample') && !f.startsWith('_'));
	let items = [];

	for (const file of files) {
		try {
			const raw = fs.readFileSync(path.join(folderPath, file), 'utf-8');
			const parsed = JSON.parse(raw);
			items.push(normalizeTechRead(parsed, file.replace(/\.json$/, '')));
		} catch (err) {
			console.error(`[TechCatalog] Error al leer archivo ${file}:`, err.message);
		}
	}

	// Filtrado por categoría si se proporciona
	const categoryFilter = (options.category || options.categoria || '').toString().trim();
	if (categoryFilter) {
		const filterLower = categoryFilter.toLowerCase();
		items = items.filter(
			(item) =>
				(item.categoria && item.categoria.toLowerCase().includes(filterLower)) ||
				(item.category && item.category.toLowerCase().includes(filterLower))
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
		return normalizeTechRead(parsed, cleanId);
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

	const detalles = techData.acercaDe?.detallesGenerales || {};
	const nombre = detalles.nombre || techData.nombre || techData.name;
	if (!nombre) {
		throw new Error('El campo "nombre" (o "name") es obligatorio para registrar una tecnología.');
	}

	const id = slugify(techData.id || nombre);
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

	const desarrollador = detalles.desarrollador || techData.desarrollador || techData.developer;
	const categoria = detalles.categoria || techData.categoria || techData.category || 'Otros';
	const web = detalles.web || techData.web;
	const logo = normalizeLogo(detalles.logo || techData.logo);

	const cmsCompatibles = normalizeCmsCompatibles(
		techData.acercaDe?.cmsCompatibles || techData.cmsCompatibles || techData.compatibleCMS,
		techData.tiendasApp || techData.appStores
	);

	const precios = Array.isArray(techData.acercaDe?.precios)
		? techData.acercaDe.precios
		: Array.isArray(techData.precios)
			? techData.precios
			: [];

	const rawRules =
		techData.herramienta?.reglasDeteccion ||
		techData.reglasDeteccion ||
		techData.detectionRules ||
		[];
	const reglasDeteccion = normalizeReglasDeteccion(rawRules);

	const chismografo = normalizeChismografo(
		techData.chismografo,
		techData.toolData || techData.datosHerramienta,
		collection
	);
	const toolData = normalizeToolData(techData.toolData || techData.datosHerramienta, chismografo);

	const calificacion =
		techData.acercaDe?.calificacion !== undefined
			? techData.acercaDe.calificacion
			: techData.calificacion;

	let diskRecord;
	if (collection === 'apps') {
		diskRecord = {
			$schema: techData.$schema || '../../schemas/app-v2.schema.json',
			id,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(desarrollador ? { desarrollador } : {}),
					...(web ? { web } : {}),
					categoria,
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				cmsCompatibles,
				...(calificacion !== undefined ? { calificacion } : {}),
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'script-src';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else if (collection === 'cms') {
		diskRecord = {
			$schema: techData.$schema || '../../schemas/cms-v2.schema.json',
			id,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(web ? { web } : {}),
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'meta';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else if (collection === 'gateways') {
		diskRecord = {
			$schema: techData.$schema || '../../schemas/gateway-v2.schema.json',
			id,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(desarrollador ? { empresaResponsable: desarrollador } : {}),
					...(web ? { web } : {}),
					categoria: categoria || 'Pasarela de Pago',
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				cmsCompatibles,
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'script-src';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else if (collection === 'infra') {
		diskRecord = {
			$schema: techData.$schema || '../../schemas/infra-v2.schema.json',
			id,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(web ? { web } : {}),
					categoria: categoria || 'Servidores Web',
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'headers';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else if (collection === 'pixels') {
		diskRecord = {
			$schema: techData.$schema || '../../schemas/pixel-v2.schema.json',
			id,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(desarrollador ? { desarrollador } : {}),
					...(web ? { web } : {}),
					categoria: categoria || 'Píxeles / Tracking',
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'script-src';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else {
		const tiendasApp = cmsCompatibles.map((c) => ({
			cms: c.id,
			enlace: c.enlace || '',
		}));
		diskRecord = {
			id,
			nombre,
			...(desarrollador ? { desarrollador } : {}),
			categoria,
			...(cmsCompatibles.length > 0 ? { cmsCompatibles } : {}),
			...(web ? { web } : {}),
			precios,
			...(tiendasApp.length > 0 ? { tiendasApp } : {}),
			...(logo
				? {
						logo: {
							id: logo.id || '',
							proveedor: logo.proveedor || logo.provider || 'local',
						},
					}
				: {}),
			toolData,
			reglasDeteccion: reglasDeteccion.map((r) => {
				const rule = {};
				if (r.id) rule.id = r.id;
				rule.tipo = r.tipo || r.type || 'script-src';
				if (r.llave || r.key) rule.llave = r.llave || r.key;
				if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
				rule.patron = r.patron || r.pattern || '';
				if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
				if (r.peso !== undefined || r.weight !== undefined) {
					rule.peso = r.peso !== undefined ? r.peso : r.weight;
				}
				return rule;
			}),
		};
	}

	fs.writeFileSync(filePath, JSON.stringify(diskRecord, null, '\t') + '\n', 'utf-8');

	// Reconstruir index y recargar reglas en memoria
	buildIndex();
	loadAllTechRules();

	return normalizeTechRead(diskRecord, id, collection);
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

	const normalizedExisting = normalizeTechRead(existing, cleanId, collection);
	const incomingDetalles = techData.acercaDe?.detallesGenerales || {};

	const nombre =
		incomingDetalles.nombre ||
		techData.nombre ||
		techData.name ||
		normalizedExisting.nombre ||
		cleanId;

	const desarrollador =
		incomingDetalles.desarrollador !== undefined
			? incomingDetalles.desarrollador
			: techData.desarrollador !== undefined
				? techData.desarrollador
				: techData.developer !== undefined
					? techData.developer
					: normalizedExisting.desarrollador;

	const categoria =
		incomingDetalles.categoria ||
		techData.categoria ||
		techData.category ||
		normalizedExisting.categoria ||
		'Otros';

	const web =
		incomingDetalles.web !== undefined
			? incomingDetalles.web
			: techData.web !== undefined
				? techData.web
				: normalizedExisting.web;

	const rawLogo =
		incomingDetalles.logo !== undefined
			? incomingDetalles.logo
			: techData.logo !== undefined
				? techData.logo
				: normalizedExisting.logo;
	const logo = normalizeLogo(rawLogo);

	const rawCms =
		techData.acercaDe?.cmsCompatibles !== undefined
			? techData.acercaDe.cmsCompatibles
			: techData.cmsCompatibles !== undefined
				? techData.cmsCompatibles
				: techData.compatibleCMS !== undefined
					? techData.compatibleCMS
					: normalizedExisting.cmsCompatibles;

	const cmsCompatibles = normalizeCmsCompatibles(
		rawCms,
		techData.tiendasApp || techData.appStores || normalizedExisting.tiendasApp
	);

	const precios = Array.isArray(techData.acercaDe?.precios)
		? techData.acercaDe.precios
		: Array.isArray(techData.precios)
			? techData.precios
			: normalizedExisting.precios || [];

	const rawRules =
		techData.herramienta?.reglasDeteccion !== undefined
			? techData.herramienta.reglasDeteccion
			: techData.reglasDeteccion !== undefined
				? techData.reglasDeteccion
				: techData.detectionRules !== undefined
					? techData.detectionRules
					: normalizedExisting.reglasDeteccion || [];
	const reglasDeteccion = normalizeReglasDeteccion(rawRules);

	const chismografo = normalizeChismografo(
		techData.chismografo || normalizedExisting.chismografo,
		techData.toolData || techData.datosHerramienta || normalizedExisting.toolData,
		collection
	);
	chismografo.ultimaActualizacion = new Date().toISOString().split('T')[0];

	const toolData = normalizeToolData(
		techData.toolData || techData.datosHerramienta || normalizedExisting.toolData,
		chismografo
	);

	const calificacion =
		techData.acercaDe?.calificacion !== undefined
			? techData.acercaDe.calificacion
			: techData.calificacion !== undefined
				? techData.calificacion
				: normalizedExisting.calificacion;

	let diskRecord;
	if (collection === 'apps') {
		diskRecord = {
			$schema: existing.$schema || techData.$schema || '../../schemas/app-v2.schema.json',
			id: cleanId,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(desarrollador ? { desarrollador } : {}),
					...(web ? { web } : {}),
					categoria,
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				cmsCompatibles,
				...(calificacion !== undefined ? { calificacion } : {}),
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'script-src';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else if (collection === 'cms') {
		diskRecord = {
			$schema: existing.$schema || techData.$schema || '../../schemas/cms-v2.schema.json',
			id: cleanId,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(web ? { web } : {}),
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'meta';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else if (collection === 'gateways') {
		diskRecord = {
			$schema: existing.$schema || techData.$schema || '../../schemas/gateway-v2.schema.json',
			id: cleanId,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(desarrollador ? { empresaResponsable: desarrollador } : {}),
					...(web ? { web } : {}),
					categoria: categoria || 'Pasarela de Pago',
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				cmsCompatibles,
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'script-src';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else if (collection === 'infra') {
		diskRecord = {
			$schema: existing.$schema || techData.$schema || '../../schemas/infra-v2.schema.json',
			id: cleanId,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(web ? { web } : {}),
					categoria: categoria || 'Servidores Web',
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'headers';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else if (collection === 'pixels') {
		diskRecord = {
			$schema: existing.$schema || techData.$schema || '../../schemas/pixel-v2.schema.json',
			id: cleanId,
			chismografo,
			acercaDe: {
				detallesGenerales: {
					nombre,
					...(desarrollador ? { desarrollador } : {}),
					...(web ? { web } : {}),
					categoria: categoria || 'Píxeles / Tracking',
					...(logo
						? {
								logo: {
									id: logo.id || '',
									proveedor: logo.proveedor || logo.provider || 'local',
								},
							}
						: {}),
				},
				precios,
			},
			herramienta: {
				reglasDeteccion: reglasDeteccion.map((r) => {
					const rule = {};
					if (r.id) rule.id = r.id;
					rule.tipo = r.tipo || r.type || 'script-src';
					if (r.llave || r.key) rule.llave = r.llave || r.key;
					if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
					rule.patron = r.patron || r.pattern || '';
					if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
					if (r.peso !== undefined || r.weight !== undefined) {
						rule.peso = r.peso !== undefined ? r.peso : r.weight;
					}
					return rule;
				}),
			},
		};
	} else {
		const tiendasApp = cmsCompatibles.map((c) => ({
			cms: c.id,
			enlace: c.enlace || '',
		}));
		diskRecord = {
			id: cleanId,
			nombre,
			...(desarrollador ? { desarrollador } : {}),
			categoria,
			...(cmsCompatibles.length > 0 ? { cmsCompatibles } : {}),
			...(web ? { web } : {}),
			precios,
			...(tiendasApp.length > 0 ? { tiendasApp } : {}),
			...(logo
				? {
						logo: {
							id: logo.id || '',
							proveedor: logo.proveedor || logo.provider || 'local',
						},
					}
				: {}),
			toolData,
			reglasDeteccion: reglasDeteccion.map((r) => {
				const rule = {};
				if (r.id) rule.id = r.id;
				rule.tipo = r.tipo || r.type || 'script-src';
				if (r.llave || r.key) rule.llave = r.llave || r.key;
				if (r.atributo || r.attribute) rule.atributo = r.atributo || r.attribute;
				rule.patron = r.patron || r.pattern || '';
				if (r.descripcion || r.description) rule.descripcion = r.descripcion || r.description;
				if (r.peso !== undefined || r.weight !== undefined) {
					rule.peso = r.peso !== undefined ? r.peso : r.weight;
				}
				return rule;
			}),
		};
	}

	fs.writeFileSync(filePath, JSON.stringify(diskRecord, null, '\t') + '\n', 'utf-8');

	// Reconstruir index y recargar reglas en memoria
	buildIndex();
	loadAllTechRules();

	return normalizeTechRead(diskRecord, cleanId, collection);
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
