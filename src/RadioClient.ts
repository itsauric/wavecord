import { EventEmitter } from 'node:events'
import {
	AudioPlayerStatus,
	VoiceConnectionStatus,
	createAudioPlayer,
	entersState,
	joinVoiceChannel
} from '@discordjs/voice'
import type { AudioPlayer, AudioResource, VoiceConnection } from '@discordjs/voice'
import type { VoiceBasedChannel } from 'discord.js'
import { searchStations } from './search.js'
import { createStationResource } from './stream.js'
import type { RadioClientOptions, RadioEvents, SearchOptions, Station } from './types.js'

interface GuildState {
	connection: VoiceConnection
	player: AudioPlayer
	resource: AudioResource<Station> | null
	station: Station | null
	volume: number
}

export class RadioClient extends EventEmitter {
	private readonly guilds = new Map<string, GuildState>()
	private readonly defaultVolume: number

	public constructor(options: RadioClientOptions = {}) {
		super()
		this.defaultVolume = options.defaultVolume ?? 1
	}

	/**
	 * Search for radio stations from Radio Browser.
	 * @param query - Station name string or a SearchOptions object for advanced filtering
	 * @param limit - Max number of results (default: 5)
	 */
	public search(query: string | SearchOptions, limit = 5): Promise<Station[]> {
		return searchStations(query, limit)
	}

	/**
	 * Join a voice channel and start streaming a radio station.
	 * @param channel - The voice channel to join
	 * @param query - Station name to search for, or an existing Station object
	 * @returns The Station that is now playing
	 */
	public async play(channel: VoiceBasedChannel, query: string | Station): Promise<Station> {
		let station: Station | undefined

		if (typeof query === 'string') {
			const results = await searchStations(query, 1)
			station = results[0]
		} else {
			station = query
		}

		if (!station) {
			throw new Error(`No station found for query: ${String(query)}`)
		}

		const guildId = channel.guild.id
		let state = this.guilds.get(guildId)

		if (!state) {
			const connection = joinVoiceChannel({
				channelId: channel.id,
				guildId,
				adapterCreator: channel.guild.voiceAdapterCreator
			})

			await entersState(connection, VoiceConnectionStatus.Ready, 30_000).catch((error: unknown) => {
				connection.destroy()
				throw error
			})

			const player = createAudioPlayer()
			connection.subscribe(player)

			state = { connection, player, resource: null, station: null, volume: this.defaultVolume }
			this.guilds.set(guildId, state)

			connection.on(VoiceConnectionStatus.Disconnected, async () => {
				try {
					// Try to reconnect if briefly disconnected
					await Promise.race([
						entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
						entersState(connection, VoiceConnectionStatus.Connecting, 5_000)
					])
				} catch {
					const currentStation = this.guilds.get(guildId)?.station
					connection.destroy()
					this.guilds.delete(guildId)
					if (currentStation) this.emit('stationEnd', currentStation, guildId)
				}
			})

			connection.on(VoiceConnectionStatus.Destroyed, () => {
				const currentStation = this.guilds.get(guildId)?.station
				state?.player.stop()
				this.guilds.delete(guildId)
				if (currentStation) this.emit('stationEnd', currentStation, guildId)
			})

			player.on('error', (error) => {
				this.emit('error', error, guildId)
			})
		}

		const previousStation = state.station
		const resource = createStationResource(station, state.volume)

		state.player.play(resource)
		state.resource = resource
		state.station = station

		state.player.once(AudioPlayerStatus.Playing, () => {
			this.emit('stationStart', station!, guildId)
		})

		if (previousStation && previousStation.id !== station.id) {
			this.emit('stationEnd', previousStation, guildId)
		}

		return station
	}

	/**
	 * Stop the current station without leaving the voice channel.
	 */
	public stop(guildId: string): void {
		const state = this.guilds.get(guildId)
		if (!state) return

		const station = state.station
		state.player.stop()
		state.resource = null
		state.station = null

		if (station) this.emit('stationEnd', station, guildId)
	}

	/**
	 * Stop playback and leave the voice channel.
	 */
	public disconnect(guildId: string): void {
		const state = this.guilds.get(guildId)
		if (!state) return

		this.stop(guildId)
		state.connection.destroy()
		this.guilds.delete(guildId)
	}

	/**
	 * Set the playback volume for a guild.
	 * @param guildId - The guild ID
	 * @param volume - Volume level, 0–1 (e.g. 0.5 = 50%)
	 */
	public setVolume(guildId: string, volume: number): void {
		const clamped = Math.max(0, Math.min(1, volume))
		const state = this.guilds.get(guildId)
		if (!state) return

		state.volume = clamped
		state.resource?.volume?.setVolume(clamped)
	}

	/**
	 * Get the current volume for a guild (0–1).
	 */
	public getVolume(guildId: string): number {
		return this.guilds.get(guildId)?.volume ?? this.defaultVolume
	}

	/**
	 * Get the currently playing station for a guild, or null if not playing.
	 */
	public currentStation(guildId: string): Station | null {
		return this.guilds.get(guildId)?.station ?? null
	}

	/**
	 * Returns whether a station is currently playing in the given guild.
	 */
	public isPlaying(guildId: string): boolean {
		return this.guilds.get(guildId)?.station !== null
	}

	/**
	 * Disconnect from all guilds.
	 */
	public disconnectAll(): void {
		for (const guildId of this.guilds.keys()) {
			this.disconnect(guildId)
		}
	}

	// Typed event overloads
	public override on<K extends keyof RadioEvents>(event: K, listener: (...args: RadioEvents[K]) => void): this
	public override on(event: string, listener: (...args: unknown[]) => void): this
	public override on(event: string, listener: (...args: unknown[]) => void): this {
		return super.on(event, listener)
	}

	public override once<K extends keyof RadioEvents>(event: K, listener: (...args: RadioEvents[K]) => void): this
	public override once(event: string, listener: (...args: unknown[]) => void): this
	public override once(event: string, listener: (...args: unknown[]) => void): this {
		return super.once(event, listener)
	}

	public override emit<K extends keyof RadioEvents>(event: K, ...args: RadioEvents[K]): boolean
	public override emit(event: string, ...args: unknown[]): boolean
	public override emit(event: string, ...args: unknown[]): boolean {
		return super.emit(event, ...args)
	}
}
