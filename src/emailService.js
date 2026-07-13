/**
 * Email Service — Rífatela Detector
 * Sends branded scan report emails via SMTP using Nodemailer.
 */

import nodemailer from 'nodemailer';

/**
 * Returns a configured Nodemailer transporter from environment variables,
 * or creates an Ethereal Email test account as a fallback for development.
 */
async function createTransporter() {
	const host = process.env.SMTP_HOST;
	const port = Number.parseInt(process.env.SMTP_PORT || '587', 10);
	const secure = process.env.SMTP_SECURE === 'true'; // true = TLS/465, false = STARTTLS/587

	if (process.env.DEV === 'true' || !host || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
		// Fallback/Force for development: Ethereal test account
		console.log(
			'[Email] Running in DEV mode or SMTP config missing. Creating an Ethereal test account...'
		);
		const testAccount = await nodemailer.createTestAccount();
		console.log(`[Email] Ethereal test account created: ${testAccount.user}`);
		return nodemailer.createTransport({
			host: 'smtp.ethereal.email',
			port: 587,
			secure: false,
			auth: {
				user: testAccount.user,
				pass: testAccount.pass,
			},
		});
	}

	return nodemailer.createTransport({
		host,
		port,
		secure,
		auth: {
			user: process.env.SMTP_USER,
			pass: process.env.SMTP_PASS,
		},
	});
}

/**
 * Builds the branded HTML email body for a scan report.
 * @param {object} data - The full detection result object from /api/detect
 * @param {string} recipientName - Optional display name for greeting
 */
export function buildReportEmail(data, recipientName = '') {
	const {
		resolvedUrl = '',
		technology = 'Desconocido',
		confidence = 0,
		theme = null,
		plugins = [],
		infrastructure = [],
		location = {},
		pagespeed = null,
	} = data;

	const confidencePct = Math.round((confidence || 0) * 100);
	const domain = resolvedUrl.replace(/^https?:\/\//, '').split('/')[0];
	const scanDate = new Date().toLocaleDateString('es-MX', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});

	const appUrl = process.env.APP_URL || 'http://localhost:3000';

	// Platform badge color
	const platformColors = {
		Shopify: '#9b59b6',
		Magento: '#ff7eb9',
		WooCommerce: '#00a8ff',
		PrestaShop: '#e67e22',
		VTEX: '#2ecc71',
	};
	const platformColor = platformColors[technology] || '#9b59b6';

	// CMS confidence bar width
	const barWidth = Math.max(confidencePct, 5);

	// Plugins list HTML
	const pluginsHtml =
		plugins.length > 0
			? plugins
					.map(
						(p) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px dashed #b8d4e3;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding-right: 12px; width: 24px;">
                  <img src="https://img.logo.dev/${p.logo || domain}?token=${process.env.LOGODEV_PUBLISHABLE_KEY || ''}&size=24" 
                       width="20" height="20" alt="${p.name}" 
                       style="border-radius: 4px; vertical-align: middle; display: block; border: 1px solid #2b2523;"
                       onerror="this.style.display='none'">
                </td>
                <td>
                  <span style="color: #2b2523; font-size: 13px; font-weight: bold; font-family: 'Comic Sans MS', 'Comic Neue', sans-serif;">${p.name}</span>
                  <span style="color: #5c5654; font-size: 11px; margin-left: 8px; font-family: Arial, sans-serif; font-style: italic;">(${p.category || 'Otros chismes'})</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
					)
					.join('')
			: '<tr><td style="color: #5c5654; font-size: 13px; padding: 12px 0; font-family: \'Comic Sans MS\', sans-serif; font-style: italic;">🤷 No le hallamos apps o plugins instalados.</td></tr>';

	// Infrastructure list HTML
	const infraHtml =
		infrastructure.length > 0
			? infrastructure
					.map(
						(i) => `
        <span style="display: inline-block; background: #e8f4fc; border: 1px dashed #00a8ff; 
                     color: #2b2523; font-size: 11px; font-weight: bold; padding: 4px 10px; font-family: 'Comic Sans MS', sans-serif;
                     border-radius: 12px; margin: 3px 4px 3px 0;">${i.name}</span>`
					)
					.join('')
			: '<span style="color: #5c5654; font-size: 13px; font-family: \'Comic Sans MS\', sans-serif; font-style: italic;">🤷 No se le vio infraestructura conocida.</span>';

	// Location info
	const locationHtml = location?.country
		? `<span style="color: #5c5654; font-size: 13px; font-family: 'Comic Sans MS', sans-serif; font-weight: bold;">📍 Opera desde: ${location.country}${location.city ? ` (${location.city})` : ''}</span>`
		: '';

	// PageSpeed section (optional)
	const pagespeedHtml = pagespeed?.lighthouseResult
		? (() => {
				const cats = pagespeed.lighthouseResult.categories || {};
				const perf = Math.round((cats.performance?.score || 0) * 100);
				const acc = Math.round((cats.accessibility?.score || 0) * 100);
				const seo = Math.round((cats.seo?.score || 0) * 100);
				const scoreColor = (s) => (s >= 90 ? '#2ecc71' : s >= 50 ? '#f39c12' : '#ff7eb9');
				return `
      <!-- Sticky tape -->
      <div style="background: rgba(244,238,216,0.85); border-left: 1px dashed rgba(43,37,35,0.15); border-right: 1px dashed rgba(43,37,35,0.15); height: 14px; width: 80px; margin: 20px auto -8px; z-index: 10; position: relative;"></div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" 
             style="background: #ffffff; border: 2px solid #2b2523; 
                    border-radius: 12px; box-shadow: 4px 4px 0px rgba(43,37,35,0.15); margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px 24px;">
            <p style="margin: 0 0 16px; color: #ff7eb9; font-size: 13px; font-weight: 700; text-transform: uppercase; font-family: 'Comic Sans MS', sans-serif;">
              ⚡ ¿Qué tan rápido va? (PageSpeed)
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" width="33%" style="padding: 8px;">
                  <div style="font-size: 28px; font-weight: 900; color: ${scoreColor(perf)}; font-family: 'Comic Sans MS', sans-serif;">${perf}</div>
                  <div style="font-size: 11px; color: #5c5654; margin-top: 4px; font-family: Arial, sans-serif; font-weight: bold;">Velocidad</div>
                </td>
                <td align="center" width="33%" style="padding: 8px; border-left: 2px dashed #b8d4e3; border-right: 2px dashed #b8d4e3;">
                  <div style="font-size: 28px; font-weight: 900; color: ${scoreColor(acc)}; font-family: 'Comic Sans MS', sans-serif;">${acc}</div>
                  <div style="font-size: 11px; color: #5c5654; margin-top: 4px; font-family: Arial, sans-serif; font-weight: bold;">Accesibilidad</div>
                </td>
                <td align="center" width="33%" style="padding: 8px;">
                  <div style="font-size: 28px; font-weight: 900; color: ${scoreColor(seo)}; font-family: 'Comic Sans MS', sans-serif;">${seo}</div>
                  <div style="font-size: 11px; color: #5c5654; margin-top: 4px; font-family: Arial, sans-serif; font-weight: bold;">SEO</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
			})()
		: '';

	// Screenshots section (optional)
	const screenshotsHtml =
		data.screenshots?.desktop && data.screenshots?.mobile
			? `
      <!-- Sticky tape -->
      <div style="background: rgba(244,238,216,0.85); border-left: 1px dashed rgba(43,37,35,0.15); border-right: 1px dashed rgba(43,37,35,0.15); height: 14px; width: 80px; margin: 20px auto -8px; z-index: 10; position: relative;"></div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" 
             style="background: #ffffff; border: 2px solid #2b2523; 
                    border-radius: 12px; box-shadow: 4px 4px 0px rgba(43,37,35,0.15); margin-bottom: 20px;">
        <tr>
          <td style="padding: 20px 24px;">
            <p style="margin: 0 0 16px; color: #00a8ff; font-size: 13px; font-weight: 700; text-transform: uppercase; font-family: 'Comic Sans MS', sans-serif;">
              📸 Fotos espía (Capturas)
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <!-- Desktop Preview -->
                <td style="padding: 4px; vertical-align: top;" width="70%">
                  <div style="background: #ffffff; border: 2px solid #2b2523; border-radius: 6px; overflow: hidden;">
                    <!-- Browser header mini -->
                    <div style="height: 14px; background: #eef2f5; border-bottom: 2px solid #2b2523; padding: 0 8px; display: flex; align-items: center;">
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: #ff7eb9; display: inline-block; margin-right: 3px; border: 1px solid #2b2523;"></span>
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: #fdf6e3; display: inline-block; margin-right: 3px; border: 1px solid #2b2523;"></span>
                      <span style="width: 5px; height: 5px; border-radius: 50%; background: #00a8ff; display: inline-block; border: 1px solid #2b2523;"></span>
                    </div>
                    <img src="${appUrl}${data.screenshots.desktop}" alt="Desktop Preview" 
                         style="width: 100%; height: auto; display: block; object-fit: cover;" width="350">
                  </div>
                </td>
                <!-- Mobile Preview -->
                <td style="padding: 4px; vertical-align: top;" width="30%">
                  <div style="background: #ffffff; border: 2px solid #2b2523; border-radius: 8px; overflow: hidden; max-width: 120px; margin-left: auto;">
                    <!-- Phone camera notch mini -->
                    <div style="height: 14px; background: #eef2f5; border-bottom: 2px solid #2b2523; text-align: center;">
                      <span style="width: 16px; height: 3px; border-radius: 1.5px; background: #2b2523; display: inline-block; margin-top: 5px;"></span>
                    </div>
                    <img src="${appUrl}${data.screenshots.mobile}" alt="Mobile Preview" 
                         style="width: 100%; height: auto; display: block; object-fit: cover;" width="110">
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
			: '';

	const greeting = recipientName ? `Hola, <strong>${recipientName}</strong>` : 'Hola';

	const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expediente Chismoso — ${domain}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #edf2f7; font-family: 'Comic Sans MS', 'Comic Neue', sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #edf2f7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Email container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" 
               style="max-width: 600px; width: 100%; background: #fcfaf2; border: 3px solid #2b2523; 
                      border-radius: 16px; box-shadow: 8px 8px 0px rgba(43,37,35,0.15); overflow: hidden;">

          <!-- Header gradient bar (gel pens style) -->
          <tr>
            <td style="background: #9b59b6; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Main Content Area with Pink Margin simulation -->
          <tr>
            <td style="padding: 40px 30px 24px; border-left: 4px double #ff7eb9;">
              
              <!-- Header with logo sticker -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="background-color: #2b2523; padding: 14px 24px; border-radius: 12px; border: 2px solid #2b2523; display: inline-block; box-shadow: 3px 3px 0px rgba(43,37,35,0.25);">
                      <img src="${appUrl}/brand/logo/Negativo.svg" width="150" alt="Chismógrafo" style="display: block; border: 0;">
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span style="font-family: Georgia, serif; font-size: 14px; color: #ff7eb9; font-style: italic; font-weight: bold;">✏️ el cuaderno donde apuntamos todos los chismes tech</span>
                  </td>
                </tr>
              </table>

              <!-- Greeting and Intro -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 10px; color: #2b2523; font-size: 18px; font-family: 'Comic Sans MS', sans-serif;">
                      ¡Psst! ${greeting} 🤫
                    </h3>
                    <p style="margin: 0; color: #5c5654; font-size: 14px; line-height: 1.6; font-family: 'Comic Sans MS', sans-serif;">
                      Nos metimos a husmear a los servidores de <strong>${domain}</strong> y le sacamos todo el chisme tecnológico. ¡Aquí tienes el expediente calientito!
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Main Hero Box (Post-It style) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background: #fdf6e3; border: 2px dashed #9b59b6; border-radius: 16px; margin-bottom: 24px; box-shadow: 4px 4px 0px rgba(43,37,35,0.1);">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px; color: #9b59b6; font-size: 11px; font-weight: bold; text-transform: uppercase; font-family: 'Comic Sans MS', sans-serif;">
                      📌 Plataforma principal detectada
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="vertical-align: middle;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right: 12px; vertical-align: middle;">
                                <img src="https://img.logo.dev/${technology.toLowerCase()}.com?token=${process.env.LOGODEV_PUBLISHABLE_KEY || ''}&size=40"
                                     width="36" height="36" alt="${technology}"
                                     style="border-radius: 8px; display: block; border: 1.5px solid #2b2523;"
                                     onerror="this.style.display='none'">
                              </td>
                              <td style="vertical-align: middle;">
                                <div style="font-size: 24px; font-weight: 900; color: #2b2523; font-family: 'Comic Sans MS', sans-serif;">${technology}</div>
                                ${theme ? `<div style="font-size: 12px; color: #5c5654; margin-top: 2px; font-family: 'Comic Sans MS', sans-serif; font-style: italic;">Tema: ${theme}</div>` : ''}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <!-- Confidence Meter -->
                          <div style="text-align: right;">
                            <span style="font-size: 30px; font-weight: 900; color: #2b2523; font-family: 'Comic Sans MS', sans-serif;">${confidencePct}%</span>
                            <div style="margin-top: 4px; width: 100px; height: 8px; background: #eef2f5; border: 1.5px solid #2b2523; border-radius: 99px; overflow: hidden; margin-left: auto;">
                              <div style="height: 100%; width: ${barWidth}%; background-color: #ff7eb9;"></div>
                            </div>
                            <p style="margin: 2px 0 0; font-size: 9px; color: #5c5654; text-transform: uppercase; font-family: Arial, sans-serif; font-weight: bold;">De Confianza</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top: 15px; padding-top: 12px; border-top: 1px dashed rgba(43,37,35,0.15);">
                      ${locationHtml}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Plugins Note -->
              <!-- Sticky tape -->
              <div style="background: rgba(244,238,216,0.85); border-left: 1px dashed rgba(43,37,35,0.15); border-right: 1px dashed rgba(43,37,35,0.15); height: 14px; width: 80px; margin: 0 auto -8px; z-index: 10; position: relative;"></div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background: #ffffff; border: 2px solid #2b2523; 
                            border-radius: 12px; box-shadow: 4px 4px 0px rgba(43,37,35,0.15); margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: #9b59b6; font-size: 13px; font-weight: bold; text-transform: uppercase; font-family: 'Comic Sans MS', sans-serif;">
                      🔌 Apps que le cachamos (${plugins.length})
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${pluginsHtml}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Infrastructure Note -->
              <!-- Sticky tape -->
              <div style="background: rgba(244,238,216,0.85); border-left: 1px dashed rgba(43,37,35,0.15); border-right: 1px dashed rgba(43,37,35,0.15); height: 14px; width: 80px; margin: 0 auto -8px; z-index: 10; position: relative;"></div>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background: #ffffff; border: 2px solid #2b2523; 
                            border-radius: 12px; box-shadow: 4px 4px 0px rgba(43,37,35,0.15); margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: #ff7eb9; font-size: 13px; font-weight: bold; text-transform: uppercase; font-family: 'Comic Sans MS', sans-serif;">
                      🛡️ Infraestructura del sitio (${infrastructure.length})
                    </p>
                    <div style="padding-top: 4px;">
                      ${infraHtml}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- PageSpeed -->
              ${pagespeedHtml}

              <!-- Screenshots -->
              ${screenshotsHtml}

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0 20px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/?url=${encodeURIComponent(resolvedUrl)}" 
                       style="display: inline-block; background-color: #ff7eb9; color: #ffffff; text-decoration: none; 
                              font-weight: 900; font-size: 15px; padding: 14px 32px; border-radius: 50px; 
                              border: 3px solid #2b2523; box-shadow: 4px 4px 0px #2b2523; font-family: 'Comic Sans MS', sans-serif;
                              text-shadow: 1px 1px 0px rgba(43,37,35,0.35);">
                      ¡Ver todo el chisme completo! 🔍
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px; border-top: 2px dashed #b8d4e3; background-color: #fbf6e9; border-left: 4px double #ff7eb9;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; color: #5c5654; line-height: 1.5; font-family: 'Comic Sans MS', sans-serif;">
                      Este expediente chismoso fue generado por el <strong style="color: #ff7eb9;">Chismógrafo 📓</strong>.<br>
                      Si te enviaron esto por error, no te estreses, bórralo y ya. ✨
                    </p>
                  </td>
                  <td align="right" style="vertical-align: middle; padding-left: 10px;">
                    <p style="margin: 0; font-size: 11px; color: #9b59b6; font-weight: 800; font-family: 'Comic Sans MS', sans-serif; white-space: nowrap;">📓 chismografo.com</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom gradient bar -->
          <tr>
            <td style="background: #ff7eb9; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

        </table>

        <!-- Copyright note below card -->
        <p style="margin: 24px 0 0; font-size: 11px; color: #5c5654; text-align: center; font-family: 'Comic Sans MS', sans-serif; font-weight: bold;">
          © ${new Date().getFullYear()} Chismógrafo 📓 · 
          <a href="${appUrl}" style="color: #ff7eb9; text-decoration: none;">chismografo.com</a>
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;

	const text = `Reporte de Auditoría — ${domain}

Plataforma: ${technology} (Confianza: ${confidencePct}%)
${theme ? `Tema: ${theme}\n` : ''}URL: ${resolvedUrl}
Fecha: ${scanDate}
${location?.country ? `Ubicación: ${location.country}${location.city ? ` · ${location.city}` : ''}` : ''}

APPS Y PLUGINS (${plugins.length}):
${plugins.map((p) => `  - ${p.name}${p.category ? ` (${p.category})` : ''}`).join('\n') || '  Ninguno detectado'}

INFRAESTRUCTURA (${infrastructure.length}):
${infrastructure.map((i) => `  - ${i.name}${i.category ? ` (${i.category})` : ''}`).join('\n') || '  No detectada'}

Ver auditoría completa: ${appUrl}/?url=${encodeURIComponent(resolvedUrl)}

---
Este reporte fue generado por Chismógrafo · rifatela.lol
`;

	return { html, text };
}

/**
 * Sends a scan report email.
 * @param {string} toEmail   - Recipient email address
 * @param {string} toName    - Recipient display name (optional)
 * @param {object} scanData  - Full detection result from /api/detect
 */
export async function sendReportEmail(toEmail, toName, scanData) {
	const transporter = await createTransporter();

	const domain = (scanData.resolvedUrl || '').replace(/^https?:\/\//, '').split('/')[0];

	const isEthereal = transporter.options.host === 'smtp.ethereal.email';
	const fromName = process.env.SMTP_FROM_NAME || 'Chismógrafo';
	const fromEmail = isEthereal
		? transporter.options.auth.user
		: process.env.SMTP_FROM || process.env.SMTP_USER;

	const { html, text } = buildReportEmail(scanData, toName);

	const info = await transporter.sendMail({
		from: `"${fromName}" <${fromEmail}>`,
		to: toName ? `"${toName}" <${toEmail}>` : toEmail,
		subject: `⚡ Reporte de Auditoría: ${domain} — Chismógrafo`,
		text,
		html,
	});

	let previewUrl = '';
	if (isEthereal) {
		previewUrl = nodemailer.getTestMessageUrl(info);
		console.log(`[Email] Ethereal Preview URL: ${previewUrl}`);
	}

	return {
		messageId: info.messageId,
		accepted: info.accepted,
		previewUrl,
	};
}
