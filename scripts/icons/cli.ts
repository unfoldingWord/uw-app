import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  drawCentred,
  drawPlate,
  fillGradient,
  glow,
  hex,
  scaleToHeight,
  silhouette,
  type Colour,
} from './draw.ts';
import { createImage, decodePng, encodePng, type Image } from './png.ts';

const repositoryRoot = join(import.meta.dirname, '..', '..');
const output = join(repositoryRoot, 'assets');
const tokens = readFileSync(join(repositoryRoot, 'design-system', 'tokens', 'colors.css'), 'utf8');

function token(name: string): Colour {
  const match = new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(tokens);
  if (match?.[1] === undefined) {
    throw new Error(`--${name} is not a hex colour in design-system/tokens/colors.css`);
  }
  return hex(match[1]);
}

const white = token('paper-000');
const paper = token('paper-050');
const paperDeep = token('paper-200');
const inspire = token('uw-inspire');
const cultivate = token('uw-cultivate');
const ocean = token('uw-ocean');

const mark = decodePng(
  readFileSync(join(repositoryRoot, 'design-system', 'assets', 'logo', 'logo-mark-color.png')),
);

const side = 1024;

function glassPlate(image: Image, size: number): void {
  const offset = (side - size) / 2;
  drawPlate(image, {
    box: { x: offset, y: offset, width: size, height: size },
    radius: size * 0.23,
    fill: white,
    fillAlpha: 0.5,
    edge: white,
    edgeAlpha: 0.95,
    edgeWidth: Math.max(2, size / 240),
    shadow: ocean,
    shadowAlpha: 0.16,
    shadowOffset: size / 30,
    shadowSpread: size / 12,
  });
}

function icon(): Image {
  const image = createImage(side, side);
  fillGradient(image, paper, paperDeep);
  glow(image, side * 0.15, side * 0.9, side * 0.75, cultivate, 0.45);
  glow(image, side * 0.9, side * 0.1, side * 0.65, inspire, 0.3);
  glassPlate(image, 720);
  drawCentred(image, scaleToHeight(mark, 500));
  return image;
}

function adaptiveForeground(): Image {
  const image = createImage(side, side);
  glassPlate(image, 440);
  drawCentred(image, scaleToHeight(mark, 300));
  return image;
}

function monochrome(): Image {
  const image = createImage(side, side);
  drawCentred(image, silhouette(scaleToHeight(mark, 340), white));
  return image;
}

function splash(): Image {
  const scaled = scaleToHeight(mark, 626);
  const image = createImage(scaled.width, scaled.height);
  drawCentred(image, scaled);
  return image;
}

const outputs: Record<string, () => Image> = {
  'icon.png': icon,
  'adaptive-icon.png': adaptiveForeground,
  'adaptive-icon-monochrome.png': monochrome,
  'splash-icon.png': splash,
};

mkdirSync(output, { recursive: true });
for (const [file, render] of Object.entries(outputs)) {
  const image = render();
  writeFileSync(join(output, file), encodePng(image));
  console.log(`icons: wrote assets/${file} (${image.width}x${image.height})`);
}
