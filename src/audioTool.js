const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);

const ffprobe = require("ffprobe");
const ffprobeStatic = require("ffprobe-static");
const fs = require("fs");
const path = require("path");
const mm = require("music-metadata");

const {
  constructAWCXML,
  construct54XML,
  construct151XML,
} = require("./utils/xmlConstructor");
const {
  constructAWCXMLSimple,
  construct54XMLSimple,
} = require("./utils/xmlConstructorSimple");
const logger = require("./utils/logger");
const fileUtil = require("./utils/fileUtil");
const { generateAwcResources } = require("./utils/awcGenerator");
const { generateRelResources } = require("./utils/relGenerator");

const VALID_GENERATION_TYPES = new Set(["simple", "radio"]);
const DEFAULT_AUDIO_BANK = "custom_sounds";

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function parseCliArgs(argv) {
  return argv.reduce((args, arg) => {
    if (!arg.startsWith("--")) return args;

    const [rawKey, ...valueParts] = arg.slice(2).split("=");
    args[rawKey] = valueParts.length > 0 ? valueParts.join("=") : "true";
    return args;
  }, {});
}

function getConfigValue(cliArgs, key) {
  return cliArgs[key] ?? process.env[`npm_config_${key}`];
}

function parseConfig() {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  const fileList = getConfigValue(cliArgs, "file")
    ?.split(",")
    .map((file) => file.trim())
    .filter(Boolean);
  const folder = getConfigValue(cliArgs, "folder");
  const sampleRate = Number(getConfigValue(cliArgs, "samplerate"));
  const initialTrackId = getConfigValue(cliArgs, "trackid");
  const generationType = getConfigValue(cliArgs, "type");
  const audioBankName =
    getConfigValue(cliArgs, "audiobank") || DEFAULT_AUDIO_BANK;
  const soundSetName =
    getConfigValue(cliArgs, "soundset") || "special_soundset";
  const audioCodec = (getConfigValue(cliArgs, "codec") || "pcm").toUpperCase();

  if (!VALID_GENERATION_TYPES.has(generationType)) {
    throw new Error(
      "Missing or invalid --type. Use --type=simple or --type=radio.",
    );
  }
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error(
      "Missing or invalid --samplerate. Example: --samplerate=32000",
    );
  }
  if (generationType === "radio" && !Number.isFinite(Number(initialTrackId))) {
    throw new Error("Radio generation requires a numeric --trackid.");
  }
  if (fileList?.length && folder) {
    throw new Error("Use either --file or --folder, not both.");
  }
  if (!fileList?.length && !folder) {
    throw new Error(
      "Provide input audio with --file=file.mp3 or --folder=folderName.",
    );
  }
  if (audioBankName.includes("/") || audioBankName.includes("\\")) {
    throw new Error("--audiobank must be a folder name, not a path.");
  }
  if (!new Set(["PCM", "ADPCM"]).has(audioCodec)) {
    throw new Error("Invalid --codec. Use --codec=pcm or --codec=adpcm.");
  }

  return {
    fileList,
    folder,
    sampleRate,
    initialTrackId,
    generationType,
    audioBankName,
    soundSetName,
    audioCodec,
  };
}

function getAvailableInputFolders() {
  return fs
    .readdirSync(".")
    .filter((entry) => fs.statSync(entry).isDirectory())
    .filter((entry) => !["node_modules", "output", ".git"].includes(entry));
}

function getInputFiles({ fileList, folder }) {
  if (fileList?.length) {
    return fileList;
  }

  if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
    const availableFolders = getAvailableInputFolders();
    const suggestion =
      availableFolders.length > 0
        ? ` Available folders: ${availableFolders.join(", ")}.`
        : "";
    throw new Error(`Input folder does not exist: ${folder}.${suggestion}`);
  }

  return fs
    .readdirSync(folder)
    .sort()
    .map((file) => path.join(folder, file))
    .filter((file) => fs.statSync(file).isFile())
    .filter((file) => Boolean(fileUtil.getFileExtension(file)));
}

async function buildTrackData(files, initialTrackId, generationType) {
  let nextTrackId = Number(initialTrackId || 0);
  const trackData = {};
  const generatedNames = new Map();

  for (const file of files) {
    if (!fs.existsSync(file)) {
      throw new Error(`Input file does not exist: ${file}`);
    }

    const extension = fileUtil.getFileExtension(file);
    if (!extension) {
      logger.addToLog(`Skipping unsupported file type: ${file}`);
      continue;
    }

    const track = fileUtil.getBaseFilename(file, `.${extension}`);
    const generatedName = generationType === "simple" ? `${track}_sp` : track;
    if (generatedNames.has(generatedName)) {
      throw new Error(
        `Duplicate generated sound name "${generatedName}" from ${file} and ${generatedNames.get(generatedName)}. Remove or rename one input file; duplicate AWC stream/REL hashes can crash the FiveM client.`,
      );
    }
    generatedNames.set(generatedName, file);

    if (generationType === "simple" && !/^[a-z0-9_]+$/.test(track)) {
      logger.addToLog(
        `Warning: "${track}" contains uppercase letters or non-identifier characters. FiveM native audio resources are safest with lowercase snake_case names matching the script names you play.`,
      );
    }

    const sides = generationType === "radio" ? ["left", "right"] : ["left"];
    const tracks = {};
    sides.forEach((side) => {
      tracks[side] =
        generationType === "simple"
          ? `${track}_sp.wav`
          : `${track}_${side}.wav`;
    });

    trackData[file] = {
      trackid: nextTrackId,
      extension,
      track,
      tracks,
    };

    try {
      const metadata = await mm.parseFile(file);
      logger.addToLog(
        `Track ID: ${nextTrackId || "Not Found"} | Title: ${metadata?.common?.title || "Not Found"} | Artist: ${metadata?.common?.artist || "Not Found"}`,
      );
    } catch (err) {
      logger.addToLog(`Metadata unavailable for ${file}: ${err.message}`);
    }

    nextTrackId++;
  }

  if (Object.keys(trackData).length === 0) {
    throw new Error(
      "No supported input files found. Supported extensions: mp3, wav, ogg.",
    );
  }

  return trackData;
}

function getOutputWavPath(track, channel, generationType, audioBankName) {
  if (generationType === "simple") {
    const outputDir = path.join("output", "audiodirectory", audioBankName);
    ensureDirectory(outputDir);
    return path.join(outputDir, `${track}_sp.wav`);
  }

  const outputDir = path.join("output", "audiodirectory", track);
  ensureDirectory(outputDir);
  return path.join(outputDir, `${track}_${channel}.wav`);
}

function probeWav(filepath) {
  return new Promise((resolve, reject) => {
    ffprobe(filepath, { path: ffprobeStatic.path }, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const stream = metadata?.streams?.[0];
      if (!stream) {
        reject(
          new Error(`No audio stream found in generated WAV: ${filepath}`),
        );
        return;
      }
      resolve(stream);
    });
  });
}

async function constructWav(
  track,
  filename,
  channel,
  sampleRate,
  generationType,
  audioBankName,
  extension,
) {
  const filepath = getOutputWavPath(
    track,
    channel,
    generationType,
    audioBankName,
  );
  const sourceChannel = channel === "left" ? "0.0.0" : "0.0.1";

  await new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(filename)
      .inputFormat(extension)
      .outputOption(`-map_channel ${sourceChannel}`)
      .audioChannels(1)
      .audioCodec("pcm_s16le")
      .outputOption("-map_metadata -1")
      .outputOption("-map 0:a")
      .outputOptions(`-ar ${sampleRate}`)
      .outputOption("-fflags +bitexact")
      .outputOption("-flags:v +bitexact")
      .outputOption("-flags:a +bitexact");

    if (generationType === "simple") {
      command.withAudioFilter("loudnorm=I=-15");
    }

    command
      .format("wav")
      .on("error", (err) => reject(err))
      .on("progress", (progress) => {
        console.log(
          `Processing ${filename}: ${progress.targetSize || 0} KB converted`,
        );
      })
      .on("end", () => resolve())
      .save(filepath);
  });

  console.log("Generated ", filepath);
  return probeWav(filepath);
}

async function generateWavs(trackData, config) {
  for (const [filename, fileData] of Object.entries(trackData)) {
    for (const side of Object.keys(fileData.tracks)) {
      const metadata = await constructWav(
        fileData.track,
        filename,
        side,
        config.sampleRate,
        config.generationType,
        config.audioBankName,
        fileData.extension,
      );

      fileData.duration = Number(metadata.duration).toFixed(3) * 1000;
      fileData.samples = Number(metadata.duration_ts);
      fileData.sample_rate = Number(metadata.sample_rate);
    }

    if (config.generationType === "radio") {
      await constructAWCXML(fileData);
    }
  }
}

async function generateXml(trackData, config) {
  if (config.generationType === "radio") {
    construct54XML(trackData);
    construct151XML(trackData);
    return;
  }

  constructAWCXMLSimple(trackData, config.audioBankName, config.audioCodec);
  construct54XMLSimple(trackData, config.audioBankName, config.soundSetName);
}

function luaQuote(value) {
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function writeGeneratedFxmanifest(
  trackData,
  config,
  generatedAwcs,
  generatedRels,
) {
  const files = [...generatedAwcs, ...generatedRels].map((file) =>
    path.posix.join(
      "stream",
      file.replace(/\\/g, "/").replace(/^output\//, ""),
    ),
  );

  const lines = [
    "fx_version 'cerulean'",
    "game 'gta5'",
    "",
    "-- Generated by native-audio-tool.",
  ];

  if (config.generationType === "simple") {
    lines.push(
      "-- Request the audio bank before playing sounds:",
      `-- while not RequestScriptAudioBank(${luaQuote(`audiodirectory/${config.audioBankName}`)}, false) do Wait(0) end`,
      "--",
      "-- Play simple sounds with:",
      `-- PlaySoundFrontend(GetSoundId(), <scriptName>, ${luaQuote(config.soundSetName)}, true)`,
      "--",
      "-- Release the audio bank when you are done:",
      `-- ReleaseNamedScriptAudioBank(${luaQuote(`audiodirectory/${config.audioBankName}`)})`,
      "--",
      "-- Generated script names:",
    );

    Object.values(trackData).forEach((fileData) => {
      lines.push(`--   ${fileData.track} -> ${fileData.track}_sp`);
    });
  }

  lines.push("", "files {");
  files.forEach((file, index) => {
    const comma = index === files.length - 1 ? "" : ",";
    lines.push(`    ${luaQuote(file)}${comma}`);
  });
  lines.push("}", "");

  if (config.generationType === "simple") {
    lines.push(
      "data_file 'AUDIO_WAVEPACK' 'stream/audiodirectory'",
      `data_file 'AUDIO_SOUNDDATA' 'stream/data/${config.audioBankName}.dat'`,
    );
  } else {
    lines.push(
      "data_file 'AUDIO_WAVEPACK' 'stream/audiodirectory'",
      "data_file 'AUDIO_SOUNDDATA' 'stream/data/dlccustomsongs_sound.dat'",
      "data_file 'AUDIO_GAMEDATA' 'stream/data/dlccustomsongs_game.dat'",
    );
  }

  lines.push("");

  const fxmanifestPath = path.join("output", "fxmanifest.lua");
  fs.writeFileSync(fxmanifestPath, lines.join("\n"));
  return fxmanifestPath;
}

function cleanupIntermediateWavs(config) {
  if (config.generationType !== "simple") return;

  const wavDirectory = path.join(
    "output",
    "audiodirectory",
    config.audioBankName,
  );
  fs.rmSync(wavDirectory, { recursive: true, force: true });
}

async function main() {
  try {
    const config = parseConfig();
    ensureDirectory(path.join("output", "audiodirectory"));
    ensureDirectory(path.join("output", "data"));

    const files = getInputFiles(config);
    const trackData = await buildTrackData(
      files,
      config.initialTrackId,
      config.generationType,
    );

    await generateWavs(trackData, config);
    await generateXml(trackData, config);

    const generatedAwcs = await generateAwcResources(
      trackData,
      config.generationType,
      config.audioBankName,
      { audioCodec: config.audioCodec },
    );
    generatedAwcs.forEach((awcPath) => console.log("Generated ", awcPath));

    const generatedRels = await generateRelResources(
      trackData,
      config.generationType,
      {
        audioBankName: config.audioBankName,
        soundSetName: config.soundSetName,
      },
    );
    generatedRels.forEach((relPath) => console.log("Generated ", relPath));

    const generatedFxmanifest = writeGeneratedFxmanifest(
      trackData,
      config,
      generatedAwcs,
      generatedRels,
    );
    console.log("Generated ", generatedFxmanifest);

    cleanupIntermediateWavs(config);

    await logger.writeLog();
  } catch (err) {
    console.error(err.message || err);
    process.exitCode = 1;
  }
}

main();
