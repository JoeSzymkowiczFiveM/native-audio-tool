# native-audio-tool
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


### 👀 Usage
`npm run makeWavs --file=lock.mp3 --samplerate=48000 --trackid=5000 --type=radio`

`npm run makeWavs --file=lock.mp3 --samplerate=48000 --trackid=5000 --type=radio`

`npm run makeWavs --file=lock.mp3,unlock.mp3 --soundset=special_soundset --samplerate=32000 --type=simple`

`npm run makeWavs --samplerate=32000 --soundset=special_soundset --type=simple --folder=test`

`npm run makeWavs --samplerate=32000 --soundset=special_soundset --type=simple --folder=test --audiobank=joe_sounds`

## .ogg Conversion Script

I included a small script to convert OGG files to MP3, to be used as input for the audio tool. Please create a `convert` folder and place the .ogg files you want converted inside. Then in the terminal, run the following script. Converted files will be placed in the `convert` folder.


### 👀 Usage
`npm run convert`


## Discord
[Joe Szymkowicz FiveM Development](https://discord.gg/5vPGxyCB4z)
