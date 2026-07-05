import dns from 'node:dns';
import { promisify } from 'node:util';
import geoip from 'geoip-lite';

const lookupPromise = promisify(dns.lookup);

/**
 * Clean URL and return hostname
 */
function getHostname(urlStr) {
	try {
		let clean = urlStr.trim();
		if (!/^https?:\/\//i.test(clean)) {
			clean = `https://${clean}`;
		}
		const parsed = new URL(clean);
		return parsed.hostname;
	} catch (_err) {
		return urlStr
			.replace(/^https?:\/\//i, '')
			.replace(/^www\./i, '')
			.split('/')[0]
			.trim();
	}
}

/**
 * Resolves domain location locally using DNS lookup and geoip-lite
 * @param {string} urlOrDomain
 * @returns {Promise<object>} Location details
 */
export async function getDomainLocation(urlOrDomain) {
	const hostname = getHostname(urlOrDomain);
	try {
		const { address } = await lookupPromise(hostname);
		const geo = geoip.lookup(address);
		if (geo) {
			return {
				success: true,
				domain: hostname,
				ip: address,
				country: geo.country,
				region: geo.region,
				city: geo.city,
				ll: geo.ll, // [Latitude, Longitude]
				timezone: geo.timezone,
			};
		}
		return {
			success: true,
			domain: hostname,
			ip: address,
			message: 'No location details found for this IP',
		};
	} catch (err) {
		return {
			success: false,
			error: `Failed to resolve domain: ${err.message}`,
		};
	}
}
