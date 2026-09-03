window.handleLogoLoad = (img, providedDomain, websiteUrl, provider) => {
	// Si el proveedor devolvió un favicon genérico diminuto (16x16 o menor) o imagen vacía
	if (
		img.naturalWidth <= 16 &&
		(img.src.includes('google.com') ||
			img.src.includes('gstatic.com') ||
			img.src.includes('duckduckgo.com') ||
			img.src.includes('logo.dev'))
	) {
		window.handleLogoError(img, providedDomain, websiteUrl, provider);
	}
};

window.handleLogoError = (img, providedDomain, websiteUrl, provider) => {
	const state = Number.parseInt(img.dataset.fallbackState || '0', 10);

	// Tier 0: Si es proveedor local, intentar alternar extensión (.png <-> .svg) si aún no se ha probado
	if (provider === 'local') {
		const cleanName = (providedDomain || '').replace(/\.(svg|png|jpg|jpeg|gif|webp)$/i, '');
		if (cleanName && state === 0) {
			img.dataset.fallbackState = '1';
			const isPng = (providedDomain || '').toLowerCase().endsWith('.png');
			img.src = `/brand/logo/apps/${cleanName}${isPng ? '.svg' : '.png'}`;
			return;
		}
	}

	// Obtener dominio web válido para la cascada externa
	let domain = '';
	if (websiteUrl) {
		try {
			domain = new URL(websiteUrl).hostname.replace(/^www\./i, '');
		} catch (_e) {}
	}

	// Si no hay websiteUrl, usar providedDomain solo si parece un dominio de internet y no un archivo
	if (!domain && providedDomain) {
		const isFileLike =
			/\.(svg|png|jpg|jpeg|gif|webp|ico)$/i.test(providedDomain) ||
			!providedDomain.includes('.') ||
			provider === 'local';
		if (!isFileLike) {
			domain = providedDomain
				.replace(/^https?:\/\//i, '')
				.replace(/^www\./i, '')
				.split('/')[0];
		}
	}

	if (!domain) {
		// Sin dominio web para consultar proveedores externos -> mostrar inicial directamente
		img.style.display = 'none';
		if (img.nextElementSibling) img.nextElementSibling.style.display = 'flex';
		return;
	}

	const bfKey = window.serverConfig?.brandfetchApiKey
		? `?c=${window.serverConfig.brandfetchApiKey}`
		: '';
	const biKey = window.serverConfig?.brandiconsApiKey
		? `?key=${window.serverConfig.brandiconsApiKey}`
		: '';
	const npKey = window.serverConfig?.ninjapearApiKey
		? `?key=${window.serverConfig.ninjapearApiKey}`
		: '';
	const logoToken = window.serverConfig?.logoDevToken || 'pk_MgKPAkEuRMOiYecOkx67wQ';

	// Cascada sin globos genéricos:
	// 1. Logo.dev HD
	// 2. DuckDuckGo Favicons
	// 3. Google Favicons HD
	// 4. Brandfetch API
	// 5. BrandIcons.dev
	// 6. NinjaPear API
	// 7. Fallback a inicial estilizada
	if (state === 0 || state === 1) {
		img.dataset.fallbackState = '2';
		img.src = `https://img.logo.dev/${domain}?token=${logoToken}&size=64`;
	} else if (state === 2) {
		img.dataset.fallbackState = '3';
		img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
	} else if (state === 3) {
		img.dataset.fallbackState = '4';
		img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
	} else if (state === 4) {
		img.dataset.fallbackState = '5';
		if (window.serverConfig?.brandfetchApiKey) {
			img.src = `https://asset.brandfetch.io/${domain}${bfKey}`;
		} else {
			window.handleLogoError(img, providedDomain, websiteUrl, provider);
		}
	} else if (state === 5) {
		img.dataset.fallbackState = '6';
		if (window.serverConfig?.brandiconsApiKey) {
			img.src = `https://cdn.brandicons.dev/icons/${domain}${biKey}`;
		} else {
			window.handleLogoError(img, providedDomain, websiteUrl, provider);
		}
	} else if (state === 6) {
		img.dataset.fallbackState = '7';
		if (window.serverConfig?.ninjapearApiKey) {
			img.src = `https://logo.ninjapear.com/${domain}${npKey}`;
		} else {
			window.handleLogoError(img, providedDomain, websiteUrl, provider);
		}
	} else {
		// Todas las fuentes externas agotadas o sin logo -> mostrar inicial estilizada
		img.style.display = 'none';
		if (img.nextElementSibling) img.nextElementSibling.style.display = 'flex';
	}
};

/**
 * Analiza la luminancia y contraste de un logo transparente o gráfico
 * para asegurar máxima visibilidad (adaptando fondo blanco/oscuro o drop-shadow).
 * @param {HTMLImageElement} img
 * @param {HTMLElement} container
 */
window.analyzeAndApplyImageContrast = (img, container) => {
	if (!img || !container) return;

	const applyContrast = (isLight) => {
		container.classList.remove('logo-theme-light-bg', 'logo-theme-dark-bg');
		if (typeof lastScanData !== 'undefined' && lastScanData) {
			lastScanData.isLogoDark = isLight;
		}
		if (isLight) {
			container.classList.add('logo-theme-dark-bg');
			img.style.filter = 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45))';
		} else {
			container.classList.add('logo-theme-light-bg');
			img.style.filter = 'drop-shadow(0 0 1px rgba(0, 0, 0, 0.15))';
		}
	};

	try {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d', { willReadFrequently: true });
		if (!ctx) {
			applyContrast(false);
			return;
		}

		const w = (canvas.width = Math.min(img.naturalWidth || 64, 80));
		const h = (canvas.height = Math.min(img.naturalHeight || 64, 80));

		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(img, 0, 0, w, h);

		const imageData = ctx.getImageData(0, 0, w, h);
		const data = imageData.data;

		let visiblePixels = 0;
		let lightPixels = 0;
		let totalLuminance = 0;

		for (let i = 0; i < data.length; i += 4) {
			const alpha = data[i + 3];
			if (alpha > 30) {
				const r = data[i];
				const g = data[i + 1];
				const b = data[i + 2];
				const lum = 0.299 * r + 0.587 * g + 0.114 * b;
				totalLuminance += lum;
				visiblePixels++;
				if (lum > 175) {
					lightPixels++;
				}
			}
		}

		if (visiblePixels > 0) {
			const avgLum = totalLuminance / visiblePixels;
			const isLight = lightPixels / visiblePixels > 0.45 || avgLum > 175;
			applyContrast(isLight);
		} else {
			applyContrast(false);
		}
	} catch (_e) {
		// Fallback para imágenes sin cabeceras CORS (tainted canvas)
		container.classList.remove('logo-theme-dark-bg');
		container.classList.add('logo-theme-light-bg');
		img.style.filter =
			'drop-shadow(0 0 1px rgba(0, 0, 0, 0.55)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))';
	}
};

document.addEventListener('DOMContentLoaded', () => {
	// Initialize Lucide Icons
	lucide.createIcons();

	// Declare serverConfig at the top to avoid temporal dead zone issues
	let serverConfig = {
		builtwith: false,
	};

	// Initialize Embeddable Search Widget preview and code
	const searchWidgetIframe = document.getElementById('search-widget-preview-iframe');
	const searchWidgetCode = document.getElementById('search-widget-embed-code');
	const fullEmbedCode = document.getElementById('full-embed-code');

	function updateIframeEmbedCodes() {
		const host = serverConfig.appUrl || window.location.origin;
		if (searchWidgetIframe && searchWidgetCode) {
			const widgetUrl = `${host}/search-widget`;
			searchWidgetIframe.src = widgetUrl;
			searchWidgetCode.textContent = `<iframe src="${widgetUrl}" width="100%" height="480" style="border:1px solid rgba(255,255,255,0.1); border-radius:12px; background:#000;"></iframe>`;
		}
		if (fullEmbedCode) {
			const fullEmbedUrl = `${host}/?embed=true`;
			fullEmbedCode.textContent = `<iframe src="${fullEmbedUrl}" width="100%" height="700" style="border:1px solid rgba(255,255,255,0.1); border-radius:12px; background:#000;"></iframe>`;
		}
	}

	// Pre-initialize with current origin
	updateIframeEmbedCodes();

	// Parse query parameters for embed mode (removes header/footer/docs but keeps main styling)
	const urlParams = new URLSearchParams(window.location.search);
	const isEmbed = urlParams.get('embed') === 'true';
	if (isEmbed) {
		const header = document.querySelector('.app-header');
		const footer = document.querySelector('.app-footer');
		const apiDoc = document.getElementById('api-doc');
		const container = document.querySelector('.container');

		if (header) header.style.display = 'none';
		if (footer) footer.style.display = 'none';
		if (apiDoc) apiDoc.style.display = 'none';
		if (container) {
			container.style.paddingTop = '1rem';
			container.style.paddingBottom = '1rem';
		}
	}

	// Leaflet Map instance container
	let serverMapObj = null;

	// Haversine formula to calculate distance in km between two lat/lng coordinates
	function calculateDistance(lat1, lon1, lat2, lon2) {
		const R = 6371; // Earth's radius in km
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLon = ((lon2 - lon1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	// DOM Elements
	const detectForm = document.getElementById('detect-form');
	const targetUrlInput = document.getElementById('target-url');
	const submitBtn = document.getElementById('submit-btn');

	// States
	const scanningState = document.getElementById('scanning-state');
	const resultsState = document.getElementById('results-state');
	const errorState = document.getElementById('error-state');
	const scannerStep = document.getElementById('scanner-step');
	const scannerProgressBar = document.getElementById('scanner-progress-bar');

	// Results Elements
	const detectedTechName = document.getElementById('detected-tech-name');
	const resolvedUrlLink = document.getElementById('resolved-url-link');
	const resultStatusLabel = document.getElementById('result-status-label');
	const techIconContainer = document.getElementById('tech-icon-container');
	const _confidencePercent = document.getElementById('confidence-percent');
	const _confidenceCircle = document.getElementById('confidence-circle');
	const signalsContainer = document.getElementById('signals-container');
	const totalRulesCount = document.getElementById('total-rules-count');
	const matchedRulesCount = document.getElementById('matched-rules-count');
	const httpStatusCode = document.getElementById('http-status-code');
	const comparisonContainer = document.getElementById('comparison-container');
	const retryBtn = document.getElementById('retry-btn');

	// Settings Panel Elements (Removed from UI)

	// Tabs Elements
	const tabButtons = document.querySelectorAll('.results-tabs .tab-btn');
	const tabPanes = document.querySelectorAll('.tab-pane');

	// BuiltWith Elements
	const bwMissingKeyBanner = document.getElementById('bw-missing-key-banner');
	const _bwResultsContainer = document.getElementById('bw-results-container');
	const bwApiKeyBannerInput = document.getElementById('bw-api-key-banner');
	const bwSaveKeyBannerBtn = document.getElementById('bw-save-key-banner-btn');
	const _bwSpendLabel = document.getElementById('bw-spend-label');
	const _bwSpendChart = document.getElementById('bw-spend-chart');
	const _bwTechCount = document.getElementById('bw-tech-count');
	const _bwHistTechCount = document.getElementById('bw-hist-tech-count');
	const _bwActiveTechGrid = document.getElementById('bw-active-tech-grid');
	const _bwHistoricalTechGrid = document.getElementById('bw-historical-tech-grid');
	const bwSubTabButtons = document.querySelectorAll('.sub-tab-btn');
	const bwSubPanes = document.querySelectorAll('.bw-sub-pane');

	// Fetch server configuration info
	async function fetchServerConfig() {
		try {
			const res = await fetch('/api/config');
			const data = await res.json();
			serverConfig = data;
			window.serverConfig = data; // Export global para handleLogoError

			// Update placeholders on banner inputs if set on server
			if (serverConfig.builtwith) {
				if (bwApiKeyBannerInput)
					bwApiKeyBannerInput.placeholder = 'Configurado en el servidor (.env)';
			}

			// Show email report button if SMTP is configured on the server
			const openEmailBtn = document.getElementById('open-email-report-btn');
			if (openEmailBtn && serverConfig.emailEnabled) {
				openEmailBtn.style.display = 'inline-flex';
			}

			// Update iframe embed codes with production APP_URL if configured
			updateIframeEmbedCodes();

			// Update cURL and API documentation examples with APP_URL if configured
			if (serverConfig.appUrl) {
				const ids = [
					'curl-post-detect',
					'curl-get-detect',
					'curl-get-infra',
					'curl-post-pagespeed',
					'curl-post-report',
					'curl-get-widget',
					'curl-get-search-widget',
				];
				ids.forEach((id) => {
					const el = document.getElementById(id);
					if (el) {
						el.textContent = el.textContent.replaceAll(
							'http://localhost:3000',
							serverConfig.appUrl.replace(/\/$/, '')
						);
					}
				});
			}

			// Render independent versions in the footer
			if (serverConfig.versions) {
				const vDisplay = document.getElementById('app-versions-display');
				if (vDisplay) {
					vDisplay.textContent = `CLI: v${serverConfig.versions.cli} | Interfaz: v${serverConfig.versions.ui} | API: v${serverConfig.versions.api}`;
				}
			}
		} catch (err) {
			console.error('Error fetching server config:', err);
		}
	}

	// Load settings from localStorage
	function loadSettings() {
		if (bwApiKeyBannerInput)
			bwApiKeyBannerInput.value = localStorage.getItem('rapid_api_key') || '';
	}

	// Banner actions
	if (bwSaveKeyBannerBtn) {
		bwSaveKeyBannerBtn.addEventListener('click', () => {
			const val = bwApiKeyBannerInput.value.trim();
			localStorage.setItem('rapid_api_key', val);
			alert('API Key de RapidAPI guardada. Analizando sitio...');
			bwMissingKeyBanner.classList.add('hidden');
			performDetection(targetUrlInput.value.trim());
		});
	}

	// Tab switching
	tabButtons.forEach((btn) => {
		btn.addEventListener('click', () => {
			tabButtons.forEach((b) => {
				b.classList.remove('active');
			});
			tabPanes.forEach((p) => {
				p.classList.remove('active');
			});

			btn.classList.add('active');
			const targetId = btn.getAttribute('data-target');
			const targetPane = document.getElementById(targetId);
			if (targetPane) targetPane.classList.add('active');
		});
	});

	// BuiltWith sub-tab switching
	bwSubTabButtons.forEach((btn) => {
		btn.addEventListener('click', () => {
			bwSubTabButtons.forEach((b) => {
				b.classList.remove('active');
			});
			bwSubPanes.forEach((p) => {
				p.classList.remove('active');
			});

			btn.classList.add('active');
			const targetId = btn.getAttribute('data-bwtab');
			const targetPane = document.getElementById(targetId);
			if (targetPane) targetPane.classList.add('active');
		});
	});

	// Initialize
	loadSettings();
	fetchServerConfig();

	// Copy Code Functionality
	const copyButtons = document.querySelectorAll('.copy-code-btn');
	copyButtons.forEach((btn) => {
		btn.addEventListener('click', () => {
			const targetId = btn.getAttribute('data-target');
			const codeElement = document.getElementById(targetId);
			if (codeElement) {
				navigator.clipboard
					.writeText(codeElement.textContent)
					.then(() => {
						const _icon = btn.querySelector('i');
						btn.innerHTML = '<i data-lucide="check" style="color: #10b981;"></i>';
						lucide.createIcons();
						setTimeout(() => {
							btn.innerHTML = '<i data-lucide="copy"></i>';
							lucide.createIcons();
						}, 2000);
					})
					.catch((err) => {
						console.error('Error copying code: ', err);
					});
			}
		});
	});

	// Handle Form Submission
	detectForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const urlVal = targetUrlInput.value.trim();
		if (!urlVal) return;

		await performDetection(urlVal);
	});

	// Retry action
	retryBtn.addEventListener('click', () => {
		errorState.classList.add('hidden');
		detectForm.scrollIntoView({ behavior: 'smooth' });
		targetUrlInput.focus();
	});

	// Preload screenshot images helper
	function preloadImage(url) {
		if (!url) return Promise.resolve();
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = () => resolve(url);
			img.onerror = () => resolve(url);
			img.src = url;
			setTimeout(() => resolve(url), 4000);
		});
	}

	// Perform detection flow
	async function performDetection(targetUrl) {
		// Update URL with query param temporarily during scan
		try {
			const urlObj = new URL(window.location);
			urlObj.searchParams.delete('report');
			urlObj.searchParams.set('url', targetUrl);
			window.history.pushState({}, '', urlObj);
		} catch (e) {}

		// Reset PageSpeed card
		const pagespeedCard = document.getElementById('pagespeed-card');
		const pagespeedLoader = document.getElementById('pagespeed-loader');
		const pagespeedContent = document.getElementById('pagespeed-content');
		if (pagespeedCard) pagespeedCard.style.display = 'block';
		if (pagespeedLoader) pagespeedLoader.style.display = 'flex';
		if (pagespeedContent) pagespeedContent.classList.add('hidden');

		// Reset views
		resultsState.classList.add('hidden');
		errorState.classList.add('hidden');
		scanningState.classList.remove('hidden');

		// Reset product count
		const productCountContainer = document.getElementById('product-count-container');
		const productCountVal = document.getElementById('product-count-val');
		if (productCountContainer) productCountContainer.style.display = 'none';
		if (productCountVal) productCountVal.textContent = '0';

		// Disable submit
		submitBtn.disabled = true;

		// Scroll to scanning loader
		scanningState.scrollIntoView({ behavior: 'smooth', block: 'center' });

		// Progress visualization sequence
		const steps = [
			{ text: 'Nos estamos metiendo a husmear... 🕵️', progress: 15 },
			{ text: 'Leyendo código fuente y analizando tecnologías... 📜', progress: 40 },
			{ text: 'Tomando capturas del sitio y midiendo velocidad... 📸⚡', progress: 70 },
			{ text: 'Armando el expediente chismoso con métricas completas... 📝', progress: 90 },
		];

		let currentStep = 0;
		const interval = setInterval(() => {
			if (currentStep < steps.length) {
				scannerStep.textContent = steps[currentStep].text;
				scannerProgressBar.style.width = `${steps[currentStep].progress}%`;
				currentStep++;
			}
		}, 450);

		try {
			// Trigger actual API request
			const response = await fetch('/api/detect', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					url: targetUrl,
					rapidApiKey: localStorage.getItem('rapid_api_key') || '',
				}),
			});

			const data = await response.json();

			if (data.success) {
				// Preload screenshot images before revealing the results
				const screenshotPromises = [];
				if (data.screenshots?.desktop) {
					screenshotPromises.push(preloadImage(data.screenshots.desktop));
				}
				if (data.screenshots?.mobile) {
					screenshotPromises.push(preloadImage(data.screenshots.mobile));
				}

				// If pagespeed was not attached directly, fetch in parallel as fallback
				let pageSpeedPromise = Promise.resolve(data.pagespeed);
				if (!data.pagespeed) {
					pageSpeedPromise = fetch('/api/pagespeed', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ url: targetUrl }),
					})
						.then((r) => r.json())
						.catch(() => null);
				}

				const [_, pageSpeedData] = await Promise.all([
					Promise.all(screenshotPromises),
					pageSpeedPromise,
				]);

				if (pageSpeedData) {
					data.pagespeed = pageSpeedData;
				}

				// Clear the mock interval and fill progress to 100%
				clearInterval(interval);
				scannerProgressBar.style.width = '100%';
				scannerStep.textContent = '¡Ya tenemos el chisme completo! 🎉';

				// Save the report to get a shareable ID
				try {
					const saveRes = await fetch('/api/save-report', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data),
					});
					const saveJson = await saveRes.json();
					if (saveJson.success && saveJson.reportId) {
						const urlObj = new URL(window.location);
						urlObj.searchParams.delete('url');
						urlObj.searchParams.set('report', saveJson.reportId);
						window.history.pushState({}, '', urlObj);
					}
				} catch (e) {
					console.warn('Could not save report state for sharing', e);
				}

				// Smooth transition to results
				setTimeout(() => {
					scanningState.classList.add('hidden');
					submitBtn.disabled = false;
					renderResults(data);
				}, 250);
			} else {
				clearInterval(interval);
				scanningState.classList.add('hidden');
				submitBtn.disabled = false;
				showError(data.error || 'Algo salió mal al espiar la página... 😵');
			}
		} catch (_err) {
			clearInterval(interval);
			scanningState.classList.add('hidden');
			submitBtn.disabled = false;
			showError(
				'No pudimos conectar con el servidor... ¿Anda prendido? Checa y vuelve a intentar 🔌'
			);
		}
	}

	// Render PageSpeed data inside card
	function renderPageSpeedData(data) {
		const pagespeedCard = document.getElementById('pagespeed-card');
		const pagespeedLoader = document.getElementById('pagespeed-loader');
		const pagespeedContent = document.getElementById('pagespeed-content');

		if (!pagespeedCard) return;
		pagespeedCard.style.display = 'block';

		if (data && data.success) {
			if (pagespeedLoader) pagespeedLoader.style.display = 'none';
			if (pagespeedContent) pagespeedContent.classList.remove('hidden');

			// Helper to update individual gauge (radius 34, circumference 214)
			const updateGauge = (scoreValId, scoreCircleId, badgeId, scoreValue) => {
				const hasScore = scoreValue !== null && scoreValue !== undefined && !isNaN(scoreValue);
				const score = hasScore ? Number(scoreValue) : null;
				const scoreValEl = document.getElementById(scoreValId);
				if (scoreValEl) scoreValEl.textContent = score !== null ? score : '-';

				const scoreCircleEl = document.getElementById(scoreCircleId);
				if (scoreCircleEl) {
					const offset = score !== null ? 214 - (214 * score) / 100 : 214;
					scoreCircleEl.style.strokeDashoffset = offset;

					if (score === null) {
						scoreCircleEl.setAttribute('stroke', '#4b5563');
					} else if (score >= 90) {
						scoreCircleEl.setAttribute('stroke', '#25d366'); // green
					} else if (score >= 50) {
						scoreCircleEl.setAttribute('stroke', '#f59e0b'); // orange
					} else {
						scoreCircleEl.setAttribute('stroke', '#ef4444'); // red
					}
				}

				const badgeEl = document.getElementById(badgeId);
				if (badgeEl) {
					const suffix = data.isDemo ? ' (Simulado)' : '';
					if (score === null) {
						badgeEl.textContent = `N/D${suffix}`;
						badgeEl.style.background = 'rgba(156, 163, 175, 0.1)';
						badgeEl.style.color = '#9ca3af';
						badgeEl.style.border = '1px solid rgba(156, 163, 175, 0.2)';
					} else if (score >= 90) {
						badgeEl.textContent = `Bueno${suffix}`;
						badgeEl.style.background = 'rgba(37, 211, 102, 0.1)';
						badgeEl.style.color = '#25d366';
						badgeEl.style.border = '1px solid rgba(37, 211, 102, 0.2)';
					} else if (score >= 50) {
						badgeEl.textContent = `Regular${suffix}`;
						badgeEl.style.background = 'rgba(245, 158, 11, 0.1)';
						badgeEl.style.color = '#f59e0b';
						badgeEl.style.border = '1px solid rgba(245, 158, 11, 0.2)';
					} else {
						badgeEl.textContent = `Malo${suffix}`;
						badgeEl.style.background = 'rgba(239, 68, 68, 0.1)';
						badgeEl.style.color = '#ef4444';
						badgeEl.style.border = '1px solid rgba(239, 68, 68, 0.2)';
					}
				}
			};

			// Update the three gauges
			const scores = data.scores || {};
			updateGauge(
				'pagespeed-score-val',
				'pagespeed-score-circle',
				'pagespeed-level-badge',
				scores.performance
			);
			updateGauge(
				'pagespeed-acc-val',
				'pagespeed-acc-circle',
				'pagespeed-acc-badge',
				scores.accessibility
			);
			updateGauge('pagespeed-seo-val', 'pagespeed-seo-circle', 'pagespeed-seo-badge', scores.seo);

			// Metrics values
			if (data.metrics) {
				if (document.getElementById('ps-metric-fcp'))
					document.getElementById('ps-metric-fcp').textContent = data.metrics.fcp || 'N/A';
				if (document.getElementById('ps-metric-lcp'))
					document.getElementById('ps-metric-lcp').textContent = data.metrics.lcp || 'N/A';
				if (document.getElementById('ps-metric-tbt'))
					document.getElementById('ps-metric-tbt').textContent = data.metrics.tbt || 'N/A';
				if (document.getElementById('ps-metric-cls'))
					document.getElementById('ps-metric-cls').textContent = data.metrics.cls || 'N/A';
				if (document.getElementById('ps-metric-speedindex'))
					document.getElementById('ps-metric-speedindex').textContent =
						data.metrics.speedIndex || 'N/A';
				if (document.getElementById('ps-metric-interactive'))
					document.getElementById('ps-metric-interactive').textContent =
						data.metrics.interactive || 'N/A';
			}
		} else {
			if (pagespeedLoader) {
				pagespeedLoader.innerHTML = `
          <i data-lucide="alert-circle" style="width: 24px; height: 24px; color: var(--danger);"></i>
          <span style="font-size: 0.82rem; color: var(--danger); text-align: center; margin-top: 0.25rem;">Error PageSpeed: ${data?.error || 'No se pudo completar la auditoría.'}</span>
        `;
				lucide.createIcons();
			}
		}
	}

	// Asynchronously fetch PageSpeed metrics as standalone fallback
	async function fetchPageSpeed(targetUrl) {
		const pagespeedLoader = document.getElementById('pagespeed-loader');

		try {
			const res = await fetch('/api/pagespeed', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ url: targetUrl }),
			});
			const data = await res.json();
			if (lastScanData) {
				lastScanData.pagespeed = data;
			}
			renderPageSpeedData(data);
		} catch (err) {
			console.error('PageSpeed fetch error:', err);
			if (pagespeedLoader) {
				pagespeedLoader.innerHTML = `
          <i data-lucide="alert-circle" style="width: 24px; height: 24px; color: var(--danger);"></i>
          <span style="font-size: 0.82rem; color: var(--danger); margin-top: 0.25rem;">Error de conexión con el servidor.</span>
        `;
				lucide.createIcons();
			}
		}
	}

	// Track the latest scan data for email and download reports
	let lastScanData = null;

	// Render scan results in dashboard
	function renderResults(data) {
		lastScanData = data;
		resultsState.classList.remove('hidden');
		resultsState.scrollIntoView({ behavior: 'smooth' });

		// Render PageSpeed section
		if (data.pagespeed) {
			renderPageSpeedData(data.pagespeed);
		} else {
			fetchPageSpeed(data.resolvedUrl || targetUrlInput.value.trim());
		}

		// Render screenshots and site preview header if available
		const headerPreviewsContainer = document.getElementById('header-previews-container');
		const screenshotDesktopImg = document.getElementById('screenshot-desktop-img');
		const screenshotMobileImg = document.getElementById('screenshot-mobile-img');

		let siteDomain = '';
		try {
			if (data.resolvedUrl || data.url) {
				siteDomain = new URL(data.resolvedUrl || data.url).hostname.replace(/^www\./i, '');
			}
		} catch (_e) {}

		const hasScreenshots = !!(data.screenshots?.desktop || data.screenshots?.mobile);
		const hasSiteLogoOrUrl = !!(data.siteLogo || siteDomain);

		if (hasScreenshots || hasSiteLogoOrUrl) {
			if (headerPreviewsContainer) headerPreviewsContainer.style.display = 'flex';

			const desktopMockup = document.querySelector('.desktop-mockup-mini');
			if (data.screenshots?.desktop) {
				if (screenshotDesktopImg) screenshotDesktopImg.src = data.screenshots.desktop;
				if (desktopMockup) desktopMockup.style.display = 'block';
			} else {
				if (desktopMockup) desktopMockup.style.display = 'none';
			}

			const mobileMockup = document.querySelector('.mobile-mockup-mini');
			if (data.screenshots?.mobile) {
				if (screenshotMobileImg) screenshotMobileImg.src = data.screenshots.mobile;
				if (mobileMockup) mobileMockup.style.display = 'block';
			} else {
				if (mobileMockup) mobileMockup.style.display = 'none';
			}
		} else {
			if (headerPreviewsContainer) headerPreviewsContainer.style.display = 'none';
		}

		// Render Scraped Site Logo with Contrast Analysis
		const siteLogoContainer = document.getElementById('site-logo-container');
		const siteLogoImg = document.getElementById('site-logo-img');
		const siteLogoFallback = document.getElementById('site-logo-fallback');

		const initialChar = (siteDomain || 'W').charAt(0).toUpperCase();

		if (siteLogoContainer && siteLogoImg && siteLogoFallback) {
			siteLogoFallback.textContent = initialChar || '🌐';
			siteLogoFallback.style.display = 'flex';
			siteLogoImg.style.display = 'none';

			const candidateLogo =
				data.siteLogo ||
				(siteDomain
					? `https://img.logo.dev/${siteDomain}?token=pk_MgKPAkEuRMOiYecOkx67wQ&size=64`
					: '');

			if (candidateLogo) {
				siteLogoImg.crossOrigin = 'anonymous';
				siteLogoImg.src = candidateLogo;
				siteLogoImg.onload = () => {
					siteLogoImg.style.display = 'block';
					siteLogoFallback.style.display = 'none';
					window.analyzeAndApplyImageContrast(siteLogoImg, siteLogoContainer);
				};
				siteLogoImg.onerror = () => {
					const fallbackUrl = siteDomain
						? `https://www.google.com/s2/favicons?domain=${siteDomain}&sz=128`
						: '';
					if (fallbackUrl && siteLogoImg.src !== fallbackUrl) {
						siteLogoImg.crossOrigin = 'anonymous';
						siteLogoImg.src = fallbackUrl;
					} else {
						siteLogoImg.style.display = 'none';
						siteLogoFallback.style.display = 'flex';
					}
				};
			}
		}

		// Resolved URL
		if (resolvedUrlLink) {
			resolvedUrlLink.href = data.resolvedUrl;
			resolvedUrlLink.textContent = data.resolvedUrl;
		}

		// Scan Date
		const scanDateContainer = document.getElementById('scan-date-container');
		const scanDateVal = document.getElementById('scan-date-val');
		if (scanDateContainer && scanDateVal && data.scanDate) {
			const formattedDate = new Date(data.scanDate).toLocaleString('es-MX', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			});
			scanDateVal.textContent = formattedDate;
			scanDateContainer.style.display = 'block';

			const footerScanDate = document.getElementById('footer-scan-date');
			if (footerScanDate) {
				footerScanDate.textContent = `Generado el ${formattedDate}`;
			}
		} else if (scanDateContainer) {
			scanDateContainer.style.display = 'none';
		}

		// Render Server Location Map & Latency
		const mapCard = document.getElementById('map-card');
		if (mapCard) {
			if (data.location?.success && data.location.ll) {
				mapCard.style.display = 'block';

				const ip = data.location.ip || 'Desconocida';
				const country = data.location.country || '';
				const region = data.location.region || '';
				const city = data.location.city || '';
				const timezone = data.location.timezone || 'Desconocida';
				const serverCoords = data.location.ll; // [lat, lon]

				// Update labels
				document.getElementById('server-ip-val').textContent = ip;
				document.getElementById('server-location-val').textContent =
					`${city ? `${city}, ` : ''}${region ? `${region}, ` : ''}${country}`;

				// Mexico City representative coords
				const mexLat = 19.4326;
				const mexLon = -99.1332;
				const distance = calculateDistance(serverCoords[0], serverCoords[1], mexLat, mexLon);

				// Approximate latency based on distance (speed of light in fiber, routing hops overhead)
				const estLatency = Math.round((distance / 100) * 1.25 + 22);
				document.getElementById('mexico-latency-val').textContent = `${estLatency} ms`;

				// Leaflet Map Init/Update
				setTimeout(() => {
					if (!serverMapObj) {
						serverMapObj = L.map('server-map', {
							zoomControl: true,
							scrollWheelZoom: false,
						});
						L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
							attribution: '&copy; OpenStreetMap contributors',
						}).addTo(serverMapObj);
					}

					serverMapObj.setView(serverCoords, 4);

					// Clear previous layers/markers
					serverMapObj.eachLayer((layer) => {
						if (layer instanceof L.Marker) {
							serverMapObj.removeLayer(layer);
						}
					});

					// Add neon pulse-styled marker
					const marker = L.marker(serverCoords).addTo(serverMapObj);

					// Tooltip on hover showing Country, State, City, and Timezone
					const tooltipContent = `
            <div style="font-family: 'Outfit', sans-serif; font-size: 0.8rem; line-height: 1.4; color: #fff; padding: 2px;">
              <strong style="color: var(--accent-turquoise);">Servidor del Dominio</strong><br/>
              <b>País:</b> ${country || 'N/A'}<br/>
              <b>Estado/Región:</b> ${region || 'N/A'}<br/>
              <b>Ciudad:</b> ${city || 'N/A'}<br/>
              <b>Timezone:</b> ${timezone}
            </div>
          `;

					marker.bindTooltip(tooltipContent, {
						permanent: false,
						direction: 'top',
						className: 'leaflet-custom-tooltip',
					});

					// Trigger tooltip manually on mouseover
					marker.on('mouseover', function (_e) {
						this.openTooltip();
					});
					marker.on('mouseout', function (_e) {
						this.closeTooltip();
					});

					// Force layout recalculation
					serverMapObj.invalidateSize();
				}, 100);
			} else {
				mapCard.style.display = 'none';
			}
		}

		// Platform icons map
		const techIcons = {
			Shopify: 'sparkles',
			Magento: 'store',
			WooCommerce: 'shopping-cart',
			PrestaShop: 'bag',
			VTEX: 'database',
		};

		const detectedThemeContainer = document.getElementById('detected-theme-container');
		const detectedThemeName = document.getElementById('detected-theme-name');

		const confidenceTextBadge = document.getElementById('confidence-text-badge');

		if (data.detected) {
			if (detectedTechName) detectedTechName.textContent = data.technology;
			if (resultStatusLabel) {
				resultStatusLabel.textContent = 'Detectado con Éxito';
				resultStatusLabel.className = 'result-status-badge';
			}

			if (confidenceTextBadge) {
				confidenceTextBadge.textContent = `${Math.round(data.confidence * 100)}% Segurísimo ✨`;
				confidenceTextBadge.style.display = 'inline-block';
			}

			if (data.theme) {
				if (detectedThemeName) detectedThemeName.textContent = data.theme;
				if (detectedThemeContainer) detectedThemeContainer.style.display = 'block';
			} else {
				if (detectedThemeContainer) detectedThemeContainer.style.display = 'none';
			}

			const iconName = techIcons[data.technology] || 'shopping-bag';

			const cmsDomains = {
				Shopify: 'shopify.com',
				Magento: 'magento.com',
				WooCommerce: 'woocommerce.com',
				PrestaShop: 'prestashop.com',
				VTEX: 'vtex.com',
				Odoo: 'odoo.com',
			};
			const cmsDom = cmsDomains[data.technology];
			const logoToken = 'pk_MgKPAkEuRMOiYecOkx67wQ';

			if (techIconContainer) {
				if (cmsDom) {
					techIconContainer.innerHTML = `
            <img src="https://img.logo.dev/${cmsDom}?token=${logoToken}&size=64" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px; display: block;" onload="window.handleLogoLoad(this, '${cmsDom}')" onerror="window.handleLogoError(this, '${cmsDom}')" />
            <i data-lucide="${iconName}" style="display:none; width: 22px; height: 22px;"></i>
          `;
					techIconContainer.style.background = '#ffffff';
					techIconContainer.style.border = '2px solid var(--gel-blue, #00a8ff)';
				} else {
					techIconContainer.innerHTML = `<i data-lucide="${iconName}" style="width: 22px; height: 22px;"></i>`;
					techIconContainer.style.background =
						'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)';
					techIconContainer.style.border = '2px solid var(--gel-blue, #00a8ff)';
				}
			}
		} else {
			if (detectedTechName) {
				detectedTechName.innerHTML =
					'¿Tu CMS no se detecta? <span style="font-size:0.6em; opacity:0.9; font-weight:normal; display:block; margin-top:5px;">Solicita que se añada a la lista</span>';
			}
			if (detectedThemeContainer) detectedThemeContainer.style.display = 'none';
			if (resultStatusLabel) {
				resultStatusLabel.textContent = 'Desconocido';
				resultStatusLabel.className = 'result-status-badge undetected';
			}
			if (confidenceTextBadge) {
				confidenceTextBadge.style.display = 'none';
			}
			if (techIconContainer) {
				techIconContainer.innerHTML = `<i data-lucide="help-circle"></i>`;
				techIconContainer.style.background = 'rgba(255, 255, 255, 0.05)';
				techIconContainer.style.border = '';
			}
		}

		// Render Stats
		if (httpStatusCode) {
			httpStatusCode.textContent = '200 OK';
			httpStatusCode.className = 'meta-value success-text';
		}

		// Count total rules in configurations
		const totalRules = 33; // Pre-calculated matching total rules count
		if (totalRulesCount) totalRulesCount.textContent = totalRules;

		// Render Signals
		if (signalsContainer) {
			signalsContainer.innerHTML = '';
		}
		let matchCount = 0;

		if (data.detected && data.matches) {
			// Loop over detected technology rules
			const activeTechMatches = data.matches[data.technology];
			if (activeTechMatches?.matchedRules) {
				matchCount = activeTechMatches.matchedRules.length;

				activeTechMatches.matchedRules.forEach((rule) => {
					const item = document.createElement('div');
					item.className = 'signal-item';

					item.innerHTML = `
            <div class="signal-meta">
              <span class="signal-type-badge ${rule.type}">${rule.type}</span>
              <span style="font-size: 0.8rem; color: var(--text-dark); font-weight:600;">Peso: ${rule.weight}</span>
            </div>
            <div class="signal-desc">${rule.description}</div>
            <div class="signal-context">${escapeHtml(rule.context)}</div>
          `;
					if (signalsContainer) signalsContainer.appendChild(item);
				});
			}
		}

		if (matchedRulesCount) matchedRulesCount.textContent = matchCount;

		if (matchCount === 0 && signalsContainer) {
			signalsContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-dark); padding: 2rem;">
          <i data-lucide="help-circle" style="width: 48px; height: 48px; margin-bottom: 0.5rem; stroke-width:1;"></i>
          <p>No se encontraron firmas o patrones coincidentes de Shopify, Magento, WooCommerce, PrestaShop, VTEX u Odoo en este sitio.</p>
        </div>
      `;
		}

		// Render Comparisons side list
		if (comparisonContainer) {
			comparisonContainer.innerHTML = '';
			const platforms = ['Shopify', 'Magento', 'WooCommerce', 'PrestaShop', 'VTEX', 'Odoo'];

			platforms.forEach((p) => {
				const matchDetails = data.matches?.[p];
				const pConf = matchDetails?.detected ? matchDetails.confidence : 0;
				const pPercent = Math.round(pConf * 100);

				const compItem = document.createElement('div');
				compItem.className = 'comparison-item';
				compItem.style.cursor = 'pointer';
				compItem.title = `Clic para ver los exámenes evaluados para ${p}`;

				compItem.innerHTML = `
          <span class="comp-tech" style="display:flex; align-items:center; gap:4px;">${p} <span style="font-size:0.68rem; opacity:0.7;">📝</span></span>
          <div class="comp-bar-wrapper">
            <div class="comp-bar-bg">
              <div class="comp-bar-fill ${p === data.technology ? 'active' : ''}" style="width: ${pPercent}%"></div>
            </div>
            <span class="comp-val">${pPercent}%</span>
          </div>
        `;
				compItem.addEventListener('click', () => openExamsModal(p));
				comparisonContainer.appendChild(compItem);
			});
		}

		// Render Unified Dashboard
		renderUnifiedDashboard(data);

		// Update Embeddable Widget preview and code
		const widgetIframe = document.getElementById('widget-preview-iframe');
		const widgetCode = document.getElementById('widget-embed-code');
		if (widgetIframe && widgetCode) {
			const host = serverConfig.appUrl || window.location.origin;
			const widgetUrl = `${host}/widget?url=${encodeURIComponent(data.resolvedUrl)}`;
			widgetIframe.src = widgetUrl;
			widgetCode.textContent = `<iframe src="${widgetUrl}" width="320" height="120" style="border:none; border-radius:8px;"></iframe>`;
		}

		// Re-create icons dynamically
		lucide.createIcons();
	}

	// Helper to create tech item cards
	function createTechItemCard(tech, defaultCategory = 'Tecnología') {
		const card = document.createElement('div');
		card.className = 'plugin-card';
		card.style.padding = '0.75rem';
		card.style.cursor = 'pointer';
		card.title = `Haz clic para ver las pruebas y detalles de ${tech.name}`;

		let domain = '';
		let provider = '';
		if (tech.logo && typeof tech.logo === 'object') {
			domain = tech.logo.id;
			provider = tech.logo.provider;
		} else if (tech.logo) {
			domain = tech.logo;
		}

		const techWebsite = tech.web || tech.website || tech.link || '';
		if (!domain && techWebsite) {
			try {
				domain = new URL(techWebsite).hostname.replace(/^www\./i, '');
			} catch (_e) {}
		}

		const iconUrl = getTechIconUrl(tech);
		const initial = (tech.name || '').trim().charAt(0).toUpperCase() || '?';
		const iconHtml = iconUrl
			? `<img src="${iconUrl}" class="tech-icon-img" onload="window.handleLogoLoad(this, '${domain || ''}', '${techWebsite}', '${provider || ''}')" onerror="window.handleLogoError(this, '${domain || ''}', '${techWebsite}', '${provider || ''}')" />`
			: '';
		const displayStyle = iconUrl ? 'display: none;' : 'display: flex;';

		let infoHtml = '';
		if (tech.firstSeen) {
			infoHtml = `<span style="font-size:0.62rem; color:var(--ink-medium); opacity:0.8;">Visto: ${tech.firstSeen}</span>`;
		} else {
			infoHtml = `<span style="font-size:0.65rem; color:var(--gel-purple); font-weight:600; display:flex; align-items:center; gap:0.2rem;">Ver pruebas 🔍</span>`;
		}

		card.innerHTML = `
      <div class="plugin-header" style="display: flex; align-items: center; gap: 0.65rem; margin: 0; width: 100%;">
        <div class="tech-icon-container-mini" style="position: relative; width: 30px; height: 30px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
          ${iconHtml}
          <div class="tech-icon-mini" style="${displayStyle}">${initial}</div>
        </div>
        <div class="plugin-title-info" style="display: flex; flex-direction: column; flex-grow: 1; min-width: 0;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%;">
            <h4 style="margin: 0; font-size: 0.88rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(tech.name)}</h4>
            <span class="plugin-category" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">${escapeHtml(tech.category || defaultCategory)}</span>
          </div>
          <div style="display: flex; align-items: center; justify-content: flex-end; margin-top: 0.15rem; font-size: 0.62rem;">
            ${infoHtml}
          </div>
        </div>
      </div>
    `;

		card.addEventListener('click', () => {
			openAppDetailModal(tech);
		});

		return card;
	}

	function createEmptySectionNotice(iconName, message) {
		const div = document.createElement('div');
		div.className = 'empty-section-notice';
		div.innerHTML = `
      <i data-lucide="${iconName}"></i>
      <p style="margin: 0;">${message}</p>
    `;
		return div;
	}

	// Render scan results into independent section notes
	function renderUnifiedDashboard(data) {
		// 1. APPS & PLUGINS SECTION
		const appsGrid = document.getElementById('apps-tech-grid');
		const appsCountBadge = document.getElementById('apps-count-badge');
		const appsList = Array.isArray(data.plugins) ? data.plugins : [];

		if (appsGrid) {
			appsGrid.innerHTML = '';
			if (appsCountBadge) appsCountBadge.textContent = appsList.length;

			if (appsList.length > 0) {
				const pluginsGrid = document.createElement('div');
				pluginsGrid.className = 'plugins-grid';
				appsList.forEach((app) => {
					pluginsGrid.appendChild(createTechItemCard(app, 'App'));
				});
				appsGrid.appendChild(pluginsGrid);
			} else {
				appsGrid.appendChild(
					createEmptySectionNotice(
						'package-search',
						'🤷 No le encontramos apps o plugins instalados... ¡anda bien discreto!'
					)
				);
			}
		}

		// 2. INFRASTRUCTURE & NETWORK SECTION
		const infraGrid = document.getElementById('infra-tech-grid');
		const infraCountBadge = document.getElementById('infra-count-badge');
		const infraList = Array.isArray(data.infrastructure) ? data.infrastructure : [];

		if (infraGrid) {
			infraGrid.innerHTML = '';
			if (infraCountBadge) infraCountBadge.textContent = infraList.length;

			if (infraList.length > 0) {
				const pluginsGrid = document.createElement('div');
				pluginsGrid.className = 'plugins-grid';
				infraList.forEach((inf) => {
					pluginsGrid.appendChild(createTechItemCard(inf, 'Infraestructura'));
				});
				infraGrid.appendChild(pluginsGrid);
			} else {
				infraGrid.appendChild(
					createEmptySectionNotice(
						'shield-alert',
						'🤷 No se detectó infraestructura conocida ni CDN pública.'
					)
				);
			}
		}

		// 3. PIXELS & TRACKING SECTION
		const pixelsGrid = document.getElementById('pixels-tech-grid');
		const pixelsCountBadge = document.getElementById('pixels-count-badge');
		const pixelsList = Array.isArray(data.pixels) ? data.pixels : [];

		if (pixelsGrid) {
			pixelsGrid.innerHTML = '';
			if (pixelsCountBadge) pixelsCountBadge.textContent = pixelsList.length;

			if (pixelsList.length > 0) {
				const pluginsGrid = document.createElement('div');
				pluginsGrid.className = 'plugins-grid';
				pixelsList.forEach((px) => {
					pluginsGrid.appendChild(createTechItemCard(px, 'Píxel / Tracking'));
				});
				pixelsGrid.appendChild(pluginsGrid);
			} else {
				pixelsGrid.appendChild(
					createEmptySectionNotice(
						'eye-off',
						'🤷 No se le encontraron píxeles de seguimiento ni etiquetas de tracking activas.'
					)
				);
			}
		}

		// Refresh Lucide icons in dynamically added elements
		lucide.createIcons();

		// 3. Render Payment Gateways
		const paymentGatewaysCard = document.getElementById('payment-gateways-card');
		const paymentGatewaysGrid = document.getElementById('payment-gateways-grid');

		if (paymentGatewaysGrid) paymentGatewaysGrid.innerHTML = '';

		if (data.paymentGateways && data.paymentGateways.length > 0) {
			const logoToken = serverConfig.logoDevToken || 'pk_MgKPAkEuRMOiYecOkx67wQ';
			const gatewayDomains = {
				Stripe: 'stripe.com',
				PayPal: 'paypal.com',
				Klarna: 'klarna.com',
				Conekta: 'conekta.com',
				'Mercado Pago': 'mercadopago.com',
				Openpay: 'openpay.mx',
				Adyen: 'adyen.com',
				Braintree: 'braintreepayments.com',
				dLocal: 'dlocal.com',
				Aplazo: 'aplazo.mx',
				'Kueski Pay': 'kueski.com',
			};

			data.paymentGateways.forEach((gw) => {
				const domain = gatewayDomains[gw];
				const card = document.createElement('div');
				card.className = 'gateway-item-card';
				card.style.cssText = `
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: transform 0.2s ease, border-color 0.2s ease;
        `;

				card.addEventListener('mouseenter', () => {
					card.style.transform = 'translateY(-2px)';
					card.style.borderColor = 'rgba(0, 242, 254, 0.3)';
				});
				card.addEventListener('mouseleave', () => {
					card.style.transform = 'none';
					card.style.borderColor = 'rgba(255, 255, 255, 0.05)';
				});

				let logoHtml = '';
				if (domain) {
					logoHtml = `<img src="https://img.logo.dev/${domain}?token=${logoToken}&size=64" style="width: 100%; height: 100%; object-fit: contain;" onload="window.handleLogoLoad(this, '${domain}')" onerror="window.handleLogoError(this, '${domain}')" />`;
				}

				card.innerHTML = `
          <div style="width: 36px; height: 36px; border-radius: 6px; overflow: hidden; background: rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center; padding: 4px; flex-shrink: 0; border: 1px solid var(--paper-lines);">
            ${logoHtml}
            <i data-lucide="credit-card" style="${domain ? 'display:none;' : ''} width: 20px; height: 20px; color: var(--gel-purple);"></i>
          </div>
          <div style="display: flex; flex-direction: column; min-width: 0;">
            <h4 style="margin: 0; color: var(--ink-dark); font-weight: 700; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(gw)}</h4>
            <span style="font-size: 0.72rem; color: var(--ink-medium); font-style: italic;">Pasarela de Pago</span>
          </div>
        `;
				if (paymentGatewaysGrid) paymentGatewaysGrid.appendChild(card);
			});

			if (paymentGatewaysCard) paymentGatewaysCard.style.display = 'block';
		} else {
			if (paymentGatewaysCard) paymentGatewaysCard.style.display = 'none';
		}
	}

	// Show Error View
	function showError(msg) {
		errorState.classList.remove('hidden');
		errorState.scrollIntoView({ behavior: 'smooth' });
		document.getElementById('error-message').textContent = msg;
	}

	// Utility to escape HTML entities
	function escapeHtml(unsafe) {
		if (unsafe === null || unsafe === undefined) return '';
		return String(unsafe)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	// Helper to extract domain and build logo URL for all providers
	function getTechIconUrl(tech) {
		let domain = '';
		let provider = '';

		if (tech.logo && typeof tech.logo === 'object') {
			domain = tech.logo.id;
			provider = tech.logo.provider;
		} else if (tech.logo) {
			domain = tech.logo;
		}

		if (!domain && (tech.web || tech.website || tech.link)) {
			try {
				domain = new URL(tech.web || tech.website || tech.link).hostname.replace(/^www\./i, '');
			} catch (_e) {}
		}

		const bfKey = window.serverConfig?.brandfetchApiKey
			? `?c=${window.serverConfig.brandfetchApiKey}`
			: '';
		const biKey = window.serverConfig?.brandiconsApiKey
			? `?key=${window.serverConfig.brandiconsApiKey}`
			: '';
		const npKey = window.serverConfig?.ninjapearApiKey
			? `?key=${window.serverConfig.ninjapearApiKey}`
			: '';

		if (provider === 'local' && domain) {
			const hasExt = /\.(svg|png|jpg|jpeg|gif|webp)$/i.test(domain);
			return `/brand/logo/apps/${domain}${hasExt ? '' : '.svg'}`;
		}
		if (provider === 'brandicons' && domain && window.serverConfig?.brandiconsApiKey) {
			return `https://cdn.brandicons.dev/icons/${domain}${biKey}`;
		}
		if (provider === 'brandfetch' && domain && window.serverConfig?.brandfetchApiKey) {
			return `https://asset.brandfetch.io/${domain}${bfKey}`;
		}
		if (provider === 'ninjapear' && domain && window.serverConfig?.ninjapearApiKey) {
			return `https://logo.ninjapear.com/${domain}${npKey}`;
		}
		if (provider === 'duckduckgo' && domain) {
			return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
		}
		if (provider === 'logodev' && domain && window.serverConfig?.logoDevToken) {
			const logoToken = window.serverConfig.logoDevToken;
			return `https://img.logo.dev/${domain}?token=${logoToken}&size=64`;
		}

		const nameLower = tech.name ? tech.name.toLowerCase() : '';
		const isShopifyDomain =
			domain && (domain.includes('shopify.com') || domain.includes('myshopify.com'));
		const isShopifyPlatform = nameLower === 'shopify';

		// Si tenemos un dominio directo
		if (
			domain &&
			domain !== '#' &&
			!domain.includes('github.com') &&
			!domain.includes('wikipedia.org') &&
			!domain.includes('w3.org') &&
			!domain.includes('trends.builtwith.com') &&
			(!isShopifyDomain || isShopifyPlatform)
		) {
			const logoToken = window.serverConfig?.logoDevToken || 'pk_MgKPAkEuRMOiYecOkx67wQ';
			return `https://img.logo.dev/${domain}?token=${logoToken}&size=64`;
		}

		// Predefined domain mapping based on name
		let fallbackDomain = '';
		if (nameLower === 'shopify') fallbackDomain = 'shopify.com';
		else if (nameLower.includes('wordpress')) fallbackDomain = 'wordpress.org';
		else if (nameLower.includes('woocommerce')) fallbackDomain = 'woocommerce.com';
		else if (nameLower.includes('magento')) fallbackDomain = 'magento.com';
		else if (nameLower.includes('prestashop')) fallbackDomain = 'prestashop.com';
		else if (nameLower.includes('vtex')) fallbackDomain = 'vtex.com';
		else if (nameLower.includes('stripe')) fallbackDomain = 'stripe.com';
		else if (nameLower.includes('paypal')) fallbackDomain = 'paypal.com';
		else if (nameLower.includes('facebook')) fallbackDomain = 'facebook.com';
		else if (nameLower.includes('google')) fallbackDomain = 'google.com';
		else if (nameLower.includes('cloudflare')) fallbackDomain = 'cloudflare.com';
		else if (nameLower.includes('jquery')) fallbackDomain = 'jquery.com';
		else if (nameLower.includes('conekta')) fallbackDomain = 'conekta.com';
		else if (nameLower.includes('klaviyo')) fallbackDomain = 'klaviyo.com';
		else if (nameLower.includes('tidio')) fallbackDomain = 'tidio.com';
		else if (nameLower.includes('recaptcha')) fallbackDomain = 'recaptcha.net';
		else if (nameLower.includes('font awesome')) fallbackDomain = 'fontawesome.com';
		else if (nameLower.includes('loox')) fallbackDomain = 'loox.io';
		else if (nameLower.includes('klarna')) fallbackDomain = 'klarna.com';
		else if (nameLower.includes('pagefly')) fallbackDomain = 'pagefly.io';
		else if (nameLower.includes('mercado pago')) fallbackDomain = 'mercadopago.com';
		else if (nameLower.includes('openpay')) fallbackDomain = 'openpay.mx';
		else if (nameLower.includes('wordfence')) fallbackDomain = 'wordfence.com';
		else if (nameLower.includes('contact form 7')) fallbackDomain = 'contactform7.com';
		else if (nameLower.includes('mailchimp')) fallbackDomain = 'mailchimp.com';

		if (fallbackDomain) {
			return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${fallbackDomain}&size=64`;
		}

		return '';
	}

	// Translates English category names to Spanish
	function translateCategory(name) {
		if (!name) return 'Otros';
		const lower = name.toLowerCase().trim();

		if (lower === 'non platform') return 'Aplicaciones detectadas';
		if (lower === 'shopify app' || lower === 'shopify apps') return 'Aplicaciones de Shopify';
		if (
			lower === 'payment' ||
			lower === 'payments' ||
			lower === 'consumer finance' ||
			lower === 'billing' ||
			lower === 'pay later' ||
			lower === 'paylater'
		)
			return 'Métodos de Pago';
		if (
			lower === 'payment gateways' ||
			lower === 'payment gateway' ||
			lower === 'payment processor' ||
			lower === 'payment processors'
		)
			return 'Procesador de Pago';
		if (
			lower === 'hosting' ||
			lower === 'hosting provider' ||
			lower === 'cloud hosting' ||
			lower === 'server location' ||
			lower === 'almacenamiento'
		)
			return 'Ubicación de Almacenamiento';
		if (
			lower === 'cms' ||
			lower === 'shop' ||
			lower === 'ecommerce' ||
			lower === 'e-commerce' ||
			lower === 'platform'
		)
			return 'Plataforma de E-Commerce (CMS)';
		if (lower === 'widgets' || lower === 'widget') return 'Componentes y Widgets';
		if (lower === 'marketing automation' || lower === 'marketing')
			return 'Automatización de Marketing';
		if (lower === 'analytics' || lower === 'tracking') return 'Analítica y Seguimiento';
		if (lower === 'javascript libraries' || lower === 'javascript') return 'Librerías JavaScript';
		if (lower === 'ssl' || lower === 'root authority' || lower === 'certificate')
			return 'Seguridad y SSL';

		return name.charAt(0).toUpperCase() + name.slice(1);
	}

	// Sort comparator to order categories: CMS -> Apps -> Payments -> Rest
	function _compareCategories(catA, catB) {
		const getCategoryPriority = (name) => {
			const lower = name.toLowerCase();

			// 1. CMS / eCommerce / platforms
			if (
				lower.includes('cms') ||
				lower.includes('ecommerce') ||
				lower.includes('e-commerce') ||
				lower.includes('platform') ||
				lower === 'shop' ||
				lower === 'commerce' ||
				lower.includes('plataforma') ||
				lower.includes('tienda')
			) {
				return 1;
			}

			// 2. Applications / Plugins / Widgets / Themes / Modules
			if (
				lower.includes('app') ||
				lower.includes('aplicaciones') ||
				lower.includes('plugin') ||
				lower.includes('addon') ||
				lower.includes('widget') ||
				lower.includes('theme') ||
				lower.includes('módulo') ||
				lower.includes('modulo') ||
				lower.includes('extension') ||
				lower.includes('extensión') ||
				lower.includes('componentes')
			) {
				return 2;
			}

			// 3. Payment Methods / Billing / Finance
			if (
				lower.includes('payment') ||
				lower.includes('pago') ||
				lower.includes('billing') ||
				lower.includes('finance') ||
				lower.includes('pasarela') ||
				lower.includes('cobro') ||
				lower.includes('gateway')
			) {
				return 3;
			}

			// 4. Everything else
			return 10;
		};

		const prioA = getCategoryPriority(catA);
		const prioB = getCategoryPriority(catB);

		if (prioA !== prioB) {
			return prioA - prioB;
		}

		// Alphabetical order if priorities match
		return catA.localeCompare(catB);
	}

	// ─── Download Report Functionality ─────────────────────────────────────────
	const downloadJsonBtn = document.getElementById('download-json-btn');
	const downloadCsvBtn = document.getElementById('download-csv-btn');
	const copyLinkBtn = document.getElementById('copy-link-btn');
	const downloadPdfBtn = document.getElementById('download-pdf-btn');

	function downloadFile(content, fileName, contentType) {
		const a = document.createElement('a');
		const file = new Blob([content], { type: contentType });
		a.href = URL.createObjectURL(file);
		a.download = fileName;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	if (copyLinkBtn) {
		copyLinkBtn.addEventListener('click', () => {
			navigator.clipboard
				.writeText(window.location.href)
				.then(() => {
					const originalText = copyLinkBtn.innerHTML;
					copyLinkBtn.innerHTML =
						'<i data-lucide="check" style="width:15px;height:15px;color:#10b981;"></i> ¡Copiado!';
					lucide.createIcons();
					setTimeout(() => {
						copyLinkBtn.innerHTML = originalText;
						lucide.createIcons();
					}, 2000);
				})
				.catch((err) => {
					console.error('Error al copiar el enlace: ', err);
				});
		});
	}

	if (downloadJsonBtn) {
		downloadJsonBtn.addEventListener('click', () => {
			if (!lastScanData) {
				alert('No hay datos de auditoría disponibles para descargar. Realiza un escaneo primero.');
				return;
			}
			const jsonStr = JSON.stringify(lastScanData, null, 2);
			const domain = (lastScanData.resolvedUrl || 'reporte')
				.replace(/^https?:\/\//, '')
				.split('/')[0];
			downloadFile(jsonStr, `reporte-${domain}.json`, 'application/json');
		});
	}

	if (downloadCsvBtn) {
		downloadCsvBtn.addEventListener('click', () => {
			if (!lastScanData) {
				alert('No hay datos de auditoría disponibles para descargar. Realiza un escaneo primero.');
				return;
			}

			const data = lastScanData;
			const domain = (data.resolvedUrl || 'reporte').replace(/^https?:\/\//, '').split('/')[0];

			// Helper to escape CSV fields
			const esc = (val) => {
				if (val === null || val === undefined) return '""';
				const str = String(val).replace(/"/g, '""');
				return `"${str}"`;
			};

			const csvRows = [];
			csvRows.push(`${esc('Propiedad')},${esc('Valor')}`);
			csvRows.push(`${esc('URL Detectada')},${esc(data.url)}`);
			csvRows.push(`${esc('URL Resuelta')},${esc(data.resolvedUrl)}`);
			csvRows.push(`${esc('Logo del Sitio')},${esc(data.siteLogo || '')}`);
			csvRows.push(`${esc('Plataforma CMS')},${esc(data.technology)}`);
			csvRows.push(`${esc('Confianza de CMS')},${esc(`${Math.round(data.confidence * 100)}%`)}`);
			csvRows.push(`${esc('Tema de la Tienda')},${esc(data.theme || 'N/A')}`);
			csvRows.push(`${esc('Productos Detectados')},${esc(data.productCount || 0)}`);

			if (data.scanDate) {
				const formattedDate = new Date(data.scanDate).toLocaleString('es-MX', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
				});
				csvRows.push(`${esc('Fecha de Reporte')},${esc(formattedDate)}`);
			}

			// Location
			if (data.location) {
				csvRows.push(`${esc('IP del Servidor')},${esc(data.location.ip || '')}`);
				csvRows.push(`${esc('País')},${esc(data.location.country || '')}`);
				csvRows.push(`${esc('Ciudad')},${esc(data.location.city || '')}`);
			}

			// Plugins
			if (Array.isArray(data.plugins)) {
				const pluginsStr = data.plugins.map((p) => `${p.name} (${p.category || ''})`).join('; ');
				csvRows.push(`${esc('Plugins/Apps Detectados')},${esc(pluginsStr)}`);
			}

			// Infrastructure
			if (Array.isArray(data.infrastructure)) {
				const infraStr = data.infrastructure
					.map((i) => `${i.name} (${i.category || ''})`)
					.join('; ');
				csvRows.push(`${esc('Infraestructura')},${esc(infraStr)}`);
			}

			// Payment Gateways
			if (Array.isArray(data.paymentGateways)) {
				csvRows.push(`${esc('Pasarelas de Pago')},${esc(data.paymentGateways.join('; '))}`);
			}

			// PageSpeed
			if (data.pagespeed?.lighthouseResult) {
				const cats = data.pagespeed.lighthouseResult.categories || {};
				csvRows.push(
					`${esc('Lighthouse Rendimiento')},${esc(Math.round((cats.performance?.score || 0) * 100))}`
				);
				csvRows.push(
					`${esc('Lighthouse Accesibilidad')},${esc(Math.round((cats.accessibility?.score || 0) * 100))}`
				);
				csvRows.push(`${esc('Lighthouse SEO')},${esc(Math.round((cats.seo?.score || 0) * 100))}`);
			}

			const csvContent = csvRows.join('\n');
			downloadFile(csvContent, `reporte-${domain}.csv`, 'text/csv;charset=utf-8;');
		});
	}

	async function generatePdfWithJsPdf(data) {
		if (!data) return;

		const originalBtnHtml = downloadPdfBtn ? downloadPdfBtn.innerHTML : '';
		if (downloadPdfBtn) {
			downloadPdfBtn.disabled = true;
			downloadPdfBtn.innerHTML =
				'<i data-lucide="loader" class="spin-icon" style="width:15px;height:15px;"></i> Generando PDF... ⏳';
			lucide.createIcons();
		}

		try {
			const domain = (data.resolvedUrl || data.url || 'reporte')
				.replace(/^https?:\/\//i, '')
				.replace(/^www\./i, '')
				.split('/')[0];

			const scanDateFormatted = data.scanDate
				? new Date(data.scanDate).toLocaleString('es-MX', {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
						hour: '2-digit',
						minute: '2-digit',
					})
				: new Date().toLocaleString('es-MX');

			const confidencePct = Math.round((data.confidence || 0) * 100);
			const technology = data.technology || 'Desconocido';
			const theme = data.theme || '';
			const siteLogo = data.siteLogo || '';
			const desktopImg = data.screenshots?.desktop || '';
			const mobileImg = data.screenshots?.mobile || '';

			const cmsDomains = {
				Shopify: 'shopify.com',
				Magento: 'magento.com',
				WooCommerce: 'woocommerce.com',
				PrestaShop: 'prestashop.com',
				VTEX: 'vtex.com',
				Odoo: 'odoo.com',
			};
			const cmsLogoUrl = cmsDomains[technology]
				? `https://img.logo.dev/${cmsDomains[technology]}?token=pk_MgKPAkEuRMOiYecOkx67wQ&size=64`
				: '';

			// Plugins list HTML
			const pluginsHtml =
				Array.isArray(data.plugins) && data.plugins.length > 0
					? data.plugins
							.map((p) => {
								const initial = (p.name || 'P').trim().charAt(0).toUpperCase();
								const iconUrl = getTechIconUrl(p);
								return `
              <div class="pdf-plugin-item" style="display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 1px dashed #f0f0f0;">
                <div class="pdf-plugin-icon" style="width: 22px; height: 22px; border-radius: 5px; background: #f8f9fa; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                  ${
										iconUrl
											? `<img src="${iconUrl}" alt="${p.name}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: contain; display: block;" onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
                         <div class="pdf-icon-fallback" style="display:none; font-size: 11px; font-weight: 700; color: #9b59b6;">${initial}</div>`
											: `<div class="pdf-icon-fallback" style="font-size: 11px; font-weight: 700; color: #9b59b6;">${initial}</div>`
									}
                </div>
                <div class="pdf-plugin-info" style="display: flex; align-items: baseline; gap: 4px; min-width: 0;">
                  <span class="pdf-plugin-name" style="font-size: 0.8rem; font-weight: 700; color: #2c1810; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(p.name)}</span>
                  <span class="pdf-plugin-cat" style="font-size: 0.68rem; color: #8b7d6b; white-space: nowrap;">(${escapeHtml(p.category || 'App')})</span>
                </div>
              </div>
            `;
							})
							.join('')
					: '<p class="pdf-empty-text" style="font-size: 0.8rem; color: #8b7d6b; font-style: italic; padding: 4px 0;">🤷 No se detectaron apps o plugins instalados.</p>';

			// Infra HTML
			const infraHtml =
				Array.isArray(data.infrastructure) && data.infrastructure.length > 0
					? data.infrastructure
							.map(
								(i) =>
									`<span class="pdf-chip pdf-chip-infra" style="display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: #e8f4fc; border: 1px solid #3498db; color: #2c1810;">🌐 ${i.name} (${i.category || 'CDN'})</span>`
							)
							.join('')
					: '<p class="pdf-empty-text" style="font-size: 0.8rem; color: #8b7d6b; font-style: italic; padding: 4px 0;">🤷 No se detectó infraestructura conocida.</p>';

			// Gateways HTML
			const gatewaysHtml =
				Array.isArray(data.paymentGateways) && data.paymentGateways.length > 0
					? data.paymentGateways
							.map(
								(g) =>
									`<span class="pdf-chip pdf-chip-gateway" style="display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: #eafaf1; border: 1px solid #2ecc71; color: #2c1810;">💳 ${g}</span>`
							)
							.join('')
					: '<p class="pdf-empty-text" style="font-size: 0.8rem; color: #8b7d6b; font-style: italic; padding: 4px 0;">🤷 No se detectaron pasarelas visibles.</p>';

			// Pixels HTML
			const pixelsHtml =
				Array.isArray(data.pixels) && data.pixels.length > 0
					? data.pixels
							.map(
								(px) =>
									`<span class="pdf-chip pdf-chip-pixel" style="display: inline-block; font-size: 0.72rem; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: #fdf2e9; border: 1px solid #e67e22; color: #2c1810;">🎯 ${px.name}</span>`
							)
							.join('')
					: '<p class="pdf-empty-text" style="font-size: 0.8rem; color: #8b7d6b; font-style: italic; padding: 4px 0;">🤷 No se detectaron píxeles de seguimiento.</p>';

			// PageSpeed Scores
			let scoresHtml = '';
			if (data.pagespeed?.scores || data.pagespeed?.lighthouseResult) {
				const scores = data.pagespeed.scores || {};
				const getScoreBadge = (val, label) => {
					if (val === null || val === undefined) return '';
					const scoreNum = Number(val);
					const color = scoreNum >= 90 ? '#2ecc71' : scoreNum >= 50 ? '#f39c12' : '#e74c3c';
					return `
            <div class="pdf-score-item" style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
              <div class="pdf-score-circle" style="width: 32px; height: 32px; border-radius: 50%; border: 2.5px solid ${color}; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700;">${scoreNum}</div>
              <span class="pdf-score-label" style="font-size: 0.68rem; color: #5a4a3f; font-weight: 700;">${label}</span>
            </div>
          `;
				};
				scoresHtml = `
          <div class="pdf-scores-row" style="display: flex; justify-content: space-around; gap: 6px; margin-top: 4px;">
            ${getScoreBadge(scores.performance, 'Rendimiento')}
            ${getScoreBadge(scores.accessibility, 'Accesibilidad')}
            ${getScoreBadge(scores.bestPractices || scores['best-practices'], 'Prácticas')}
            ${getScoreBadge(scores.seo, 'SEO')}
          </div>
        `;
			}

			// Location info and latency
			const ip = data.location?.ip || 'N/A';
			const country = data.location?.country || '';
			const region = data.location?.region || '';
			const city = data.location?.city || '';
			const locationStr =
				`${city ? `${city}, ` : ''}${region ? `${region}, ` : ''}${country}` || 'Desconocida';
			let estLatency = 'N/A';
			let staticMapImgUrl = '';

			if (data.location?.ll && Array.isArray(data.location.ll) && data.location.ll.length >= 2) {
				const [lat, lon] = data.location.ll;
				const mexLat = 19.4326;
				const mexLon = -99.1332;
				const distance = calculateDistance(lat, lon, mexLat, mexLon);
				estLatency = `${Math.round((distance / 100) * 1.25 + 22)} ms`;
				staticMapImgUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=4&size=450x130&markers=${lat},${lon},ol-marker`;
			}

			const locationText = data.location?.country
				? `📍 ${data.location.country}${data.location.city ? ` (${data.location.city})` : ''} • IP: ${data.location.ip || 'N/A'}`
				: '📍 Servidor no geolocalizado';

			const siteLogoContainer = document.getElementById('site-logo-container');
			const isDarkThemeLogo =
				siteLogoContainer?.classList.contains('logo-theme-dark-bg') ||
				data.isLogoDark === true ||
				false;

			// Create invisible DOM mount for html2canvas
			const renderWrapper = document.createElement('div');
			renderWrapper.id = 'jspdf-render-wrapper';
			renderWrapper.style.position = 'fixed';
			renderWrapper.style.left = '-10000px';
			renderWrapper.style.top = '0';
			renderWrapper.style.width = '1122px';
			renderWrapper.style.height = '793px';
			renderWrapper.style.zIndex = '-99999';
			renderWrapper.style.boxSizing = 'border-box';
			renderWrapper.style.padding = '18px 26px 14px 26px';
			renderWrapper.style.backgroundColor = '#fdf6e3';
			renderWrapper.style.backgroundImage = `
        linear-gradient(90deg, transparent 79px, #e8828a 79px, #e8828a 81px, transparent 81px),
        linear-gradient(#b8d4e3 1px, transparent 1px)
      `;
			renderWrapper.style.backgroundSize = '100% 100%, 100% 1.75rem';
			renderWrapper.style.color = '#2c1810';
			renderWrapper.style.fontFamily = "'Comic Neue', 'Comic Sans MS', cursive, sans-serif";

			renderWrapper.innerHTML = `
        <div class="pdf-notebook-sheet" style="width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
          <div class="pdf-top-content" style="display: flex; flex-direction: column; gap: 8px;">
            <div class="pdf-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #9b59b6; padding-bottom: 6px;">
              <div class="pdf-title-block" style="display: flex; align-items: center; gap: 8px;">
                <h1 style="font-family: 'Caveat', 'Patrick Hand', cursive; font-size: 2.35rem; font-weight: 700; color: #2c1810; line-height: 1; margin: 0;">🤫 El chisme de: <span style="color: #9b59b6;">${domain}</span></h1>
              </div>
              <div class="pdf-meta-badge" style="text-align: right; font-size: 0.85rem; color: #5a4a3f;">
                <div>Fecha: <strong>${scanDateFormatted}</strong></div>
              </div>
            </div>

            <div class="pdf-hero-grid" style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 14px; background: #ffffff; border: 2px solid #9b59b6; border-radius: 12px; padding: 10px 16px; box-shadow: 3px 3px 0 rgba(155, 89, 182, 0.25);">
              <div>
                <div class="pdf-cms-headline" style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                  <div class="pdf-cms-icon" style="width: 42px; height: 42px; border-radius: 9px; background: white; border: 2px solid #3498db; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 2px 2px 0 rgba(0,0,0,0.1); flex-shrink: 0;">
                    ${
											cmsLogoUrl
												? `<img src="${cmsLogoUrl}" alt="${technology}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: contain; padding: 3px;" onerror="this.parentElement.innerHTML='<span style=\\'font-size:18px;font-weight:bold;color:#9b59b6;\\'>${technology.charAt(0)}</span>'"/>`
												: `<span style="font-size:18px;font-weight:bold;color:#9b59b6;">${technology.charAt(0)}</span>`
										}
                  </div>
                  <div class="pdf-cms-name" style="font-family: 'Caveat', cursive; font-size: 2rem; font-weight: 700; color: #2c1810; line-height: 1;">${technology}</div>
                  <span class="pdf-cert-badge" style="font-size: 0.75rem; font-weight: 700; background: #f8bbd0; color: #ff69b4; border: 1px solid #ff69b4; padding: 2px 8px; border-radius: 10px; margin-left: 8px;">${confidencePct}% Segurísimo ✨</span>
                </div>
                <div class="pdf-site-details" style="font-size: 0.85rem; color: #5a4a3f; line-height: 1.4;">
                  ${theme ? `<div>🎨 Tema que usa: <strong style="color: #9b59b6;">${theme}</strong></div>` : ''}
                  <div>🔗 URL Analizada: <strong style="color: #3498db;">${data.resolvedUrl || data.url}</strong></div>
                  <div style="margin-top: 3px;">${locationText}</div>
                </div>
              </div>

              <div class="pdf-preview-col" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;">
                ${
									siteLogo
										? `<div class="pdf-site-logo-card" style="height: 50px; min-width: 64px; max-width: 180px; padding: 3px 12px; border-radius: 10px; ${isDarkThemeLogo ? 'background: #18181b !important; border: 2px solid rgba(155, 89, 182, 0.7) !important; box-shadow: 2px 2px 0 rgba(0,0,0,0.35) !important;' : 'background: #ffffff !important; border: 2px solid #9b59b6; box-shadow: 2px 2px 0 rgba(0,0,0,0.12);'}; display: inline-flex; align-items: center; justify-content: center;">
                      <img src="${siteLogo}" alt="${domain}" crossorigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain; ${isDarkThemeLogo ? 'filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));' : ''}" onerror="this.parentElement.style.display='none';" />
                    </div>`
										: ''
								}
                ${
									desktopImg || mobileImg
										? `<div class="pdf-mockups-row" style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                        ${desktopImg ? `<div class="pdf-mockup-desktop" style="width: 160px; height: 100px; background: #000; border-radius: 6px; border: 1px solid #ccc; overflow: hidden; flex-shrink: 0;"><img src="${desktopImg}" crossorigin="anonymous" alt="Desktop" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}
                        ${mobileImg ? `<div class="pdf-mockup-mobile" style="width: 58px; height: 100px; background: #000; border-radius: 6px; border: 1px solid #ccc; overflow: hidden; flex-shrink: 0;"><img src="${mobileImg}" crossorigin="anonymous" alt="Mobile" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}
                      </div>`
										: ''
								}
              </div>
            </div>

            <div class="pdf-details-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
              <div class="pdf-card" style="background: #ffffff; border: 1.5px solid #b8d4e3; border-radius: 10px; padding: 8px 12px; box-shadow: 2px 2px 0 rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 5px;">
                <h3 style="font-family: 'Caveat', cursive; font-size: 1.25rem; font-weight: 700; color: #9b59b6; border-bottom: 1px dashed #b8d4e3; padding-bottom: 3px; margin: 0;">🔌 Apps y Plugins</h3>
                <div class="pdf-plugins-list" style="max-height: 180px; overflow: hidden;">
                  ${pluginsHtml}
                </div>
              </div>

              <div class="pdf-card" style="background: #ffffff; border: 1.5px solid #b8d4e3; border-radius: 10px; padding: 8px 12px; box-shadow: 2px 2px 0 rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 5px;">
                <h3 style="font-family: 'Caveat', cursive; font-size: 1.25rem; font-weight: 700; color: #9b59b6; border-bottom: 1px dashed #b8d4e3; padding-bottom: 3px; margin: 0;">🌐 Infraestructura y Red</h3>
                <div class="pdf-chips-wrapper" style="display: flex; flex-wrap: wrap; gap: 5px;">
                  ${infraHtml}
                </div>

                <h3 style="font-family: 'Caveat', cursive; font-size: 1.25rem; font-weight: 700; color: #9b59b6; border-bottom: 1px dashed #b8d4e3; padding-bottom: 3px; margin-top: 5px; margin-bottom: 0;">💳 Pasarelas y Métodos</h3>
                <div class="pdf-chips-wrapper" style="display: flex; flex-wrap: wrap; gap: 5px;">
                  ${gatewaysHtml}
                </div>
              </div>

              <div class="pdf-card" style="background: #ffffff; border: 1.5px solid #b8d4e3; border-radius: 10px; padding: 8px 12px; box-shadow: 2px 2px 0 rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 5px;">
                <h3 style="font-family: 'Caveat', cursive; font-size: 1.25rem; font-weight: 700; color: #9b59b6; border-bottom: 1px dashed #b8d4e3; padding-bottom: 3px; margin: 0;">🎯 Píxeles de Tracking</h3>
                <div class="pdf-chips-wrapper" style="display: flex; flex-wrap: wrap; gap: 5px;">
                  ${pixelsHtml}
                </div>

                ${
									scoresHtml
										? `<h3 style="font-family: 'Caveat', cursive; font-size: 1.25rem; font-weight: 700; color: #9b59b6; border-bottom: 1px dashed #b8d4e3; padding-bottom: 3px; margin-top: 5px; margin-bottom: 0;">⚡ Rendimiento Lighthouse</h3>
                       ${scoresHtml}`
										: ''
								}
              </div>
            </div>

            <!-- Server Location Map & Latency Card -->
            <div class="pdf-map-card" style="background: #ffffff; border: 1.5px solid #b8d4e3; border-radius: 10px; padding: 7px 12px; box-shadow: 2px 2px 0 rgba(0,0,0,0.06); display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 12px; align-items: center;">
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <h3 style="font-family: 'Caveat', cursive; font-size: 1.22rem; font-weight: 700; color: #9b59b6; margin: 0; line-height: 1;">📍 ¿Desde dónde opera?</h3>
                  <span style="font-size: 0.7rem; color: #8b7d6b; font-style: italic;">Rastreado en México 🇲🇽</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 6px;">
                  <div style="background: #fdf6e3; border: 1px solid #b8d4e3; border-radius: 6px; padding: 3px 6px; display: flex; flex-direction: column;">
                    <span style="font-size: 0.62rem; color: #8b7d6b; font-weight: 700; text-transform: uppercase;">⏱️ Latencia Mex</span>
                    <span style="font-size: 1.1rem; font-weight: 700; color: #2ecc71; line-height: 1.1;">${estLatency}</span>
                  </div>
                  <div style="background: #fdf6e3; border: 1px solid #b8d4e3; border-radius: 6px; padding: 3px 6px; display: flex; flex-direction: column;">
                    <span style="font-size: 0.62rem; color: #8b7d6b; font-weight: 700; text-transform: uppercase;">🌐 IP Servidor</span>
                    <span style="font-size: 0.88rem; font-weight: 700; color: #2c1810; line-height: 1.1;">${ip}</span>
                  </div>
                  <div style="background: #fdf6e3; border: 1px solid #b8d4e3; border-radius: 6px; padding: 3px 6px; display: flex; flex-direction: column;">
                    <span style="font-size: 0.62rem; color: #8b7d6b; font-weight: 700; text-transform: uppercase;">🗺️ Ubicación</span>
                    <span style="font-size: 0.82rem; font-weight: 700; color: #2c1810; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${locationStr}</span>
                  </div>
                </div>
              </div>

              <div style="height: 56px; border-radius: 6px; overflow: hidden; border: 1px solid #b8d4e3; background: #e8f4fc; display: flex; align-items: center; justify-content: center; position: relative;">
                ${
									staticMapImgUrl
										? `<img src="${staticMapImgUrl}" alt="Mapa Servidor" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
                       <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 0.78rem; color: #3498db; font-weight: 700;">📍 ${locationStr} (${ip})</div>`
										: `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; color: #3498db; font-weight: 700;">📍 ${locationStr} (${ip})</div>`
								}
              </div>
            </div>
          </div>

          <!-- Pinned Footer at the very bottom of the page -->
          <div class="pdf-footer" style="margin-top: auto; padding-top: 8px; border-top: 1.5px dashed #b8d4e3; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 0.82rem; color: #8b7d6b; font-style: italic; white-space: nowrap;">
            <span>🤫 Expediente Confidencial</span>
            <span>•</span>
            <span style="display: inline-flex; align-items: center; gap: 5px;">
              Hecho con 💜 en
              <a href="https://rifatela.lol" target="_blank" style="display: inline-flex; align-items: center; text-decoration: none;">
                <img src="https://rifatela.lol/Positivo.svg" alt="Rífatela Logo" height="18" crossorigin="anonymous" style="height: 18px; width: auto; vertical-align: middle; display: inline-block;" />
              </a>
            </span>
            <span>•</span>
            <span>Generado el ${scanDateFormatted}</span>
          </div>
        </div>
      `;

			document.body.appendChild(renderWrapper);

			// Preload and wait for all images inside renderWrapper
			const images = Array.from(renderWrapper.querySelectorAll('img'));
			await Promise.all(
				images.map((img) => {
					if (img.complete) return Promise.resolve();
					return new Promise((resolve) => {
						img.onload = resolve;
						img.onerror = resolve;
						setTimeout(resolve, 1500);
					});
				})
			);

			// Render canvas via html2canvas
			const canvas = await html2canvas(renderWrapper, {
				scale: 2,
				useCORS: true,
				allowTaint: true,
				backgroundColor: '#fdf6e3',
				logging: false,
			});

			document.body.removeChild(renderWrapper);

			if (window.jspdf && window.jspdf.jsPDF) {
				const { jsPDF } = window.jspdf;
				const pdf = new jsPDF({
					orientation: 'landscape',
					unit: 'mm',
					format: 'a4',
					compress: true,
				});

				const pdfWidth = pdf.internal.pageSize.getWidth();
				const pdfHeight = pdf.internal.pageSize.getHeight();
				const imgData = canvas.toDataURL('image/jpeg', 0.95);

				pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
				pdf.save(`chisme-${domain}.pdf`);
			} else {
				// Fallback to window print if jsPDF is unavailable
				openLandscapePdfReport(data);
			}
		} catch (err) {
			console.error('Error generando PDF con jsPDF:', err);
			openLandscapePdfReport(data);
		} finally {
			if (downloadPdfBtn) {
				downloadPdfBtn.disabled = false;
				downloadPdfBtn.innerHTML = originalBtnHtml;
				lucide.createIcons();
			}
		}
	}

	if (downloadPdfBtn) {
		downloadPdfBtn.addEventListener('click', () => {
			if (!lastScanData) {
				alert(
					'No hay datos de auditoría disponibles para exportar a PDF. Realiza un escaneo primero.'
				);
				return;
			}
			generatePdfWithJsPdf(lastScanData);
		});
	}

	// ─── 📝 Boleta de Exámenes Modal Logic ────────────────────────────────────
	const examsModal = document.getElementById('exams-detail-modal');
	const closeExamsModalBtn = document.getElementById('close-exams-modal-btn');
	const closeExamsModalBottomBtn = document.getElementById('close-exams-modal-bottom-btn');
	const openExamsBtn = document.getElementById('open-exams-btn');
	const examsPlatformTabs = document.getElementById('exams-platform-tabs');
	const examsModalBody = document.getElementById('exams-modal-body');
	const examsSummaryPassed = document.getElementById('exams-summary-passed');
	const examsSummaryFailed = document.getElementById('exams-summary-failed');
	const examsSummaryConfidence = document.getElementById('exams-summary-confidence');

	let currentExamPlatform = null;

	function openExamsModal(platformToSelect) {
		const data = lastScanData || {
			detected: false,
			technology: 'Shopify',
			matches: {
				Shopify: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
				Magento: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
				WooCommerce: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
				PrestaShop: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
				VTEX: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
			},
		};
		currentExamPlatform = platformToSelect || (data.detected ? data.technology : 'Shopify');
		renderExamsModalContent(data);
		if (examsModal) {
			examsModal.style.display = 'flex';
			lucide.createIcons();
		}
	}

	function closeExamsModal() {
		if (examsModal) {
			examsModal.style.display = 'none';
		}
	}

	function renderExamsModalContent(dataToRender) {
		const data = dataToRender ||
			lastScanData || {
				detected: false,
				technology: 'Shopify',
				matches: {
					Shopify: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
					Magento: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
					WooCommerce: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
					PrestaShop: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
					VTEX: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
					Odoo: { detected: false, confidence: 0, matchedRules: [], unmatchedRules: [] },
				},
			};

		const platforms = ['Shopify', 'Magento', 'WooCommerce', 'PrestaShop', 'VTEX', 'Odoo'];
		if (!platforms.includes(currentExamPlatform)) {
			currentExamPlatform = platforms[0];
		}

		// Render platform tabs
		if (examsPlatformTabs) {
			examsPlatformTabs.innerHTML = '';
			platforms.forEach((plat) => {
				const match = data.matches?.[plat];
				const isDetected = match?.detected || false;
				const passedCount = match?.matchedRules?.length || 0;
				const totalCount =
					(match?.matchedRules?.length || 0) + (match?.unmatchedRules?.length || 0) ||
					(plat === 'Shopify' ? 6 : plat === 'VTEX' ? 8 : 5);
				const isSelected = plat === currentExamPlatform;

				const tabBtn = document.createElement('button');
				tabBtn.type = 'button';
				tabBtn.className = `exam-tab-btn ${isSelected ? 'active' : ''}`;
				tabBtn.innerHTML = `
					<span>${plat}</span>
					<span class="exam-tab-badge ${isDetected ? 'passed' : 'failed'}">
						${passedCount}/${totalCount}
					</span>
				`;
				tabBtn.addEventListener('click', () => {
					currentExamPlatform = plat;
					renderExamsModalContent(data);
				});
				examsPlatformTabs.appendChild(tabBtn);
			});
		}

		// Get current platform data
		const platformData = data.matches?.[currentExamPlatform] || {};
		const passedRules = platformData.matchedRules || [];
		const failedRules = platformData.unmatchedRules || [];
		const confidence = platformData.detected ? platformData.confidence : 0;

		// Summary banner numbers
		if (examsSummaryPassed) {
			examsSummaryPassed.textContent = `✅ ${passedRules.length} Aprobados`;
		}
		if (examsSummaryFailed) {
			examsSummaryFailed.textContent = `❌ ${failedRules.length} Reprobados`;
		}
		if (examsSummaryConfidence) {
			examsSummaryConfidence.textContent = `Calificación ${currentExamPlatform}: ${Math.round(confidence * 100)}%`;
		}

		// Render Body
		if (examsModalBody) {
			examsModalBody.innerHTML = '';

			// Section 1: Exámenes Aprobados (Passed)
			const passedSection = document.createElement('div');
			passedSection.className = 'exam-section';
			passedSection.innerHTML = `
				<div class="exam-section-header">
					<div style="display: flex; align-items: center; gap: 0.5rem;">
						<span style="font-size: 1.2rem;">✅</span>
						<h4 style="margin: 0; font-family: var(--font-handwritten); font-size: 1.4rem; color: #1e824c;">
							Exámenes Aprobados (${passedRules.length})
						</h4>
					</div>
					<span style="font-size: 0.75rem; color: var(--ink-medium); font-weight:600;">Firmas y evidencias confirmadas</span>
				</div>
			`;

			const passedList = document.createElement('div');
			passedList.className = 'exam-cards-list';

			if (passedRules.length > 0) {
				passedRules.forEach((rule) => {
					const card = document.createElement('div');
					card.className = 'exam-rule-card passed';
					card.innerHTML = `
						<div class="exam-rule-header">
							<span class="exam-rule-type-badge ${escapeHtml(rule.type)}">${escapeHtml(rule.type)}</span>
							<span class="exam-rule-status passed">Aprobado ✅</span>
							<span class="exam-rule-weight">Peso: <strong>${rule.weight || 0.5}</strong></span>
						</div>
						<div class="exam-rule-title">${escapeHtml(rule.description || 'Regla de detección')}</div>
						${
							rule.context
								? `
							<div class="exam-rule-evidence">
								<div class="exam-evidence-label">Evidencia encontrada en el sitio:</div>
								<code>${escapeHtml(rule.context)}</code>
							</div>
						`
								: ''
						}
					`;
					passedList.appendChild(card);
				});
			} else {
				passedList.innerHTML = `
					<div class="exam-empty-box">
						<span>🔍</span>
						<p>No se aprobó ningún examen de ${currentExamPlatform} en este sitio web.</p>
					</div>
				`;
			}
			passedSection.appendChild(passedList);
			examsModalBody.appendChild(passedSection);

			// Section 2: Exámenes No Pasados (Failed)
			const failedSection = document.createElement('div');
			failedSection.className = 'exam-section';
			failedSection.innerHTML = `
				<div class="exam-section-header" style="margin-top: 1.2rem;">
					<div style="display: flex; align-items: center; gap: 0.5rem;">
						<span style="font-size: 1.2rem;">❌</span>
						<h4 style="margin: 0; font-family: var(--font-handwritten); font-size: 1.4rem; color: #c0392b;">
							Exámenes No Pasados / Reprobados (${failedRules.length})
						</h4>
					</div>
					<span style="font-size: 0.75rem; color: var(--ink-medium); font-weight:600;">Firmas ausentes en el código</span>
				</div>
			`;

			const failedList = document.createElement('div');
			failedList.className = 'exam-cards-list';

			if (failedRules.length > 0) {
				failedRules.forEach((rule) => {
					const card = document.createElement('div');
					card.className = 'exam-rule-card failed';
					card.innerHTML = `
						<div class="exam-rule-header">
							<span class="exam-rule-type-badge ${escapeHtml(rule.type)}">${escapeHtml(rule.type)}</span>
							<span class="exam-rule-status failed">Reprobado ❌</span>
							<span class="exam-rule-weight">Peso: <strong>${rule.weight || 0.5}</strong></span>
						</div>
						<div class="exam-rule-title">${escapeHtml(rule.description || 'Regla no encontrada')}</div>
						<div class="exam-rule-details">
							<div class="exam-evidence-label">Patrón buscado:</div>
							<code>${escapeHtml(rule.pattern || rule.key || rule.attribute || 'N/A')}</code>
							<div style="font-size: 0.75rem; color: var(--ink-medium); margin-top: 5px;">
								⚠️ Esta firma no estuvo presente en los scripts, etiquetas HTML ni encabezados de la página.
							</div>
						</div>
					`;
					failedList.appendChild(card);
				});
			} else {
				failedList.innerHTML = `
					<div class="exam-empty-box">
						<span>🎉</span>
						<p>¡El sitio pasó el 100% de los exámenes para ${currentExamPlatform}!</p>
					</div>
				`;
			}
			failedSection.appendChild(failedList);
			examsModalBody.appendChild(failedSection);
		}
	}

	if (closeExamsModalBtn) closeExamsModalBtn.addEventListener('click', closeExamsModal);
	if (closeExamsModalBottomBtn) closeExamsModalBottomBtn.addEventListener('click', closeExamsModal);
	if (openExamsBtn) {
		openExamsBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			openExamsModal();
		});
	}

	// Click on result header elements opens exams modal
	const mainTechIcon = document.getElementById('tech-icon-container');
	const mainTechName = document.getElementById('detected-tech-name');
	const mainConfidence = document.getElementById('confidence-text-badge');

	if (mainTechIcon) {
		mainTechIcon.addEventListener('click', () => openExamsModal());
	}
	if (mainTechName) {
		mainTechName.addEventListener('click', () => openExamsModal());
	}
	if (mainConfidence) {
		mainConfidence.addEventListener('click', () => openExamsModal());
	}

	// Close exams modal on backdrop click
	if (examsModal) {
		examsModal.addEventListener('click', (e) => {
			if (e.target === examsModal) closeExamsModal();
		});
	}

	// Close exams modal on Escape key
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			if (examsModal && examsModal.style.display === 'flex') closeExamsModal();
			if (appDetailModal && appDetailModal.style.display === 'flex') closeAppDetailModal();
		}
	});

	// ─── 🔍 Modal de Detalle de App / Tests / Diagnóstico ─────────────────────
	const appDetailModal = document.getElementById('app-detail-modal');
	const closeAppModalBtn = document.getElementById('close-app-modal-btn');
	const closeAppModalBottomBtn = document.getElementById('close-app-modal-bottom-btn');
	const appModalIconImg = document.getElementById('app-modal-icon-img');
	const appModalIconInitial = document.getElementById('app-modal-icon-initial');
	const appModalTitle = document.getElementById('app-modal-title');
	const appModalSubtitle = document.getElementById('app-modal-subtitle');
	const appModalTags = document.getElementById('app-modal-tags');
	const appModalLinks = document.getElementById('app-modal-links');
	const appModalBody = document.getElementById('app-modal-body');

	function openAppDetailModal(tech) {
		if (!tech || !appDetailModal) return;

		let domain = '';
		let provider = '';
		if (tech.logo && typeof tech.logo === 'object') {
			domain = tech.logo.id;
			provider = tech.logo.provider;
		} else if (tech.logo) {
			domain = tech.logo;
		}

		const techWebsite = tech.web || tech.website || tech.link || '';
		if (!domain && techWebsite) {
			try {
				domain = new URL(techWebsite).hostname.replace(/^www\./i, '');
			} catch (_e) {}
		}

		const iconUrl = getTechIconUrl(tech);
		const initial = (tech.name || '').trim().charAt(0).toUpperCase() || '?';

		if (appModalTitle) appModalTitle.textContent = tech.name || 'Aplicación';
		if (appModalSubtitle) {
			appModalSubtitle.textContent = `${tech.developer || 'Desarrollador Oficial'} • ${tech.category || 'Aplicación'}`;
		}

		if (appModalIconImg && appModalIconInitial) {
			if (iconUrl) {
				delete appModalIconImg.dataset.fallbackState;
				appModalIconImg.style.display = 'block';
				appModalIconInitial.style.display = 'none';
				appModalIconImg.onload = () => {
					window.handleLogoLoad(appModalIconImg, domain, techWebsite, provider);
				};
				appModalIconImg.onerror = () => {
					window.handleLogoError(appModalIconImg, domain, techWebsite, provider);
				};
				appModalIconImg.src = iconUrl;
			} else {
				appModalIconImg.style.display = 'none';
				appModalIconInitial.style.display = 'flex';
				appModalIconInitial.textContent = initial;
			}
		}

		// Tags
		if (appModalTags) {
			appModalTags.innerHTML = '';
			const catTag = document.createElement('span');
			catTag.style.cssText =
				'font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 4px; background: rgba(138,43,226,0.1); color: var(--gel-purple); border: 1px solid rgba(138,43,226,0.2); font-weight: 600;';
			catTag.textContent = `Categoría: ${tech.category || 'General'}`;
			appModalTags.appendChild(catTag);

			if (Array.isArray(tech.compatibleCMS) && tech.compatibleCMS.length > 0) {
				tech.compatibleCMS.forEach((cms) => {
					const cmsTag = document.createElement('span');
					cmsTag.style.cssText =
						'font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 4px; background: rgba(0,0,0,0.05); color: var(--ink-dark); border: 1px solid var(--paper-lines); font-weight: 500;';
					cmsTag.textContent = `CMS: ${cms}`;
					appModalTags.appendChild(cmsTag);
				});
			}
		}

		// Links
		if (appModalLinks) {
			appModalLinks.innerHTML = '';
			if (tech.web) {
				const webLink = document.createElement('a');
				webLink.href = tech.web;
				webLink.target = '_blank';
				webLink.rel = 'noopener noreferrer';
				webLink.style.cssText =
					'font-size: 0.75rem; color: var(--gel-blue); text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 0.25rem;';
				webLink.innerHTML = `Sitio Web 🌐`;
				appModalLinks.appendChild(webLink);
			}
			if (Array.isArray(tech.appStores) && tech.appStores.length > 0) {
				tech.appStores.forEach((st) => {
					if (st.link) {
						const storeLink = document.createElement('a');
						storeLink.href = st.link;
						storeLink.target = '_blank';
						storeLink.rel = 'noopener noreferrer';
						storeLink.style.cssText =
							'font-size: 0.75rem; color: var(--gel-pink); text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 0.25rem;';
						storeLink.innerHTML = `${st.cms || 'App'} Store 🛍️`;
						appModalLinks.appendChild(storeLink);
					}
				});
			}
		}

		// Body with Test Results & Evidence
		if (appModalBody) {
			appModalBody.innerHTML = '';

			const testsHeader = document.createElement('div');
			testsHeader.style.cssText =
				'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--paper-lines); padding-bottom: 0.5rem;';
			testsHeader.innerHTML = `
				<div style="display: flex; align-items: center; gap: 0.5rem;">
					<span style="font-size: 1.2rem;">🧪</span>
					<h4 style="margin: 0; font-family: var(--font-handwritten); font-size: 1.3rem; color: var(--ink-dark);">
						Resultados de Exámenes y Firmas
					</h4>
				</div>
				<span style="font-size: 0.75rem; color: #27ae60; font-weight: 700; background: rgba(46, 204, 113, 0.12); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid #2ecc71;">
					✅ Detectada en el sitio
				</span>
			`;
			appModalBody.appendChild(testsHeader);

			if (Array.isArray(tech.rules) && tech.rules.length > 0) {
				tech.rules.forEach((rule) => {
					const ruleCard = document.createElement('div');
					ruleCard.className = `exam-rule-card ${rule.passed ? 'passed' : 'failed'}`;
					ruleCard.style.cssText = `
						background: var(--paper-dark);
						border: 1px solid var(--paper-lines);
						border-left: 4px solid ${rule.passed ? '#2ecc71' : '#e74c3c'};
						border-radius: 8px;
						padding: 0.75rem 1rem;
						display: flex;
						flex-direction: column;
						gap: 0.35rem;
					`;

					ruleCard.innerHTML = `
						<div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
							<div style="display: flex; align-items: center; gap: 0.4rem;">
								<span style="font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 4px; background: ${rule.passed ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.15)'}; color: ${rule.passed ? '#27ae60' : '#c0392b'};">
									${rule.passed ? '✅ PASÓ' : '❌ NO DETECTADO'}
								</span>
								<span style="font-size: 0.7rem; background: rgba(0,0,0,0.06); padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace; color: var(--ink-medium);">
									&lt;${rule.type || 'script-src'}&gt;
								</span>
							</div>
						</div>
						<div style="font-size: 0.88rem; font-weight: 600; color: var(--ink-dark); margin-top: 0.2rem;">
							${escapeHtml(rule.description || 'Firma de detección')}
						</div>
						${
							rule.pattern
								? `
							<div style="font-size: 0.72rem; color: var(--ink-medium);">
								<strong>Patrón esperado:</strong> <code style="background: rgba(0,0,0,0.05); padding: 0.1rem 0.3rem; border-radius: 3px; font-family: monospace;">${escapeHtml(rule.pattern)}</code>
							</div>
						`
								: ''
						}
						${
							rule.context
								? `
							<div style="margin-top: 0.35rem; background: var(--paper); border: 1px solid var(--paper-lines); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: monospace; font-size: 0.75rem; color: var(--ink-dark); word-break: break-all; max-height: 120px; overflow-y: auto;">
								<div style="font-size: 0.65rem; color: var(--ink-light); margin-bottom: 0.2rem; font-weight: bold; text-transform: uppercase;">
									🔍 Evidencia Encontrada:
								</div>
								<code>${escapeHtml(rule.context)}</code>
							</div>
						`
								: ''
						}
					`;
					appModalBody.appendChild(ruleCard);
				});
			} else if (tech.evidence) {
				const singleRuleCard = document.createElement('div');
				singleRuleCard.style.cssText = `
					background: var(--paper-dark);
					border: 1px solid var(--paper-lines);
					border-left: 4px solid #2ecc71;
					border-radius: 8px;
					padding: 0.75rem 1rem;
					display: flex;
					flex-direction: column;
					gap: 0.35rem;
				`;
				singleRuleCard.innerHTML = `
					<div style="display: flex; align-items: center; gap: 0.4rem;">
						<span style="font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.45rem; border-radius: 4px; background: rgba(46, 204, 113, 0.2); color: #27ae60;">
							✅ PASÓ
						</span>
						<span style="font-size: 0.7rem; background: rgba(0,0,0,0.06); padding: 0.1rem 0.4rem; border-radius: 4px; font-family: monospace; color: var(--ink-medium);">
							&lt;firma-detectada&gt;
						</span>
					</div>
					<div style="font-size: 0.88rem; font-weight: 600; color: var(--ink-dark); margin-top: 0.2rem;">
						Recurso o script de ${escapeHtml(tech.name)} detectado en el sitio.
					</div>
					<div style="margin-top: 0.35rem; background: var(--paper); border: 1px solid var(--paper-lines); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: monospace; font-size: 0.75rem; color: var(--ink-dark); word-break: break-all; max-height: 120px; overflow-y: auto;">
						<div style="font-size: 0.65rem; color: var(--ink-light); margin-bottom: 0.2rem; font-weight: bold; text-transform: uppercase;">
							🔍 Evidencia Encontrada:
						</div>
						<code>${escapeHtml(tech.evidence)}</code>
					</div>
				`;
				appModalBody.appendChild(singleRuleCard);
			} else {
				const noEvidenceCard = document.createElement('div');
				noEvidenceCard.className = 'exam-empty-box';
				noEvidenceCard.innerHTML = `
					<span>🔍</span>
					<p>Tecnología detectada mediante análisis de firmas del sitio.</p>
				`;
				appModalBody.appendChild(noEvidenceCard);
			}
		}

		appDetailModal.style.display = 'flex';
		lucide.createIcons();
	}

	function closeAppDetailModal() {
		if (appDetailModal) {
			appDetailModal.style.display = 'none';
		}
	}

	if (closeAppModalBtn) closeAppModalBtn.addEventListener('click', closeAppDetailModal);
	if (closeAppModalBottomBtn) closeAppModalBottomBtn.addEventListener('click', closeAppDetailModal);
	if (appDetailModal) {
		appDetailModal.addEventListener('click', (e) => {
			if (e.target === appDetailModal) closeAppDetailModal();
		});
	}

	// ─── Email Report Modal Logic ────────────────────────────────────────────
	const openEmailReportBtn = document.getElementById('open-email-report-btn');
	const closeEmailModalBtn = document.getElementById('close-email-modal-btn');
	const emailReportModal = document.getElementById('email-report-modal');
	const sendReportBtn = document.getElementById('send-report-btn');
	const reportEmailInput = document.getElementById('report-email-input');
	const reportNameInput = document.getElementById('report-name-input');
	const emailReportStatus = document.getElementById('email-report-status');

	function openEmailModal() {
		if (emailReportModal) {
			emailReportModal.style.display = 'flex';
			if (reportEmailInput) reportEmailInput.value = '';
			if (reportNameInput) reportNameInput.value = '';
			if (emailReportStatus) emailReportStatus.style.display = 'none';
			if (reportEmailInput) reportEmailInput.focus();
		}
	}

	function closeEmailModal() {
		if (emailReportModal) emailReportModal.style.display = 'none';
	}

	if (openEmailReportBtn) openEmailReportBtn.addEventListener('click', openEmailModal);
	if (closeEmailModalBtn) closeEmailModalBtn.addEventListener('click', closeEmailModal);

	// Close on backdrop click
	if (emailReportModal) {
		emailReportModal.addEventListener('click', (e) => {
			if (e.target === emailReportModal) closeEmailModal();
		});
	}

	// Close on Escape key
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && emailReportModal && emailReportModal.style.display === 'flex') {
			closeEmailModal();
		}
	});

	if (sendReportBtn) {
		sendReportBtn.addEventListener('click', async () => {
			const email = reportEmailInput?.value?.trim();
			const name = reportNameInput?.value?.trim() || '';

			if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				showEmailStatus('error', 'Por favor ingresa un correo electrónico válido.');
				return;
			}
			if (!lastScanData) {
				showEmailStatus(
					'error',
					'No hay datos de auditoría disponibles. Realiza un escaneo primero.'
				);
				return;
			}

			sendReportBtn.disabled = true;
			sendReportBtn.innerHTML =
				'<i data-lucide="loader-2" style="width:15px;height:15px;animation:spin 1s linear infinite;"></i> Enviando...';
			lucide.createIcons();

			try {
				const res = await fetch('/api/report', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ email, name, data: lastScanData }),
				});
				const result = await res.json();
				if (result.success) {
					let successMsg = `✓ Reporte enviado a <strong>${email}</strong>. Revisa tu bandeja de entrada.`;
					if (result.previewUrl) {
						successMsg = `✓ [Desarrollo] Reporte simulado. <a href="${result.previewUrl}" target="_blank" style="color: #00f2fe; text-decoration: underline; font-weight: bold;">Ver previsualización en Ethereal →</a>`;
					}
					showEmailStatus('success', successMsg);
					setTimeout(closeEmailModal, result.previewUrl ? 15000 : 3500);
				} else {
					showEmailStatus('error', result.error || 'Error desconocido al enviar el correo.');
				}
			} catch (_err) {
				showEmailStatus('error', 'Error de red. Verifica tu conexión e inténtalo de nuevo.');
			} finally {
				sendReportBtn.disabled = false;
				sendReportBtn.innerHTML =
					'<i data-lucide="send" style="width:15px;height:15px;"></i> Enviar reporte';
				lucide.createIcons();
			}
		});
	}

	function showEmailStatus(type, message) {
		if (!emailReportStatus) return;
		const isSuccess = type === 'success';
		emailReportStatus.style.display = 'block';
		emailReportStatus.style.background = isSuccess ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
		emailReportStatus.style.border = `1px solid ${isSuccess ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`;
		emailReportStatus.style.color = isSuccess ? '#34d399' : '#f87171';
		emailReportStatus.innerHTML = message;
	}

	// Add loader spin animation
	const spinStyle = document.createElement('style');
	spinStyle.textContent =
		'@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
	document.head.appendChild(spinStyle);

	// Auto-fill query parameter URL and perform scan on load if present
	const queryReport = urlParams.get('report');
	const queryUrl = urlParams.get('url');

	if (queryReport) {
		// Load existing report
		fetch(`/reports/${queryReport}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Reporte no encontrado');
				return r.json();
			})
			.then((data) => {
				if (targetUrlInput) targetUrlInput.value = data.resolvedUrl || data.url || '';
				renderResults(data);
			})
			.catch((err) => {
				console.error(err);
				alert('El reporte compartido no existe o expiró.');
			});
	} else if (queryUrl && targetUrlInput) {
		targetUrlInput.value = queryUrl;
		performDetection(queryUrl);
	}
});
