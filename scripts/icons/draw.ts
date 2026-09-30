import { createImage, type Image } from './png.ts';

export type Colour = { red: number; green: number; blue: number };

export type Box = { x: number; y: number; width: number; height: number };

export function hex(value: string): Colour {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (match?.[1] === undefined) {
    throw new Error(`${value} is not a six-digit hex colour`);
  }
  const number = Number.parseInt(match[1], 16);
  return {
    red: ((number >> 16) & 0xff) / 255,
    green: ((number >> 8) & 0xff) / 255,
    blue: (number & 0xff) / 255,
  };
}

function mix(from: Colour, to: Colour, amount: number): Colour {
  return {
    red: from.red + (to.red - from.red) * amount,
    green: from.green + (to.green - from.green) * amount,
    blue: from.blue + (to.blue - from.blue) * amount,
  };
}

function blendPixel(image: Image, x: number, y: number, colour: Colour, alpha: number): void {
  if (alpha <= 0 || x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return;
  }
  const index = (y * image.width + x) * 4;
  const keep = 1 - alpha;
  image.pixels[index] = colour.red * alpha + (image.pixels[index] ?? 0) * keep;
  image.pixels[index + 1] = colour.green * alpha + (image.pixels[index + 1] ?? 0) * keep;
  image.pixels[index + 2] = colour.blue * alpha + (image.pixels[index + 2] ?? 0) * keep;
  image.pixels[index + 3] = alpha + (image.pixels[index + 3] ?? 0) * keep;
}

export function fillGradient(image: Image, from: Colour, to: Colour): void {
  const span = image.width + image.height - 2;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      blendPixel(image, x, y, mix(from, to, span === 0 ? 0 : (x + y) / span), 1);
    }
  }
}

export function glow(
  image: Image,
  centreX: number,
  centreY: number,
  radius: number,
  colour: Colour,
  strength: number,
): void {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const distance = Math.hypot(x - centreX, y - centreY) / radius;
      if (distance < 1) {
        const falloff = 1 - distance;
        blendPixel(image, x, y, colour, strength * falloff * falloff);
      }
    }
  }
}

function roundedDistance(x: number, y: number, box: Box, radius: number): number {
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;
  const qx = Math.abs(x - (box.x + halfWidth)) - (halfWidth - radius);
  const qy = Math.abs(y - (box.y + halfHeight)) - (halfHeight - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

export type Plate = {
  box: Box;
  radius: number;
  fill: Colour;
  fillAlpha: number;
  edge: Colour;
  edgeAlpha: number;
  edgeWidth: number;
  shadow: Colour;
  shadowAlpha: number;
  shadowOffset: number;
  shadowSpread: number;
};

export function drawPlate(image: Image, plate: Plate): void {
  const shadowBox = { ...plate.box, y: plate.box.y + plate.shadowOffset };
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const outside = roundedDistance(x + 0.5, y + 0.5, shadowBox, plate.radius);
      if (outside > 0 && outside < plate.shadowSpread) {
        const falloff = 1 - outside / plate.shadowSpread;
        blendPixel(image, x, y, plate.shadow, plate.shadowAlpha * falloff * falloff);
      }
    }
  }
  const top = plate.box.y;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const distance = roundedDistance(x + 0.5, y + 0.5, plate.box, plate.radius);
      const coverage = Math.min(1, Math.max(0, 0.5 - distance));
      if (coverage > 0) {
        const sheen = Math.max(0, 1 - (y - top) / (plate.box.height * 0.45));
        blendPixel(image, x, y, plate.fill, coverage * Math.min(1, plate.fillAlpha + 0.3 * sheen));
        const edge = Math.min(1, Math.max(0, plate.edgeWidth + 0.5 + distance));
        blendPixel(image, x, y, plate.edge, coverage * edge * plate.edgeAlpha);
      }
    }
  }
}

export function scaleToHeight(source: Image, height: number): Image {
  const scale = source.height / height;
  const width = Math.max(1, Math.round(source.width / scale));
  const target = createImage(width, height);
  for (let y = 0; y < height; y += 1) {
    const top = Math.floor(y * scale);
    const bottom = Math.min(source.height, Math.max(top + 1, Math.floor((y + 1) * scale)));
    for (let x = 0; x < width; x += 1) {
      const left = Math.floor(x * scale);
      const right = Math.min(source.width, Math.max(left + 1, Math.floor((x + 1) * scale)));
      const sums = [0, 0, 0, 0];
      for (let sy = top; sy < bottom; sy += 1) {
        for (let sx = left; sx < right; sx += 1) {
          const index = (sy * source.width + sx) * 4;
          for (let channel = 0; channel < 4; channel += 1) {
            sums[channel] = (sums[channel] ?? 0) + (source.pixels[index + channel] ?? 0);
          }
        }
      }
      const count = (bottom - top) * (right - left);
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        target.pixels[index + channel] = (sums[channel] ?? 0) / count;
      }
    }
  }
  return target;
}

export function silhouette(source: Image, colour: Colour): Image {
  const target = createImage(source.width, source.height);
  for (let index = 0; index < source.width * source.height; index += 1) {
    const alpha = source.pixels[index * 4 + 3] ?? 0;
    target.pixels[index * 4] = colour.red * alpha;
    target.pixels[index * 4 + 1] = colour.green * alpha;
    target.pixels[index * 4 + 2] = colour.blue * alpha;
    target.pixels[index * 4 + 3] = alpha;
  }
  return target;
}

export function drawCentred(image: Image, source: Image): void {
  const offsetX = Math.round((image.width - source.width) / 2);
  const offsetY = Math.round((image.height - source.height) / 2);
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4;
      const alpha = source.pixels[index + 3] ?? 0;
      if (alpha > 0) {
        const colour = {
          red: (source.pixels[index] ?? 0) / alpha,
          green: (source.pixels[index + 1] ?? 0) / alpha,
          blue: (source.pixels[index + 2] ?? 0) / alpha,
        };
        blendPixel(image, x + offsetX, y + offsetY, colour, alpha);
      }
    }
  }
}
