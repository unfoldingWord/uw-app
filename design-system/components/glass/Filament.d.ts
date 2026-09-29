/**
 * Thin glowing connector drawn between a parent card and the content it spawned.
 * Straight for a single child, forked for a two-way branch.
 */
export interface FilamentProps{
  height?:number;
  /** Only used when branch is true — horizontal span between the two children. */
  width?:number;
  branch?:boolean;
  /** Defaults to --filament-stroke, which flips with the theme. Only override for a
   *  one-off; a hardcoded Ocean value disappears on the dark theme. */
  color?:string;
  /** Terminal dot at the child end. */
  node?:boolean;
  style?:React.CSSProperties;
}
export declare function Filament(props:FilamentProps):JSX.Element;
