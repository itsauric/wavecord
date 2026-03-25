export interface Station {
	/** Unique station UUID from Radio Browser */
	id: string
	/** Station display name */
	name: string
	/** Resolved stream URL (use this for playback) */
	url: string
	/** Original URL as submitted to Radio Browser */
	rawUrl: string
	/** Audio codec (e.g. MP3, AAC, OGG) */
	codec: string
	/** Stream bitrate in kbps */
	bitrate: number
	/** Country name */
	country: string
	/** ISO 3166-1 alpha-2 country code */
	countryCode: string
	/** Primary language */
	language: string
	/** Station tags/genres */
	tags: string[]
	/** Station favicon URL */
	favicon: string | undefined
	/** Community vote count */
	votes: number
}

export interface SearchOptions {
	/** Search by station name */
	name?: string
	/** Filter by country name */
	country?: string
	/** Filter by ISO 3166-1 alpha-2 country code */
	countryCode?: string
	/** Filter by language */
	language?: string
	/** Filter by a single tag/genre */
	tag?: string
	/** Filter by multiple tags */
	tags?: string[]
	/** Filter by codec (e.g. MP3, AAC) */
	codec?: string
	/** Minimum bitrate in kbps */
	bitrateMin?: number
	/** Maximum bitrate in kbps */
	bitrateMax?: number
	/** Maximum number of results to return (default: 5) */
	limit?: number
}

export interface RadioClientOptions {
	/** Default volume for all new streams, 0–1 (default: 1) */
	defaultVolume?: number
}

export interface RadioEvents {
	/** Fires when a station starts playing in a guild */
	stationStart: [station: Station, guildId: string]
	/** Fires when a station stops in a guild */
	stationEnd: [station: Station, guildId: string]
	/** Fires on any playback or connection error */
	error: [error: Error, guildId: string]
}
