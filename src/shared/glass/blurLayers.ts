export type BlurConditions = {
  readonly reducedBlur: boolean;
  readonly intensity: number;
  readonly platform: string;
  readonly hasTarget: boolean;
  readonly insideGlass: boolean;
};

export function blurRenders(conditions: BlurConditions): boolean {
  if (conditions.reducedBlur || conditions.intensity === 0 || conditions.insideGlass) {
    return false;
  }
  return conditions.platform !== 'android' || conditions.hasTarget;
}
