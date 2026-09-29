/**
 * The dark map plate: near-black ground with a teal glow at top, hairline
 * roads, uppercase micro place labels, and a pulsing user puck.
 */
export interface MapPlace{x:number;y:number;name?:string;accent?:boolean;muted?:boolean;dot?:number}
export interface MapCanvasProps{
  /** Percentage-positioned markers. */
  places?:MapPlace[];
  /** SVG path strings in a 100×160 viewBox, stretched to fill. */
  roads?:string[];
  user?:{x:number;y:number};
  style?:React.CSSProperties;
  children?:React.ReactNode;
}
export declare function MapCanvas(props:MapCanvasProps):JSX.Element;
