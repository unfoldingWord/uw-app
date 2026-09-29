/**
 * Full-bleed dark editorial screen for a single place: photograph, deep
 * protection gradient, uppercase chip, large title, one muted paragraph.
 */
export interface SpotHeroProps{
  image:string;
  /** Small uppercase chip above the title. */
  eyebrow?:string;
  title:React.ReactNode;
  body?:string;
  style?:React.CSSProperties;
  children?:React.ReactNode;
}
export declare function SpotHero(props:SpotHeroProps):JSX.Element;
