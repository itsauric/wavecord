import { RadioBrowserApi } from 'radio-browser-api'
import type { Station as RBStation } from 'radio-browser-api'
import type { Station, SearchOptions } from './types.js'

let api: RadioBrowserApi | null = null

function getApi(): RadioBrowserApi {
	if (!api) {
		api = new RadioBrowserApi('wavecord', true)
	}
	return api
}

function normalize(raw: RBStation): Station {
	return {
		id: raw.id,
		name: raw.name,
		url: raw.urlResolved || raw.url,
		rawUrl: raw.url,
		codec: raw.codec,
		bitrate: raw.bitrate,
		country: raw.country,
		countryCode: raw.countryCode,
		language: Array.isArray(raw.language) ? raw.language[0] ?? '' : raw.language,
		tags: Array.isArray(raw.tags) ? raw.tags : [],
		favicon: raw.favicon || undefined,
		votes: raw.votes
	}
}

export async function searchStations(query: string | SearchOptions, defaultLimit = 5): Promise<Station[]> {
	const client = getApi()

	const params =
		typeof query === 'string'
			? { name: query, limit: defaultLimit }
			: {
					name: query.name,
					country: query.country,
					countryCode: query.countryCode,
					language: query.language,
					tag: query.tag,
					tagList: query.tags,
					codec: query.codec,
					bitrateMin: query.bitrateMin !== undefined ? String(query.bitrateMin) : undefined,
					bitrateMax: query.bitrateMax !== undefined ? String(query.bitrateMax) : undefined,
					limit: query.limit ?? defaultLimit
				}

	const results = await client.searchStations(params, undefined, true)
	return results.filter((s) => s.urlResolved || s.url).map(normalize)
}
