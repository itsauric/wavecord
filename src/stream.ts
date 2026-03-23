import { createAudioResource, StreamType } from '@discordjs/voice'
import prism from 'prism-media'
import type { Station } from './types.js'

/**
 * Creates a live audio resource from a radio station stream.
 * Uses FFmpeg to transcode the stream to raw PCM at 48kHz stereo,
 * which @discordjs/voice then encodes to Opus for Discord.
 *
 * The -reconnect flags keep the stream alive through brief interruptions,
 * which are common with internet radio.
 */
export function createStationResource(station: Station, volume = 1) {
	const transcoder = new prism.FFmpeg({
		args: [
			'-reconnect', '1',
			'-reconnect_streamed', '1',
			'-reconnect_delay_max', '5',
			'-i', station.url,
			'-analyzeduration', '0',
			'-loglevel', '0',
			'-f', 's16le',
			'-ar', '48000',
			'-ac', '2'
		]
	})

	const resource = createAudioResource<Station>(transcoder, {
		inputType: StreamType.Raw,
		metadata: station,
		inlineVolume: true
	})

	if (resource.volume) {
		resource.volume.setVolume(volume)
	}

	return resource
}
