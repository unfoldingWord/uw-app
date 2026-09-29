export type IconName=
  // mobile surface
  'mic'|'navigation'|'plus'|'chevronLeft'|'chevronRight'|'arrowUpRight'|'bookmark'|'maximize'|'minimize'|'moon'|'sun'|'delete'|'shift'|'search'|'compass'|'sparkle'
  // desktop surface
  |'check'|'chevronDown'|'filter'|'settings'|'users'|'folder'|'ellipsis'|'bell'|'grid'|'clock'|'globe'|'layers';
export interface IconProps{
  /** Glyph name. */
  name:IconName;
  /** Pixel box. 20 in chips, 22 in FABs, 26 in the mic button. */
  size?:number;
  /** Stroke width. Keep 1.7 on light glass, 1.8 on night surfaces. */
  stroke?:number;
  color?:string;
  style?:React.CSSProperties;
}
export declare function Icon(props:IconProps):JSX.Element|null;
export declare const iconNames:string[];
