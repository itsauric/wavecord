# wavecord

A modern Discord radio client for discord.js v14. Search and stream from 500,000+ live radio stations powered by [Radio Browser](https://www.radio-browser.info/).

## Features

- **500k+ stations** - search by name, country, language, genre, codec, and bitrate
- **TypeScript-first** - full type exports, no `any`
- **Multi-guild** - independent state per server
- **Auto-reconnect** - handles stream interruptions gracefully
- **Volume control** - per-guild volume, configurable default
- **Standalone** - uses `@discordjs/voice` directly, no extra frameworks required

## Requirements

- Node.js 18+
- discord.js v14+
- `@discordjs/voice` v0.17+
- FFmpeg installed and on your PATH

## Installation

```bash
npm install wavecord
```

You will also need the following peer dependencies if you don't have them:

```bash
npm install @discordjs/voice discord.js
```

And one of the following Opus encoders:

```bash
npm install @discordjs/opus
# or
npm install opusscript
```

## Usage

```ts
import { RadioClient } from 'wavecord'

const radio = new RadioClient()

// Search for stations
const stations = await radio.search('lofi')
console.log(stations[0]) // { id, name, url, codec, bitrate, country, ... }

// Play the top result for 'jazz' in a voice channel
const station = await radio.play(voiceChannel, 'jazz')
console.log(`Now playing: ${station.name}`)

// Or pass a Station object directly
const [first] = await radio.search('BBC Radio 1')
await radio.play(voiceChannel, first)

// Volume (0–1)
radio.setVolume(guild.id, 0.5)

// Stop and disconnect
radio.stop(guild.id)       // stop stream, stay in channel
radio.disconnect(guild.id) // stop stream and leave
```

## Advanced Search

```ts
const stations = await radio.search({
  name: 'BBC',
  countryCode: 'GB',
  codec: 'MP3',
  bitrateMin: 128,
  limit: 10
})
```

All fields in `SearchOptions` are optional:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Station name |
| `country` | `string` | Country name |
| `countryCode` | `string` | ISO 3166-1 alpha-2 code (e.g. `GB`, `US`) |
| `language` | `string` | Language name |
| `tag` | `string` | Single genre/tag |
| `tags` | `string[]` | Multiple tags |
| `codec` | `string` | Audio codec (e.g. `MP3`, `AAC`) |
| `bitrateMin` | `number` | Minimum bitrate in kbps |
| `bitrateMax` | `number` | Maximum bitrate in kbps |
| `limit` | `number` | Max results (default: 5) |

## API

### `new RadioClient(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultVolume` | `number` | `1` | Default volume for all streams (0–1) |

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `search(query, limit?)` | `Promise<Station[]>` | Search for stations |
| `play(channel, query)` | `Promise<Station>` | Join channel and start streaming |
| `stop(guildId)` | `void` | Stop stream, stay in channel |
| `disconnect(guildId)` | `void` | Stop stream and leave channel |
| `disconnectAll()` | `void` | Leave all channels |
| `setVolume(guildId, volume)` | `void` | Set volume 0–1 |
| `getVolume(guildId)` | `number` | Get current volume |
| `currentStation(guildId)` | `Station \| null` | Currently playing station |
| `isPlaying(guildId)` | `boolean` | Whether a station is active |
| `hasConnection(guildId)` | `boolean` | Whether a voice connection exists |

### Events

```ts
radio.on('stationStart', (station, guildId) => {
  console.log(`[${guildId}] Now playing: ${station.name}`)
})

radio.on('stationEnd', (station, guildId) => {
  console.log(`[${guildId}] Stopped: ${station.name}`)
})

radio.on('error', (error, guildId) => {
  console.error(`[${guildId}] Error:`, error)
})
```

## Example: `/radio` slash command

```ts
import { RadioClient } from 'wavecord'
import { Client, GatewayIntentBits } from 'discord.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] })
const radio = new RadioClient()

radio.on('stationStart', (station, guildId) => {
  console.log(`[${guildId}] Now playing: ${station.name} (${station.codec} ${station.bitrate}kbps)`)
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  if (interaction.commandName !== 'radio') return

  const query = interaction.options.getString('query', true)
  const member = interaction.guild?.members.cache.get(interaction.user.id)
  const voiceChannel = member?.voice.channel

  if (!voiceChannel) {
    return interaction.reply({ content: 'You need to be in a voice channel.', ephemeral: true })
  }

  await interaction.deferReply()

  const stations = await radio.search(query, 5)
  if (!stations.length) {
    return interaction.editReply('No stations found.')
  }

  const station = await radio.play(voiceChannel, stations[0])
  return interaction.editReply(`Now playing: **${station.name}** - ${station.country} (${station.codec} ${station.bitrate}kbps)`)
})
```

## License

MIT
