import type { Shadow, ShadowLayer } from '@shared/theme';

function layerCss(layer: ShadowLayer): string {
  const lengths = [layer.offsetX, layer.offsetY, layer.blurRadius, layer.spreadDistance].map(
    (length) => `${length}px`,
  );
  return [layer.inset ? 'inset' : undefined, ...lengths, layer.color].filter(Boolean).join(' ');
}

export type SplitShadow = { outset: string | undefined; inset: string | undefined };

export function splitShadows(shadows: readonly (Shadow | undefined)[]): SplitShadow {
  const layers = shadows.flatMap((shadow) => shadow?.layers ?? []);
  const join = (selected: ShadowLayer[]): string | undefined =>
    selected.length === 0 ? undefined : selected.map(layerCss).join(', ');
  return {
    outset: join(layers.filter((layer) => !layer.inset)),
    inset: join(layers.filter((layer) => layer.inset)),
  };
}

export function shadowCss(shadows: readonly (Shadow | undefined)[]): string | undefined {
  const { outset, inset } = splitShadows(shadows);
  const parts = [outset, inset].filter((part): part is string => part !== undefined);
  return parts.length === 0 ? undefined : parts.join(', ');
}
