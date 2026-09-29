/**
 * Small metadata chip — flight number, "VIEW SPOT", overline labels on imagery.
 */
export interface GlassChipProps{
  leading?:React.ReactNode;
  /** 'bare' drops the fill, border and blur — use it when the chip already sits on
   *  a raised glass row, so the surface is not lifted by a third stacked fill. */
  tone?:'light'|'night'|'bare';
  size?:'sm'|'md';
  children?:React.ReactNode;
  style?:React.CSSProperties;
}
export declare function GlassChip(props:GlassChipProps):JSX.Element;
