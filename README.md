![native-audio-tool banner](https://github.com/JoeSzymkowiczFiveM/native-audio-tool/assets/70592880/4c55bd11-6e5e-4f72-9957-5695f4f3fd85)

## Description

`native-audio-tool` converts audio files into GTA/FiveM native audio resources. It creates the intermediate WAV files, generates AWC audio containers directly in Node.js, and writes the REL XML metadata used by SimpleAudio and custom native radio resources.

## Features

- Converts `mp3`, `wav`, and `ogg` inputs to mono 16-bit WAV files.
- Generates `.awc` audio containers directly; no CodeWalker build step is required for AWCs.
- Generates REL XML data for `simple` and `radio` audio types.
- Supports either an explicit comma-separated file list or an input folder.

## Usage

1. Install dependencies:

   ```sh
   bun install
   ```

2. Run one of the generators:

   ```sh
   bun run makeSounds -- --folder=input --samplerate=32000
   ```

   ```sh
   bun run makeRadio -- --folder=input --samplerate=48000 --trackid=5000
   ```

### `makeSounds` options

Use `makeSounds` for SimpleAudio/native frontend sounds.

- `--samplerate` - Required. Output WAV sample rate, for example `32000` or `48000`.
- `--file` - Comma-separated list of input audio files. Supported extensions: `mp3`, `wav`, `ogg`.
- `--folder` - Folder containing input audio files. Use either `--file` or `--folder`, not both.
- `--soundset` - Optional. Sound set name used in the generated REL XML. Defaults to `special_soundset`.
- `--audiobank` - Optional. Audio bank/folder name. Defaults to `custom_sounds`.
- `--codec` - Optional. Use `pcm` for best quality or `adpcm` for smaller files. Defaults to `pcm`.

### `makeRadio` options

Use `makeRadio` for custom native radio resources.

- `--samplerate` - Required. Output WAV sample rate, for example `48000`.
- `--trackid` - Required. Starting track ID for generated radio track metadata.
- `--file` - Comma-separated list of input audio files. Supported extensions: `mp3`, `wav`, `ogg`.
- `--folder` - Folder containing input audio files. Use either `--file` or `--folder`, not both.

### Examples

Generate a simple audio bank from two files:

```sh
bun run makeSounds -- --file=lock.mp3,unlock.ogg --samplerate=32000 --soundset=special_soundset
```

Generate a simple audio bank from a folder with a custom audio bank name:

```sh
bun run makeSounds -- --folder=input --samplerate=32000 --soundset=special_soundset --audiobank=joe_sounds --codec=pcm
```

Generate radio resources:

```sh
bun run makeRadio -- --file=track01.mp3,track02.mp3 --samplerate=48000 --trackid=5000
```

## Output

Generated files are written under `output/`:

- `output/audiodirectory/<audiobank>.awc` for `simple` audio.
- `output/audiodirectory/<audiobank>/*.wav` for generated `simple` WAV files.
- `output/audiodirectory/<track>.awc` for each `radio` track.
- `output/audiodirectory/<track>/*.wav` for generated `radio` WAV files.
- `output/data/*.dat54.rel` binary sound metadata for `simple` and `radio` audio.
- `output/data/*.dat151.rel` binary game/radio metadata for `radio` audio.
- `output/data/*.rel.xml` debug/import REL XML metadata.
- `output/audiodirectory/*.awc.xml` debug/import AWC XML files.
- `output/fxmanifest.lua` ready-to-copy FiveM manifest with generated file paths and simple sound script names.

## Importing into a FiveM resource

After generation, copy the generated `output/audiodirectory/` and `output/data/` folders into your FiveM resource's `stream/` folder. You can also copy `output/fxmanifest.lua` to the root of a new resource. Do not include the generated `.xml` files unless you want to keep them for debugging.

### Simple audio resource layout

Example for `bun run makeSounds -- --audiobank=joe_sounds`:

```txt
my_audio_resource/
├─ fxmanifest.lua
└─ stream/
   ├─ audiodirectory/
   │  └─ joe_sounds.awc
   └─ data/
      └─ joe_sounds.dat54.rel
```

Example `fxmanifest.lua`:

```lua
fx_version 'cerulean'
game 'gta5'

files {
    'stream/audiodirectory/joe_sounds.awc',
    'stream/data/joe_sounds.dat54.rel'
}

data_file 'AUDIO_WAVEPACK' 'stream/audiodirectory'
data_file 'AUDIO_SOUNDDATA' 'stream/data/joe_sounds.dat'
```

Notes:

- `AUDIO_WAVEPACK` points to the folder that contains the generated `.awc` files, preserving the `audiodirectory/` folder.
- `AUDIO_SOUNDDATA` points to the `.dat54.rel` path without the `54.rel` suffix, preserving the `data/` folder, so `stream/data/joe_sounds.dat54.rel` becomes `stream/data/joe_sounds.dat`.
- The sound set name defaults to `special_soundset`, or whatever you passed with `--soundset`.

### Radio resource layout

For `makeRadio`, copy the generated `output/audiodirectory/` and `output/data/` folders into `stream/`:

```txt
my_radio_resource/
├─ fxmanifest.lua
└─ stream/
   ├─ audiodirectory/
   │  ├─ track01.awc
   │  └─ track02.awc
   └─ data/
      ├─ dlccustomsongs_sound.dat54.rel
      └─ dlccustomsongs_game.dat151.rel
```

Example `fxmanifest.lua`:

```lua
fx_version 'cerulean'
game 'gta5'

files {
    'stream/audiodirectory/track01.awc',
    'stream/audiodirectory/track02.awc',
    'stream/data/dlccustomsongs_sound.dat54.rel',
    'stream/data/dlccustomsongs_game.dat151.rel'
}

data_file 'AUDIO_WAVEPACK' 'stream/audiodirectory'
data_file 'AUDIO_SOUNDDATA' 'stream/data/dlccustomsongs_sound.dat'
data_file 'AUDIO_GAMEDATA' 'stream/data/dlccustomsongs_game.dat'
```

Use one `AUDIO_WAVEPACK` line for the `stream/audiodirectory/` folder containing the generated `.awc` files.

## Dependencies

- [bun](https://bun.com/)

- [CodeWalker](https://github.com/dexyfex/CodeWalker) is optional and useful for inspecting generated AWC files or working with REL XML, but it is not required to generate AWCs.
