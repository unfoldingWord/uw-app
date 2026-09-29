const startOfImage = [0xff, 0xd8];
const jfifHeader = [
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
];
const quantizationMarker = [0xff, 0xdb, 0x00, 0x43, 0x00];
const eightByEightGrey = [0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x08, 0x00, 0x08, 0x01, 0x01, 0x11, 0x00];
const singleCodeTable = (tableClass: number) => [
  0xff,
  0xc4,
  0x00,
  0x14,
  tableClass,
  0x01,
  ...new Array<number>(15).fill(0),
  0x00,
];
const startOfScan = [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00];
const flatBlock = [0x3f];
const endOfImage = [0xff, 0xd9];
const quantizationSteps = 64;

export function greyJpeg(variant: number): Uint8Array {
  const table = new Array<number>(quantizationSteps).fill(1);
  table[0] = 1 + (variant % 250);
  return Uint8Array.from([
    ...startOfImage,
    ...jfifHeader,
    ...quantizationMarker,
    ...table,
    ...eightByEightGrey,
    ...singleCodeTable(0x00),
    ...singleCodeTable(0x10),
    ...startOfScan,
    ...flatBlock,
    ...endOfImage,
  ]);
}

const mpegOneLayerThreeMono32k = [0xff, 0xfb, 0x10, 0xc0];
const frameBytes = 104;

export function silentMp3(frames: number): Uint8Array {
  const frame = [...mpegOneLayerThreeMono32k, ...new Array<number>(frameBytes - 4).fill(0)];
  return Uint8Array.from(new Array<number[]>(frames).fill(frame).flat());
}
