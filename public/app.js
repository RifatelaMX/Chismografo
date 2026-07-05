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

	// Perform detection flow
	async function performDetection(targetUrl) {
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

		// Disable submit
		submitBtn.disabled = true;

		// Scroll to scanning loader
		scanningState.scrollIntoView({ behavior: 'smooth', block: 'center' });

		// Mock progress visualization sequence (1.5s total time for smooth UI)
		const steps = [
			{ text: 'Conectando con el servidor de destino...', progress: 15 },
			{ text: 'Descargando y analizando código fuente HTML...', progress: 45 },
			{ text: 'Extrayendo etiquetas meta y scripts del DOM...', progress: 70 },
			{ text: 'Ejecutando motor de firmas e-commerce...', progress: 90 },
		];

		let currentStep = 0;
		const interval = setInterval(() => {
			if (currentStep < steps.length) {
				scannerStep.textContent = steps[currentStep].text;
				scannerProgressBar.style.width = `${steps[currentStep].progress}%`;
				currentStep++;
			}
		}, 350);

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

			// Clear the mock interval and fill progress to 100
			clearInterval(interval);
			scannerProgressBar.style.width = '100%';
			scannerStep.textContent = 'Análisis completo.';

			// Small delay for transition feel
			setTimeout(() => {
				scanningState.classList.add('hidden');
				submitBtn.disabled = false;

				if (data.success) {
					renderResults(data);
					fetchPageSpeed(targetUrl);
				} else {
					showError(data.error || 'Error desconocido al escanear la página.');
				}
			}, 300);
		} catch (_err) {
			clearInterval(interval);
			scanningState.classList.add('hidden');
			submitBtn.disabled = false;
			showError(
				'Ocurrió un error en la comunicación con la API. Asegúrate de que el servidor está corriendo.'
			);
		}
	}

	// Asynchronously fetch PageSpeed metrics
	async function fetchPageSpeed(targetUrl) {
		const pagespeedLoader = document.getElementById('pagespeed-loader');
		const pagespeedContent = document.getElementById('pagespeed-content');

		try {
			const res = await fetch('/api/pagespeed', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ url: targetUrl }),
			});
			const data = await res.json();

			if (data.success) {
				if (pagespeedLoader) pagespeedLoader.style.display = 'none';
				if (pagespeedContent) pagespeedContent.classList.remove('hidden');

				// Helper to update individual gauge (radius 34, circumference 214)
				const updateGauge = (scoreValId, scoreCircleId, badgeId, scoreValue) => {
					const score = scoreValue !== null && scoreValue !== undefined ? scoreValue : 0;
					const scoreValEl = document.getElementById(scoreValId);
					if (scoreValEl) scoreValEl.textContent = score;

					const scoreCircleEl = document.getElementById(scoreCircleId);
					if (scoreCircleEl) {
						const offset = 214 - (214 * score) / 100;
						scoreCircleEl.style.strokeDashoffset = offset;

						if (score >= 90) {
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
						if (score >= 90) {
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
				if (document.getElementById('ps-metric-fcp'))
					document.getElementById('ps-metric-fcp').textContent = data.metrics.fcp;
				if (document.getElementById('ps-metric-lcp'))
					document.getElementById('ps-metric-lcp').textContent = data.metrics.lcp;
				if (document.getElementById('ps-metric-tbt'))
					document.getElementById('ps-metric-tbt').textContent = data.metrics.tbt;
				if (document.getElementById('ps-metric-cls'))
					document.getElementById('ps-metric-cls').textContent = data.metrics.cls;
				if (document.getElementById('ps-metric-speedindex'))
					document.getElementById('ps-metric-speedindex').textContent = data.metrics.speedIndex;
				if (document.getElementById('ps-metric-interactive'))
					document.getElementById('ps-metric-interactive').textContent = data.metrics.interactive;
			} else {
				if (pagespeedLoader) {
					pagespeedLoader.innerHTML = `
            <i data-lucide="alert-circle" style="width: 24px; height: 24px; color: var(--danger);"></i>
            <span style="font-size: 0.82rem; color: var(--danger); text-align: center; margin-top: 0.25rem;">Error PageSpeed: ${data.error || 'No se pudo completar la auditoría.'}</span>
          `;
					lucide.createIcons();
				}
			}
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

		// Render screenshots if available
		const headerPreviewsContainer = document.getElementById('header-previews-container');
		const screenshotDesktopImg = document.getElementById('screenshot-desktop-img');
		const screenshotMobileImg = document.getElementById('screenshot-mobile-img');

		if (data.screenshots?.desktop && data.screenshots.mobile) {
			if (screenshotDesktopImg) screenshotDesktopImg.src = data.screenshots.desktop;
			if (screenshotMobileImg) screenshotMobileImg.src = data.screenshots.mobile;
			if (headerPreviewsContainer) headerPreviewsContainer.style.display = 'flex';
		} else {
			if (headerPreviewsContainer) headerPreviewsContainer.style.display = 'none';
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
						L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
							attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
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
				confidenceTextBadge.textContent = `${Math.round(data.confidence * 100)}% Confianza`;
				confidenceTextBadge.style.display = 'inline-block';
			}

			if (data.theme) {
				if (detectedThemeName) detectedThemeName.textContent = data.theme;
				if (detectedThemeContainer) detectedThemeContainer.style.display = 'block';
			} else {
				if (detectedThemeContainer) detectedThemeContainer.style.display = 'none';
			}

			const productCountContainer = document.getElementById('product-count-container');
			const productCountVal = document.getElementById('product-count-val');
			if (data.productCount !== undefined && data.productCount !== null) {
				if (productCountVal) productCountVal.textContent = data.productCount.toLocaleString();
				if (productCountContainer) productCountContainer.style.display = 'block';
			} else {
				if (productCountContainer) productCountContainer.style.display = 'none';
			}

			const iconName = techIcons[data.technology] || 'shopping-bag';

			const cmsDomains = {
				Shopify: 'shopify.com',
				Magento: 'magento.com',
				WooCommerce: 'woocommerce.com',
				PrestaShop: 'prestashop.com',
				VTEX: 'vtex.com',
			};
			const cmsDom = cmsDomains[data.technology];
			const logoToken = 'pk_MgKPAkEuRMOiYecOkx67wQ';

			if (techIconContainer) {
				if (cmsDom) {
					techIconContainer.innerHTML = `
            <img src="https://img.logo.dev/${cmsDom}?token=${logoToken}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <i data-lucide="${iconName}" style="display:none; width: 24px; height: 24px;"></i>
          `;
					techIconContainer.style.background = 'transparent';
					techIconContainer.style.border = 'none';
				} else {
					techIconContainer.innerHTML = `<i data-lucide="${iconName}"></i>`;
					techIconContainer.style.background =
						'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)';
					techIconContainer.style.border = '';
				}
			}
		} else {
			if (detectedTechName) detectedTechName.textContent = 'No Detectada';
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
          <p>No se encontraron firmas o patrones coincidentes de Shopify, Magento, WooCommerce, PrestaShop o VTEX en este sitio.</p>
        </div>
      `;
		}

		// Render Comparisons side list
		if (comparisonContainer) {
			comparisonContainer.innerHTML = '';
			const platforms = ['Shopify', 'Magento', 'WooCommerce', 'PrestaShop', 'VTEX'];

			platforms.forEach((p) => {
				const matchDetails = data.matches?.[p];
				const pConf = matchDetails?.detected ? matchDetails.confidence : 0;
				const pPercent = Math.round(pConf * 100);

				const compItem = document.createElement('div');
				compItem.className = 'comparison-item';

				compItem.innerHTML = `
          <span class="comp-tech">${p}</span>
          <div class="comp-bar-wrapper">
            <div class="comp-bar-bg">
              <div class="comp-bar-fill ${p === data.technology ? 'active' : ''}" style="width: ${pPercent}%"></div>
            </div>
            <span class="comp-val">${pPercent}%</span>
          </div>
        `;
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

	// Render scan results in a single, unified view
	function renderUnifiedDashboard(data) {
		const unifiedTechGrid = document.getElementById('unified-tech-grid');
		const unifiedTechCount = document.getElementById('unified-tech-count');

		unifiedTechGrid.innerHTML = '';

		// 1. Gather all active technologies
		const allActive = [];

		// Helper to check if a tech is excluded (CDN, Edge, SSL, Root Authority)
		const isExcluded = (_name, _category) => {
			return false;
		};

		// Helper to check if a tech is included (CMS, E-Commerce, Shopify Apps, Payment Methods, Pay Later, Hosting)
		const isIncluded = (_name, _category) => {
			return true;
		};

		// Helper to merge items by name
		const mergeItem = (
			name,
			category,
			link,
			firstSeen,
			lastSeen,
			isPremium,
			shopifyAppIcon,
			source
		) => {
			if (isExcluded(name, category)) return;
			if (source !== 'Motor Local' && !isIncluded(name, category)) return;

			const _translatedCat = translateCategory(category);

			const key = name.toLowerCase().trim();
			let existing = allActive.find((item) => item.name.toLowerCase().trim() === key);

			if (!existing) {
				existing = {
					name,
					category,
					link,
					firstSeen,
					lastSeen,
					isPremium,
					shopifyAppIcon,
					sources: [source],
				};
				allActive.push(existing);
			} else {
				if (!existing.link && link) existing.link = link;
				if (!existing.firstSeen && firstSeen) existing.firstSeen = firstSeen;
				if (!existing.lastSeen && lastSeen) existing.lastSeen = lastSeen;
				if (!existing.isPremium && isPremium) existing.isPremium = isPremium;
				if (!existing.shopifyAppIcon && shopifyAppIcon) existing.shopifyAppIcon = shopifyAppIcon;
				if (!existing.sources.includes(source)) existing.sources.push(source);
			}
		};

		// Process from Local Plugins
		if (data.plugins) {
			data.plugins.forEach((p) => {
				mergeItem(
					p.name,
					p.category,
					p.evidence.startsWith('http') ? p.evidence : '',
					'',
					'',
					'',
					p.shopifyAppIcon,
					'Motor Local'
				);
			});
		}

		// Process from Infrastructure Detections
		if (data.infrastructure) {
			data.infrastructure.forEach((inf) => {
				mergeItem(inf.name, inf.category, inf.web, '', '', '', '', 'Motor Local');
			});
		}

		// 2. Group the active technologies by category
		const groups = {};
		allActive.forEach((item) => {
			const translatedCat = translateCategory(item.category);
			if (!groups[translatedCat]) groups[translatedCat] = [];
			groups[translatedCat].push(item);
		});

		// Render group segments in UI
		const categoryPriority = [
			'CMS / E-Commerce',
			'Aplicaciones de Shopify',
			'Aplicaciones de WordPress',
			'Aplicaciones detectadas',
			'Pay Later',
			'Procesador de Pago',
			'Métodos de Pago',
			'CDN / Proxy',
			'CDN / Proxy / Seguridad',
			'Servidor Web',
			'Ubicación de Almacenamiento',
			'Infraestructura',
			'Otros',
		];

		// Sort categories based on priority list
		const sortedCategories = Object.keys(groups).sort((a, b) => {
			let idxA = categoryPriority.indexOf(a);
			let idxB = categoryPriority.indexOf(b);
			if (idxA === -1) idxA = 999;
			if (idxB === -1) idxB = 999;
			return idxA - idxB;
		});

		// Update active count
		if (unifiedTechCount) unifiedTechCount.textContent = allActive.length;

		// Update Shopify Apps count
		const shopifyAppsMetricCard = document.getElementById('shopify-apps-metric-card');
		const shopifyAppsCount = document.getElementById('shopify-apps-count');
		const shopifyAppsLabel = shopifyAppsMetricCard
			? shopifyAppsMetricCard.querySelector('.metric-label')
			: null;
		const shopifyAppsList = groups['Aplicaciones de Shopify'] || [];

		if (shopifyAppsList.length > 0) {
			if (shopifyAppsCount) shopifyAppsCount.textContent = shopifyAppsList.length;
			if (shopifyAppsLabel) {
				shopifyAppsLabel.textContent = 'Aplicaciones de Shopify';
			}
			if (shopifyAppsMetricCard) shopifyAppsMetricCard.style.display = 'flex';
		} else {
			if (shopifyAppsMetricCard) shopifyAppsMetricCard.style.display = 'none';
		}

		if (allActive.length > 0) {
			sortedCategories.forEach((cat) => {
				const catContainer = document.createElement('div');
				catContainer.className = 'tech-category-group';
				catContainer.style.marginBottom = '2rem';

				catContainer.innerHTML = `
          <h4 style="border-left: 3px solid var(--accent-primary); padding-left: 0.75rem; margin-bottom: 1.25rem; color: white; font-weight: 600; font-size: 1.1rem; display: flex; align-items: center; justify-content: space-between;">
            <span>${cat}</span>
            <span style="font-size:0.8rem; background:rgba(255,255,255,0.06); padding:0.1rem 0.5rem; border-radius:10px; font-weight:normal; opacity:0.8;">${groups[cat].length}</span>
          </h4>
          <div class="plugins-grid"></div>
        `;

				const grid = catContainer.querySelector('.plugins-grid');

				groups[cat].forEach((tech) => {
					const card = document.createElement('div');
					card.className = 'plugin-card';
					card.style.padding = '0.75rem';

					const iconUrl = getTechIconUrl(tech);
					const initial = tech.name.charAt(0).toUpperCase();
					const iconHtml = iconUrl
						? `<img src="${iconUrl}" class="tech-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`
						: '';
					const letterIconStyle = iconUrl ? 'style="display: none;"' : '';

					let infoHtml = '';
					if (tech.firstSeen) {
						infoHtml = `<span style="font-size:0.62rem; color:var(--text-dark); opacity:0.8;">Visto: ${tech.firstSeen}</span>`;
					}

					card.innerHTML = `
            <div class="plugin-header" style="display: flex; align-items: center; gap: 0.65rem; margin: 0; width: 100%;">
              <div class="tech-icon-container-mini" style="position: relative; width: 28px; height: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                ${iconHtml}
                <div class="tech-icon-mini" ${letterIconStyle} style="margin: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 4px; background: rgba(255, 255, 255, 0.05); font-weight: bold; border: 1px solid rgba(255, 255, 255, 0.1); color: var(--text-dark); font-size: 0.75rem;">${initial}</div>
              </div>
              <div class="plugin-title-info" style="display: flex; flex-direction: column; flex-grow: 1; min-width: 0;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; width: 100%;">
                  <h4 style="margin: 0; font-size: 0.88rem; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(tech.name)}</h4>
                  <span class="plugin-category" style="font-size: 0.68rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px;">${escapeHtml(tech.category)}</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: flex-end; margin-top: 0.15rem; font-size: 0.62rem;">
                  ${infoHtml}
                </div>
              </div>
            </div>
          `;
					grid.appendChild(card);
				});

				unifiedTechGrid.appendChild(catContainer);
			});
		} else {
			unifiedTechGrid.innerHTML = `
        <div style="text-align: center; color: var(--text-dark); padding: 3rem 0; width: 100%;">
          <i data-lucide="package-search" style="width: 48px; height: 48px; margin-bottom: 0.5rem; stroke-width: 1;"></i>
          <p>No se encontraron tecnologías o aplicaciones compatibles en esta tienda.</p>
        </div>
      `;
		}

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
					logoHtml = `<img src="https://img.logo.dev/${domain}?token=${logoToken}" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />`;
				}

				card.innerHTML = `
          <div style="width: 36px; height: 36px; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; padding: 4px; flex-shrink: 0;">
            ${logoHtml}
            <i data-lucide="credit-card" style="${domain ? 'display:none;' : ''} width: 20px; height: 20px; color: var(--text-dark);"></i>
          </div>
          <div style="display: flex; flex-direction: column; min-width: 0;">
            <h4 style="margin: 0; color: white; font-weight: 600; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(gw)}</h4>
            <span style="font-size: 0.72rem; color: var(--text-dark);">Pasarela de Pago</span>
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
		if (!unsafe) return '';
		return unsafe
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	// Helper to extract domain and build Logo.dev / Google Favicon logo URL
	function getTechIconUrl(tech) {
		if (tech.shopifyAppIcon) {
			return tech.shopifyAppIcon;
		}
		let domain = '';

		// Extract domain from link
		if (tech.link) {
			try {
				domain = new URL(tech.link).hostname.replace(/^www\./i, '');
			} catch (_e) {}
		}
		if (!domain && tech.website) {
			try {
				domain = new URL(tech.website).hostname.replace(/^www\./i, '');
			} catch (_e) {}
		}

		const token = serverConfig.logoDevToken;
		const nameLower = tech.name.toLowerCase();

		// Check if domain is just pointing to Shopify ecosystem domains (which returns Shopify logo for other apps)
		const isShopifyDomain = domain.includes('shopify.com');
		const isShopifyPlatform = nameLower === 'shopify';

		if (
			domain &&
			domain !== '#' &&
			!domain.includes('github.com') &&
			!domain.includes('wikipedia.org') &&
			!domain.includes('w3.org') &&
			!domain.includes('trends.builtwith.com') &&
			(!isShopifyDomain || isShopifyPlatform)
		) {
			if (token) {
				return `https://img.logo.dev/${domain}?token=${token}&size=64`;
			} else {
				return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
			}
		}

		// Fallbacks for known names or local plugins / Shopify ecosystem apps

		// If we have a token, we can use logo.dev by name
		if (token) {
			let searchName = nameLower;
			if (nameLower.includes('shopify') && nameLower !== 'shopify') {
				// Strip shopify mentions to find the actual app brand
				searchName = nameLower
					.replace(/\bshopify\b/gi, '')
					.replace(/\s+for\s+/gi, '')
					.replace(/\s+theme\b/gi, '')
					.replace(/\s+app\b/gi, '')
					.trim();
				if (!searchName) searchName = 'shopify';
			}

			// Known overrides to ensure exact matches
			if (nameLower.includes('wordpress')) searchName = 'wordpress';
			else if (nameLower.includes('woocommerce')) searchName = 'woocommerce';
			else if (nameLower.includes('magento')) searchName = 'magento';
			else if (nameLower.includes('prestashop')) searchName = 'prestashop';
			else if (nameLower.includes('vtex')) searchName = 'vtex';
			else if (nameLower.includes('stripe')) searchName = 'stripe';
			else if (nameLower.includes('paypal')) searchName = 'paypal';
			else if (nameLower.includes('facebook')) searchName = 'facebook';
			else if (nameLower.includes('google')) searchName = 'google';
			else if (nameLower.includes('cloudflare')) searchName = 'cloudflare';
			else if (nameLower.includes('jquery')) searchName = 'jquery';
			else if (nameLower.includes('conekta')) searchName = 'conekta';
			else if (nameLower.includes('klaviyo')) searchName = 'klaviyo';
			else if (nameLower.includes('tidio')) searchName = 'tidio';
			else if (nameLower.includes('recaptcha')) searchName = 'recaptcha';
			else if (nameLower.includes('font awesome')) searchName = 'fontawesome';
			else if (nameLower.includes('loox')) searchName = 'loox';
			else if (nameLower.includes('klarna')) searchName = 'klarna';
			else if (nameLower.includes('pagefly')) searchName = 'pagefly';
			else if (nameLower.includes('mercado pago')) searchName = 'mercadopago';
			else if (nameLower.includes('openpay')) searchName = 'openpay';
			else if (nameLower.includes('wordfence')) searchName = 'wordfence';
			else if (nameLower.includes('contact form 7')) searchName = 'contactform7';
			else if (nameLower.includes('mailchimp')) searchName = 'mailchimp';

			return `https://img.logo.dev/name/${searchName}?token=${token}&size=64`;
		}

		// Otherwise, fallback to Google Favicon service with predefined domains
		let fallbackDomain = '';

		// Clean name for fallback domain extraction
		let cleanFallbackName = nameLower;
		if (nameLower.includes('shopify') && nameLower !== 'shopify') {
			cleanFallbackName = nameLower
				.replace(/\bshopify\b/gi, '')
				.replace(/\s+for\s+/gi, '')
				.replace(/\s+theme\b/gi, '')
				.replace(/\s+app\b/gi, '')
				.trim();
		}

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
		else if (nameLower.includes('mercado pago')) fallbackDomain = 'mercadopago.com.mx';
		else if (nameLower.includes('openpay')) fallbackDomain = 'openpay.mx';
		else if (nameLower.includes('wordfence')) fallbackDomain = 'wordfence.com';
		else if (nameLower.includes('contact form 7')) fallbackDomain = 'contactform7.com';
		else if (nameLower.includes('mailchimp')) fallbackDomain = 'mailchimp.com';
		else if (cleanFallbackName) {
			fallbackDomain = `${cleanFallbackName}.com`;
		}

		if (fallbackDomain) {
			return `https://www.google.com/s2/favicons?domain=${fallbackDomain}&sz=64`;
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

	function downloadFile(content, fileName, contentType) {
		const a = document.createElement('a');
		const file = new Blob([content], { type: contentType });
		a.href = URL.createObjectURL(file);
		a.download = fileName;
		a.click();
		URL.revokeObjectURL(a.href);
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
					showEmailStatus(
						'success',
						`✓ Reporte enviado a <strong>${email}</strong>. Revisa tu bandeja de entrada.`
					);
					setTimeout(closeEmailModal, 3500);
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
	const queryUrl = urlParams.get('url');
	if (queryUrl && targetUrlInput) {
		targetUrlInput.value = queryUrl;
		performDetection(queryUrl);
	}
});
