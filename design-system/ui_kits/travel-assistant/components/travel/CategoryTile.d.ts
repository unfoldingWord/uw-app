/**
 * A branch option below a spawned card: small portrait photo tile with an
 * open-in corner glyph and an uppercase category label underneath (NATURE, NIGHTLIFE).
 */
export interface CategoryTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{
  /** Omit to render the empty frosted placeholder state the frames morph from. */
  image?:string;
  title?:React.ReactNode;
  /** Uppercase caption rendered outside the tile. */
  label?:string;
  /** Tile width; height is 1.22×. */
  size?:number;
}
export declare function CategoryTile(props:CategoryTileProps):JSX.Element;
