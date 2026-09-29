import { deflateSync, inflateSync } from 'node:zlib';

export type Image = { width: number; height: number; pixels: Float32Array };

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value = (crcTable[(value ^ byte) & 0xff] ?? 0) ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

export function createImage(width: number, height: number): Image {
  return { width, height, pixels: new Float32Array(width * height * 4) };
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) {
    return left;
  }
  return toUp <= toUpLeft ? up : upLeft;
}

const channelsByColorType: Readonly<Record<number, number>> = { 2: 3, 6: 4 };

function predictor(filter: number, left: number, up: number, upLeft: number): number {
  switch (filter) {
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return (left + up) >> 1;
    case 4:
      return paeth(left, up, upLeft);
    default:
      return 0;
  }
}

export function decodePng(file: Buffer): Image {
  if (!file.subarray(0, 8).equals(signature)) {
    throw new Error('not a PNG file');
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const data: Buffer[] = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('ascii', offset + 4, offset + 8);
    const body = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      channels = channelsByColorType[body[9] ?? -1] ?? 0;
      if (body[8] !== 8 || channels === 0 || body[12] !== 0) {
        throw new Error('only 8-bit, non-interlaced RGB or RGBA PNG files are read');
      }
    } else if (type === 'IDAT') {
      data.push(body);
    }
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const rows = new Uint8Array(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)] ?? 0;
    const source = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? (rows[y * stride + x - channels] ?? 0) : 0;
      const up = y > 0 ? (rows[(y - 1) * stride + x] ?? 0) : 0;
      const upLeft = y > 0 && x >= channels ? (rows[(y - 1) * stride + x - channels] ?? 0) : 0;
      rows[y * stride + x] = ((raw[source + x] ?? 0) + predictor(filter, left, up, upLeft)) & 0xff;
    }
  }
  const image = createImage(width, height);
  for (let index = 0; index < width * height; index += 1) {
    const alpha = channels === 4 ? (rows[index * 4 + 3] ?? 0) / 255 : 1;
    for (let channel = 0; channel < 3; channel += 1) {
      image.pixels[index * 4 + channel] = ((rows[index * channels + channel] ?? 0) / 255) * alpha;
    }
    image.pixels[index * 4 + 3] = alpha;
  }
  return image;
}

function byte(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

export function encodePng(image: Image): Buffer {
  const stride = image.width * 4 + 1;
  const raw = Buffer.alloc(stride * image.height);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const index = (y * image.width + x) * 4;
      const alpha = image.pixels[index + 3] ?? 0;
      const target = y * stride + 1 + x * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        raw[target + channel] = alpha > 0 ? byte((image.pixels[index + channel] ?? 0) / alpha) : 0;
      }
      raw[target + 3] = byte(alpha);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array()),
  ]);
}
