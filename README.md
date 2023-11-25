# native-audio-tool
1. Run `npm install`
2. In the terminal `npm run makeWavs` with the following parameters
     - `--file` - comma separated list of files, with the extension that will be processed. The script only uses MP3s.
     - `--folder` - If you dont want to specify a list of files, you can specify folder in the root of the project, that holds the files that will be processed. The script only uses MP3s.
     - `--samplerate` - The sample rate of the outputted files
     - `--trackid` - The starting trackid that will be used for the processed tracks, used specifically for radio type
     - `--soundset` - This is the soundset dict name used for playing sounds, used specifically for simple type
     - `--type` - This can be `simple` or `radio`, each outputting their respective audio data files.


### 👀 Usage
`npm run makeWavs --file=lock.mp3 --samplerate=48000 --trackid=5000 --type=radio`

`npm run makeWavs --file=lock.mp3 --samplerate=48000 --trackid=5000 --type=radio`

`npm run makeWavs --file=lock.mp3,unlock.mp3 --soundset=special_soundset --samplerate=32000 --type=simple`

`npm run makeWavs --samplerate=32000 --soundset=special_soundset --type=simple --folder=test`

## OGG Conversion Script

I included a small script to convert OGG files to MP3, to by used as input for the audio tool. Please create an `convert` folder and place the .ogg files you want converted inside. Then in the terminal, run the following script. Converted files will be placed in the `convert` folder.


### 👀 Usage
`npm run convert`


## Discord
[Joe Szymkowicz FiveM Development](https://discord.gg/5vPGxyCB4z)
