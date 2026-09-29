/**
 * The dashed great-circle arc between two airports, filled dot at origin and
 * hollow dot at destination, with optional duration caption underneath.
 */
export interface RouteArcProps{
  width?:number;
  height?:number;
  /** e.g. "8 h 10m" — omitted in the compact home card, shown when expanded. */
  duration?:string;
  style?:React.CSSProperties;
}
export declare function RouteArc(props:RouteArcProps):JSX.Element;
