/**
 * Dark glass itinerary list on the map overlay: a status dot, stop name, and
 * travel time. Filled red dot = current leg, hollow = upcoming.
 */
export interface RouteStop{name:string;time:string;active?:boolean}
export interface RouteListProps{
  items?:RouteStop[];
  style?:React.CSSProperties;
}
export declare function RouteList(props:RouteListProps):JSX.Element;
