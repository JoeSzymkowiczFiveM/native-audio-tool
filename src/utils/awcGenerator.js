const fs = require("fs");
const path = require("path");

const AWC_MAGIC = 0x54414441;
const AWC_VERSION = 1;
const BASE_FLAGS = 0xff00;
const AWC_STREAM_ID_MASK = 0x1fffffff;
const RADIO_BLOCK_SIZE = 524288;
const ADPCM_SMALL_BLOCK_SIZE = 2048;
const ADPCM_SAMPLES_PER_SMALL_BLOCK = 4088;

const CHUNK_TYPES = {
  data: 0x55,
  format: 0xfa,
  peak: 0x36,
  markers: 0xbd,
  streamformat: 0x48,
  seektable: 0xa3,
};

const CODECS = {
  PCM: 0,
  ADPCM: 4,
};

const IMA_INDEX_TABLE = [
  -1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8,
];
const IMA_STEP_TABLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
  50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
  253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
  1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327,
  3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442,
  11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794,
  32767,
];

function uint32(value) {
  return value >>> 0;
}

function clip(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function jenkHash(text) {
  if (!text) return 0;
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = uint32(h + (text.charCodeAt(i) & 0xff));
    h = uint32(h + uint32(h << 10));
    h = uint32(h ^ (h >>> 6));
  }
  h = uint32(h + uint32(h << 3));
  h = uint32(h ^ (h >>> 11));
  h = uint32(h + uint32(h << 15));
  return h;
}

class BinaryWriter {
  constructor() {
    this.chunks = [];
    this.length = 0;
  }

  get position() {
    return this.length;
  }

  writeBuffer(buffer) {
    if (!buffer || buffer.length === 0) return;
    this.chunks.push(buffer);
    this.length += buffer.length;
  }

  writeUInt8(value) {
    const b = Buffer.allocUnsafe(1);
    b.writeUInt8(value & 0xff, 0);
    this.writeBuffer(b);
  }

  writeInt16(value) {
    const b = Buffer.allocUnsafe(2);
    b.writeInt16LE(value, 0);
    this.writeBuffer(b);
  }

  writeUInt16(value) {
    const b = Buffer.allocUnsafe(2);
    b.writeUInt16LE(value & 0xffff, 0);
    this.writeBuffer(b);
  }

  writeInt32(value) {
    const b = Buffer.allocUnsafe(4);
    b.writeInt32LE(value, 0);
    this.writeBuffer(b);
  }

  writeUInt32(value) {
    const b = Buffer.allocUnsafe(4);
    b.writeUInt32LE(uint32(value), 0);
    this.writeBuffer(b);
  }

  writeUInt64(value) {
    const b = Buffer.allocUnsafe(8);
    b.writeBigUInt64LE(BigInt.asUintN(64, value), 0);
    this.writeBuffer(b);
  }

  padToAlignment(alignment) {
    const pad = (alignment - (this.position % alignment)) % alignment;
    if (pad > 0) this.writeBuffer(Buffer.alloc(pad));
  }

  toBuffer() {
    return Buffer.concat(this.chunks, this.length);
  }
}

function readWavFile(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Expected generated WAV does not exist: ${filepath}`);
  }

  const wav = fs.readFileSync(filepath);
  if (
    wav.toString("ascii", 0, 4) !== "RIFF" ||
    wav.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error(`${filepath} is not a RIFF/WAVE file.`);
  }

  let offset = 12;
  let format = null;
  let data = null;

  while (offset + 8 <= wav.length) {
    const id = wav.toString("ascii", offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (id === "fmt ") {
      format = {
        audioFormat: wav.readUInt16LE(dataOffset),
        channels: wav.readUInt16LE(dataOffset + 2),
        sampleRate: wav.readUInt32LE(dataOffset + 4),
        bitsPerSample: wav.readUInt16LE(dataOffset + 14),
      };
    } else if (id === "data") {
      data = Buffer.from(wav.subarray(dataOffset, dataOffset + size));
    }

    offset = dataOffset + size + (size % 2);
  }

  if (!format || !data) {
    throw new Error(`${filepath} is missing fmt or data chunks.`);
  }
  if (format.audioFormat !== 1) {
    throw new Error(
      `${filepath} must be PCM WAV. Found format ${format.audioFormat}.`,
    );
  }
  if (format.channels !== 1) {
    throw new Error(
      `${filepath} must be mono WAV. Found ${format.channels} channels.`,
    );
  }
  if (format.bitsPerSample !== 16) {
    throw new Error(
      `${filepath} must be 16-bit PCM WAV. Found ${format.bitsPerSample}-bit.`,
    );
  }

  const sampleCount = Math.floor(data.length / 2);

  return {
    pcm: data,
    sampleRate: format.sampleRate,
    sampleCount,
  };
}

function encodeAdpcm(pcm) {
  if (pcm.length % 4 !== 0) {
    pcm = pcm.subarray(0, pcm.length - 2);
  }

  const adpcm = Buffer.alloc(pcm.length / 4);
  let predictor = 0;
  let stepIndex = 0;
  let readingOffset = 0;
  let writingOffset = 0;

  function readSample() {
    const sample = pcm.readInt16LE(readingOffset);
    readingOffset += 2;
    return sample;
  }

  function encodeNibble(pcm16) {
    let delta = pcm16 - predictor;
    let value = 0;
    if (delta < 0) {
      value = 8;
      delta = -delta;
    }

    let step = IMA_STEP_TABLE[stepIndex];
    let diff = step >> 3;
    if (delta > step) {
      value |= 4;
      delta -= step;
      diff += step;
    }
    step >>= 1;
    if (delta > step) {
      value |= 2;
      delta -= step;
      diff += step;
    }
    step >>= 1;
    if (delta > step) {
      value |= 1;
      diff += step;
    }

    predictor += value & 8 ? -diff : diff;
    predictor = clip(predictor, -32768, 32767);
    stepIndex = clip(stepIndex + IMA_INDEX_TABLE[value & 7], 0, 88);
    return value & 0x0f;
  }

  while (writingOffset < adpcm.length) {
    const s0 = readSample();
    const s1 = readSample();
    const b0 = encodeNibble(s0);
    const b1 = encodeNibble(s1);
    adpcm[writingOffset++] = b0 | (b1 << 4);
  }

  return adpcm;
}

function makeDataChunk(data) {
  return { type: "data", data, size: data.length };
}

function makePeakChunk(dataSize) {
  const size = Math.max(0, Math.floor(dataSize / 1024) - 3);
  if (size === 0) return null;

  return {
    type: "peak",
    data: Buffer.alloc(Math.max(2, size)),
    get size() {
      return this.data.length;
    },
    write(writer) {
      writer.writeBuffer(this.data);
    },
  };
}

function makeFormatChunk(format) {
  return {
    type: "format",
    size: 24,
    write(writer) {
      writer.writeUInt32(format.samples);
      writer.writeInt32(format.loopPoint ?? -1);
      writer.writeUInt16(format.sampleRate);
      writer.writeInt16(format.headroom ?? -100);
      writer.writeUInt16(format.loopBegin ?? 0);
      writer.writeUInt16(format.loopEnd ?? 0);
      writer.writeUInt16(format.playEnd ?? 0);
      writer.writeUInt8(format.playBegin ?? 0);
      writer.writeUInt8(CODECS[format.codec ?? "ADPCM"]);
      writer.writeUInt32(format.peak ?? 0);
    },
  };
}

function makeStreamFormatChunk(blockSize) {
  return {
    type: "streamformat",
    blockCount: 0,
    blockSize,
    channels: [],
    get size() {
      return 12 + this.channels.length * 16;
    },
    write(writer) {
      writer.writeUInt32(this.blockCount);
      writer.writeUInt32(this.blockSize);
      writer.writeUInt32(this.channels.length);
      for (const channel of this.channels) {
        writer.writeUInt32(channel.id);
        writer.writeUInt32(channel.samples);
        writer.writeInt16(channel.headroom);
        writer.writeUInt16(channel.sampleRate);
        writer.writeUInt8(CODECS[channel.codec]);
        writer.writeUInt8(0);
        writer.writeUInt16(0);
      }
    },
  };
}

function makeSeekTableChunk() {
  return {
    type: "seektable",
    values: [],
    get size() {
      return this.values.length * 4;
    },
    write(writer) {
      for (const value of this.values) writer.writeUInt32(value);
    },
  };
}

function makeMarkersChunk(trackId) {
  return {
    type: "markers",
    markers: [
      { name: "trackid", value: Number(trackId) || 0, sampleOffset: 500 },
    ],
    get size() {
      return this.markers.length * 16;
    },
    write(writer) {
      for (const marker of this.markers) {
        writer.writeUInt32(jenkHash(marker.name));
        writer.writeUInt32(marker.value);
        writer.writeUInt32(marker.sampleOffset);
        writer.writeUInt32(0);
      }
    },
  };
}

function chunkSortOrder(type) {
  switch (type) {
    case "data":
      return 3;
    case "markers":
      return 2;
    case "seektable":
      return 1;
    case "peak":
    case "format":
    case "streamformat":
    default:
      return 0;
  }
}

function chunkAlignment(type) {
  switch (type) {
    case "data":
      return 16;
    case "markers":
      return 4;
    default:
      return 0;
  }
}

function writeChunk(chunk, writer) {
  if (chunk.type === "data") {
    writer.writeBuffer(chunk.data);
  } else {
    chunk.write(writer);
  }
}

function parseTrackDataEntries(trackData) {
  return Object.entries(trackData).map(([filename, data]) => ({
    filename,
    ...data,
  }));
}

function wavPathFor(type, audioBankName, track, wavFileName) {
  if (type === "radio")
    return path.join("output", "audiodirectory", track, wavFileName);
  return path.join("output", "audiodirectory", audioBankName, wavFileName);
}

function makeSingleStream(track, wavPath, codec = "PCM") {
  const wav = readWavFile(wavPath);
  codec = CODECS[codec] === undefined ? "PCM" : codec;

  const audioData = codec === "PCM" ? wav.pcm : encodeAdpcm(wav.pcm);
  const format = makeFormatChunk({
    codec,
    samples: wav.sampleCount,
    sampleRate: wav.sampleRate,
    headroom: -100,
    loopPoint: -1,
  });

  const data = makeDataChunk(audioData);
  const peak = makePeakChunk(data.size);

  return {
    id: jenkHash(track) & AWC_STREAM_ID_MASK,
    chunks: peak ? [peak, data, format] : [data, format],
  };
}

function writeLargeMultiChannelBlock(block, blockSize) {
  const writer = new BinaryWriter();
  for (const channel of block.channels) {
    writer.writeInt32(channel.startBlock);
    writer.writeInt32(channel.blockCount);
    writer.writeInt32(0);
    writer.writeInt32(channel.sampleCount);
    writer.writeInt32(0);
    writer.writeInt32(0);
  }
  for (const channel of block.channels) {
    for (const offset of channel.sampleOffsets) writer.writeInt32(offset);
  }
  writer.padToAlignment(0x800);
  for (const channel of block.channels) writer.writeBuffer(channel.data);
  if (writer.position > blockSize) {
    throw new Error(
      `Generated multichannel block (${writer.position} bytes) exceeds AWC block size (${blockSize} bytes).`,
    );
  }
  writer.writeBuffer(Buffer.alloc(blockSize - writer.position));
  return writer.toBuffer();
}

function makeRadioStreams(fileData, audioBankName) {
  const blockSize = RADIO_BLOCK_SIZE;
  const sourceStreamFormat = makeStreamFormatChunk(blockSize);
  const seekTable = makeSeekTableChunk();
  const source = {
    id: 0,
    chunks: [sourceStreamFormat, makeDataChunk(Buffer.alloc(0)), seekTable],
  };

  const channels = ["left", "right"].map((side) => {
    const wav = readWavFile(
      wavPathFor("radio", audioBankName, fileData.track, fileData.tracks[side]),
    );
    return {
      side,
      id: jenkHash(`${fileData.track}_${side}`) & AWC_STREAM_ID_MASK,
      samples: wav.sampleCount,
      sampleRate: wav.sampleRate,
      headroom: -170,
      codec: "ADPCM",
      data: encodeAdpcm(wav.pcm, wav.sampleCount),
    };
  });

  sourceStreamFormat.channels = channels.map((channel) => ({
    id: channel.id,
    samples: channel.samples,
    headroom: channel.headroom,
    sampleRate: channel.sampleRate,
    codec: channel.codec,
  }));

  const channelCount = channels.length;
  let headerSize = 96 * channelCount + Math.floor(blockSize / 512) + 1024;
  headerSize += (0x800 - (headerSize % 0x800)) % 0x800;
  const smallBlocksPerLargeBlock = Math.floor(
    Math.floor((blockSize - headerSize) / ADPCM_SMALL_BLOCK_SIZE) /
      channelCount,
  );
  if (smallBlocksPerLargeBlock <= 0) {
    throw new Error(`Invalid radio AWC block size ${blockSize}.`);
  }

  const blocks = [];
  const remainingSamples = new Map(
    channels.map((channel) => [channel.side, channel.samples + 1]),
  );

  for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
    const channel = channels[channelIndex];
    const totalSmallBlocks = Math.ceil(
      channel.data.length / ADPCM_SMALL_BLOCK_SIZE,
    );
    const totalLargeBlocks = Math.ceil(
      totalSmallBlocks / smallBlocksPerLargeBlock,
    );

    while (blocks.length < totalLargeBlocks) {
      const blockIndex = blocks.length;
      blocks.push({
        sampleOffset:
          blockIndex * smallBlocksPerLargeBlock * ADPCM_SAMPLES_PER_SMALL_BLOCK,
        channels: new Array(channelCount),
      });
      seekTable.values.push(
        blockIndex * smallBlocksPerLargeBlock * ADPCM_SAMPLES_PER_SMALL_BLOCK,
      );
    }

    let sampleOffsets = [];
    for (
      let smallBlockIndex = 0;
      smallBlockIndex < totalSmallBlocks;
      smallBlockIndex++
    ) {
      sampleOffsets.push(smallBlockIndex * ADPCM_SAMPLES_PER_SMALL_BLOCK);
      const isEndOfLargeBlock =
        sampleOffsets.length === smallBlocksPerLargeBlock;
      const isLastSmallBlock = smallBlockIndex === totalSmallBlocks - 1;
      if (!isEndOfLargeBlock && !isLastSmallBlock) continue;

      const largeBlockIndex = Math.floor(
        smallBlockIndex / smallBlocksPerLargeBlock,
      );
      const firstSmallBlock = largeBlockIndex * smallBlocksPerLargeBlock;
      const blockCount = sampleOffsets.length;
      const byteCount = blockCount * ADPCM_SMALL_BLOCK_SIZE;
      const sourceOffset = firstSmallBlock * ADPCM_SMALL_BLOCK_SIZE;
      const paddedData = Buffer.alloc(byteCount);
      channel.data.copy(
        paddedData,
        0,
        sourceOffset,
        Math.min(channel.data.length, sourceOffset + byteCount),
      );

      const samplesInBlock = blockCount * ADPCM_SAMPLES_PER_SMALL_BLOCK;
      const sampleCount = Math.min(
        samplesInBlock,
        remainingSamples.get(channel.side),
      );
      remainingSamples.set(
        channel.side,
        remainingSamples.get(channel.side) - samplesInBlock,
      );

      blocks[largeBlockIndex].channels[channelIndex] = {
        startBlock: channelIndex * smallBlocksPerLargeBlock,
        blockCount,
        sampleCount,
        sampleOffsets,
        data: paddedData,
      };
      sampleOffsets = [];
    }
  }

  for (const block of blocks) {
    for (let i = 0; i < channelCount; i++) {
      if (!block.channels[i]) {
        block.channels[i] = {
          startBlock: i * smallBlocksPerLargeBlock,
          blockCount: 0,
          sampleCount: 0,
          sampleOffsets: [],
          data: Buffer.alloc(0),
        };
      }
    }
  }

  sourceStreamFormat.blockCount = blocks.length;
  source.chunks[1] = makeDataChunk(
    Buffer.concat(
      blocks.map((block) => writeLargeMultiChannelBlock(block, blockSize)),
    ),
  );

  const channelStreams = channels.map((channel) => {
    const streamFormat = makeStreamFormatChunk(blockSize);
    streamFormat.blockCount = blocks.length;
    streamFormat.channels = sourceStreamFormat.channels;
    return {
      id: channel.id,
      chunks: [
        streamFormat,
        ...(channel.side === "left"
          ? [makeMarkersChunk(fileData.trackid)]
          : []),
      ],
    };
  });

  return [source, ...channelStreams];
}

function buildAwc(streams, options = {}) {
  const flags =
    BASE_FLAGS |
    (options.chunkIndices ? 1 : 0) |
    (options.multiChannel ? 4 : 0);
  streams.sort((a, b) => a.id - b.id);

  const streamCount = streams.length;
  let dataOffset =
    16 + (options.chunkIndices ? streamCount * 2 : 0) + streamCount * 4;
  for (const stream of streams) dataOffset += stream.chunks.length * 8;

  const sortedChunks = streams.flatMap((stream) => stream.chunks);
  sortedChunks.sort((a, b) => chunkSortOrder(a.type) - chunkSortOrder(b.type));

  for (const chunk of sortedChunks) {
    const align = chunkAlignment(chunk.type);
    if (align > 0) dataOffset += (align - (dataOffset % align)) % align;
    chunk.offset = dataOffset;
    dataOffset += chunk.size;
  }

  const writer = new BinaryWriter();
  writer.writeUInt32(AWC_MAGIC);
  writer.writeUInt16(AWC_VERSION);
  writer.writeUInt16(flags);
  writer.writeInt32(streamCount);
  writer.writeInt32(
    16 +
      (options.chunkIndices ? streamCount * 2 : 0) +
      streamCount * 4 +
      streams.reduce((sum, s) => sum + s.chunks.length * 8, 0),
  );

  if (options.chunkIndices) {
    let chunkIndex = 0;
    for (const stream of streams) {
      writer.writeUInt16(chunkIndex);
      chunkIndex += stream.chunks.length;
    }
  }

  for (const stream of streams) {
    const raw = (stream.id & AWC_STREAM_ID_MASK) | (stream.chunks.length << 29);
    writer.writeUInt32(raw);
  }

  for (const stream of streams) {
    for (const chunk of stream.chunks) {
      const raw =
        BigInt(chunk.offset & 0x0fffffff) |
        (BigInt(chunk.size & 0x0fffffff) << 28n) |
        (BigInt(CHUNK_TYPES[chunk.type]) << 56n);
      writer.writeUInt64(raw);
    }
  }

  for (const chunk of sortedChunks) {
    const align = chunkAlignment(chunk.type);
    if (align > 0) writer.padToAlignment(align);
    writeChunk(chunk, writer);
  }

  return writer.toBuffer();
}

async function generateAwcResources(
  trackData,
  generationType,
  audioBankName = "custom_sounds",
  options = {},
) {
  const entries = parseTrackDataEntries(trackData);
  if (!fs.existsSync("./output/audiodirectory")) {
    fs.mkdirSync("./output/audiodirectory", { recursive: true });
  }

  const generated = [];
  if (generationType === "simple") {
    const streams = entries.map((entry) => {
      const streamName = path.parse(entry.tracks.left).name;
      return makeSingleStream(
        streamName,
        wavPathFor("simple", audioBankName, entry.track, entry.tracks.left),
        options.audioCodec ?? "PCM",
      );
    });
    const awc = buildAwc(streams, { chunkIndices: true, multiChannel: false });
    const outputPath = path.join(
      "output",
      "audiodirectory",
      `${audioBankName}.awc`,
    );
    fs.writeFileSync(outputPath, awc);
    generated.push(outputPath);
  } else if (generationType === "radio") {
    for (const entry of entries) {
      const streams = makeRadioStreams(entry, audioBankName);
      const awc = buildAwc(streams, { chunkIndices: true, multiChannel: true });
      const outputPath = path.join(
        "output",
        "audiodirectory",
        `${entry.track}.awc`,
      );
      fs.writeFileSync(outputPath, awc);
      generated.push(outputPath);
    }
  }

  return generated;
}

module.exports = {
  generateAwcResources,
};
