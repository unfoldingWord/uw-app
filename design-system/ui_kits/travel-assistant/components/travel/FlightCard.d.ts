/**
 * The hero itinerary card: title block with airline + seat badges on top, a
 * hairline divider, and the departure / arc / arrival strip below. Optionally
 * headed by a destination photograph when expanded.
 */
export interface FlightEndpoint{time:string;code:string;city?:string}
export interface FlightCardProps{
  title?:string;
  route?:string;
  /** Flight number shown in the chip. */
  code?:string;
  dep?:FlightEndpoint;
  arr?:FlightEndpoint;
  duration?:string;
  /** Destination photo for the expanded state. Omit for the home card. */
  image?:string;
  /** Seat badge text. */
  seat?:string;
  /** Scales the card to the 72% "receded" state used once the chat takes over. */
  compact?:boolean;
  style?:React.CSSProperties;
}
export declare function FlightCard(props:FlightCardProps):JSX.Element;
