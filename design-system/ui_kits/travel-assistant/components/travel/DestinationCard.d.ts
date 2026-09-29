/**
 * Portrait photo card spawned by the assistant: full-bleed image, bottom
 * protection gradient, title + one-line subtitle, and a solid white CTA.
 */
export interface DestinationCardProps{
  image:string;
  title:string;
  subtitle?:string;
  /** Button label; pass null to drop the CTA (the settled state in the frames). */
  cta?:string|null;
  onOpen?:()=>void;
  width?:number;
  height?:number;
  style?:React.CSSProperties;
}
export declare function DestinationCard(props:DestinationCardProps):JSX.Element;
