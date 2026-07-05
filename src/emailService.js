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
		Shopify: '#96bf48',
		Magento: '#f26322',
		WooCommerce: '#7f54b3',
		PrestaShop: '#df0067',
		VTEX: '#f71963',
	};
	const platformColor = platformColors[technology] || '#00f2fe';

	// CMS confidence bar width
	const barWidth = Math.max(confidencePct, 5);

	// Plugins list HTML
	const pluginsHtml =
		plugins.length > 0
			? plugins
					.map(
						(p) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-right: 10px;">
                  <img src="https://img.logo.dev/${p.logo || domain}?token=${process.env.LOGODEV_PUBLISHABLE_KEY || ''}&size=24" 
                       width="20" height="20" alt="${p.name}" 
                       style="border-radius: 4px; vertical-align: middle; display: block;"
                       onerror="this.style.display='none'">
                </td>
                <td>
                  <span style="color: #e2e8f0; font-size: 13px; font-weight: 500;">${p.name}</span>
                  <span style="color: #64748b; font-size: 11px; margin-left: 8px;">${p.category || ''}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
					)
					.join('')
			: '<tr><td style="color: #64748b; font-size: 13px; padding: 8px 0;">No se detectaron apps o plugins.</td></tr>';

	// Infrastructure list HTML
	const infraHtml =
		infrastructure.length > 0
			? infrastructure
					.map(
						(i) => `
        <span style="display: inline-block; background: rgba(0,242,254,0.08); border: 1px solid rgba(0,242,254,0.2); 
                     color: #7dd3fc; font-size: 11px; font-weight: 600; padding: 3px 10px; 
                     border-radius: 20px; margin: 3px 4px 3px 0;">${i.name}</span>`
					)
					.join('')
			: '<span style="color: #64748b; font-size: 13px;">No detectada</span>';

	// Location info
	const locationHtml = location?.country
		? `<span style="color: #94a3b8; font-size: 12px;">📍 ${location.country}${location.city ? ` · ${location.city}` : ''}</span>`
		: '';

	// PageSpeed section (optional)
	const pagespeedHtml = pagespeed?.lighthouseResult
		? (() => {
				const cats = pagespeed.lighthouseResult.categories || {};
				const perf = Math.round((cats.performance?.score || 0) * 100);
				const acc = Math.round((cats.accessibility?.score || 0) * 100);
				const seo = Math.round((cats.seo?.score || 0) * 100);
				const scoreColor = (s) => (s >= 90 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444');
				return `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" 
             style="margin-top: 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); 
                    border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 20px 24px;">
            <p style="margin: 0 0 16px; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
              ⚡ PageSpeed Insights
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td align="center" width="33%" style="padding: 8px;">
                  <div style="font-size: 28px; font-weight: 800; color: ${scoreColor(perf)};">${perf}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Rendimiento</div>
                </td>
                <td align="center" width="33%" style="padding: 8px; border-left: 1px solid rgba(255,255,255,0.06); border-right: 1px solid rgba(255,255,255,0.06);">
                  <div style="font-size: 28px; font-weight: 800; color: ${scoreColor(acc)};">${acc}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Accesibilidad</div>
                </td>
                <td align="center" width="33%" style="padding: 8px;">
                  <div style="font-size: 28px; font-weight: 800; color: ${scoreColor(seo)};">${seo}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 4px;">SEO</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
			})()
		: '';

	const greeting = recipientName ? `Hola, <strong>${recipientName}</strong>` : 'Hola';

	const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Auditoría — ${domain}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050813; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #050813;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Email container -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" 
               style="max-width: 600px; width: 100%; background: #0d1117; border: 1px solid rgba(255,255,255,0.08); 
                      border-radius: 20px; overflow: hidden;">

          <!-- Header gradient bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #8a2be2 0%, #00f2fe 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 36px 40px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <!-- Logo mark -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding-right: 12px; vertical-align: middle;">
                          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #8a2be2, #00f2fe); 
                                      border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <img src="${appUrl}/favicon.ico" width="24" height="24" alt="⚡" 
                                 style="display: block;" onerror="this.style.display='none'">
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Rífatela</span>
                          <span style="font-size: 18px; font-weight: 300; color: #00f2fe;"> Detector</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="font-size: 11px; color: #475569; font-weight: 500;">Auditoría de Tecnología E-Commerce</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero section -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background: linear-gradient(135deg, rgba(138,43,226,0.12) 0%, rgba(0,242,254,0.06) 100%); 
                            border: 1px solid rgba(138,43,226,0.2); border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 28px 28px 24px;">
                    <p style="margin: 0 0 12px; color: #ffffff; font-size: 14px; font-weight: 500;">
                      ${greeting},
                    </p>
                    <p style="margin: 0 0 6px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">
                      Reporte de Auditoría
                    </p>
                    <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; word-break: break-all;">
                      ${domain}
                    </h1>
                    ${locationHtml}
                    <p style="margin: 12px 0 0; color: #64748b; font-size: 12px;">Generado el ${scanDate}</p>
                  </td>
                </tr>
                <!-- Divider -->
                <tr>
                  <td style="padding: 0 28px;"><div style="height: 1px; background: rgba(255,255,255,0.07);"></div></td>
                </tr>
                <!-- CMS Detection -->
                <tr>
                  <td style="padding: 20px 28px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td>
                          <p style="margin: 0 0 10px; color: #94a3b8; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">
                            Plataforma detectada
                          </p>
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right: 12px; vertical-align: middle;">
                                <img src="https://img.logo.dev/${technology.toLowerCase()}.com?token=${process.env.LOGODEV_PUBLISHABLE_KEY || ''}&size=40"
                                     width="36" height="36" alt="${technology}"
                                     style="border-radius: 8px; display: block;"
                                     onerror="this.style.display='none'">
                              </td>
                              <td style="vertical-align: middle;">
                                <div style="font-size: 22px; font-weight: 800; color: ${platformColor};">${technology}</div>
                                ${theme ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tema: ${theme}</div>` : ''}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align="right" style="vertical-align: bottom;">
                          <!-- Confidence -->
                          <div style="text-align: right;">
                            <span style="font-size: 32px; font-weight: 900; color: #ffffff;">${confidencePct}<span style="font-size: 18px; color: #94a3b8;">%</span></span>
                            <div style="margin-top: 6px; width: 120px; height: 6px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden; margin-left: auto;">
                              <div style="height: 100%; width: ${barWidth}%; background: linear-gradient(90deg, #8a2be2, #00f2fe); border-radius: 999px;"></div>
                            </div>
                            <p style="margin: 4px 0 0; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.06em;">Confianza</p>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body sections -->
          <tr>
            <td style="padding: 0 40px 32px;">

              <!-- Plugins / Apps -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); 
                            border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px 24px 4px;">
                    <p style="margin: 0 0 16px; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
                      🧩 Apps y Plugins detectados (${plugins.length})
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${pluginsHtml}
                    </table>
                  </td>
                </tr>
                <tr><td style="padding: 12px 24px 20px;"></td></tr>
              </table>

              <!-- Infrastructure -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                     style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); 
                            border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    <p style="margin: 0 0 12px; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
                      🛡️ Infraestructura (${infrastructure.length})
                    </p>
                    <div>${infraHtml}</div>
                  </td>
                </tr>
              </table>

              <!-- PageSpeed (conditional) -->
              ${pagespeedHtml}

            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 36px;" align="center">
              <a href="${appUrl}/?url=${encodeURIComponent(resolvedUrl)}" 
                 style="display: inline-block; background: linear-gradient(90deg, #8a2be2, #00f2fe); 
                        color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; 
                        padding: 14px 32px; border-radius: 12px; letter-spacing: 0.01em;">
                Ver auditoría completa →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.06);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; color: #334155; line-height: 1.5;">
                      Este reporte fue generado automáticamente por <strong style="color: #475569;">Rífatela Detector</strong>.<br>
                      Si no solicitaste este correo, puedes ignorarlo de forma segura.
                    </p>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <p style="margin: 0; font-size: 11px; color: #1e293b; font-weight: 600;">⚡ rifatela.com</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Bottom gradient bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #00f2fe 0%, #8a2be2 100%); height: 3px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

        </table>

        <!-- Legal note below card -->
        <p style="margin: 24px 0 0; font-size: 11px; color: #1e293b; text-align: center;">
          © ${new Date().getFullYear()} Rífatela · 
          <a href="${appUrl}" style="color: #334155; text-decoration: none;">rifatela.com</a>
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
Este reporte fue generado por Rífatela Detector · rifatela.com
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
	const fromName = process.env.SMTP_FROM_NAME || 'Rífatela Detector';
	const fromEmail = isEthereal
		? transporter.options.auth.user
		: process.env.SMTP_FROM || process.env.SMTP_USER;

	const { html, text } = buildReportEmail(scanData, toName);

	const info = await transporter.sendMail({
		from: `"${fromName}" <${fromEmail}>`,
		to: toName ? `"${toName}" <${toEmail}>` : toEmail,
		subject: `⚡ Reporte de Auditoría: ${domain} — Rífatela Detector`,
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
