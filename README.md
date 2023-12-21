![image](https://github.com/JoeSzymkowiczFiveM/native-audio-tool/assets/70592880/4c55bd11-6e5e-4f72-9957-5695f4f3fd85)

## Description
This automates the SimpleAudio process outlined in [this repo](https://github.com/ChatDisabled/nativeAudio) from @ChatDisabled, which also includes a sample resource with usage. In addition, the script also prepares the radio station and track data to be used with Chat's [Custom Native Radio Stations](https://forum.cfx.re/t/custom-native-radio-stations/5158461) resource.

## Basics
* Converts MP3s, WAVs, and OGG to properly formatted WAVs for OpenIV conversion
* Prepares the necessary XMLs for OpenIV conversion


## Usage
1. Run `npm install`
2. In the terminal `npm run makeWavs` with the following parameters
     - `--file` - comma separated list of files, with the extension that will be processed. The script only uses MP3s.
     - `--folder` - If you dont want to specify a list of files, you can specify folder in the root of the project, that holds the files that will be processed. The script only uses MP3s.
     - `--samplerate` - The sample rate of the outputted files.
     - `--trackid` - The starting trackid that will be used for the processed tracks, used specifically for radio type.
     - `--soundset` - This is the soundset dict name used for playing sounds, used specifically for simple type.
     - `--audiobank` - This is the audiobank name/folder, used specifically for simple sound type. If not specified, it will default to `custom_sounds`.
     - `--gun` - This is the name of the weapon you're generating the audio data for, used specifically for weapon type. NOTE: `sns` is the only working example right now. I will add more in the future.
     - `--type` - This can be `simple`, `radio`, or `weapon`, each outputting their respective audio data files.


### 👀 Commands
`npm run makeWavs --file=lock.mp3 --samplerate=48000 --trackid=5000 --type=radio`

`npm run makeWavs --file=lock.mp3 --samplerate=48000 --trackid=5000 --type=radio`

`npm run makeWavs --file=lock.mp3,unlock.mp3 --soundset=special_soundset --samplerate=32000 --type=simple`

`npm run makeWavs --samplerate=32000 --soundset=special_soundset --type=simple --folder=test`

`npm run makeWavs --samplerate=32000 --soundset=special_soundset --type=simple --folder=test --audiobank=joe_sounds`


### Dependencies
[nodeJS](https://nodejs.org/en/)

[CodeWalker](https://github.com/dexyfex/CodeWalker) the outputted WAV and XML data is imported into CodeWalker, to create the AWC and REL information

## Discord
[Joe Szymkowicz FiveM Development](https://discord.gg/5vPGxyCB4z)
