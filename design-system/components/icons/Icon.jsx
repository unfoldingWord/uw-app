import React from 'react';
// Glyph outlines are Lucide (MIT, lucide.dev) — the source frames ship no icon set,
// so Lucide is the flagged substitution: 24px grid, 2px round stroke, no fills.
const P={
  mic:['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z','M19 10v2a7 7 0 0 1-14 0v-2','M12 19v3'],
  navigation:['M3 11l19-9-9 19-2-8-8-2z'],
  plus:['M5 12h14','M12 5v14'],
  chevronLeft:['M15 18l-6-6 6-6'],
  chevronRight:['M9 18l6-6-6-6'],
  arrowUpRight:['M7 17L17 7','M7 7h10v10'],
  bookmark:['M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'],
  maximize:['M15 3h6v6','M9 21H3v-6','M21 3l-7 7','M3 21l7-7'],
  minimize:['M8 3v3a2 2 0 0 1-2 2H3','M21 8h-3a2 2 0 0 1-2-2V3','M3 16h3a2 2 0 0 1 2 2v3','M16 21v-3a2 2 0 0 1 2-2h3'],
  moon:['M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z'],
  sun:['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8','M12 4V2','M12 22v-2','M4 12H2','M22 12h-2','M6.3 6.3L4.9 4.9','M19.1 19.1l-1.4-1.4','M6.3 17.7l-1.4 1.4','M19.1 4.9l-1.4 1.4'],
  delete:['M20 6H9l-5 6 5 6h11a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z','M16 10l-4 4','M12 10l4 4'],
  shift:['M12 3l8 9h-4v7H8v-7H4z'],
  search:['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z','M21 21l-4.3-4.3'],
  compass:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M16.2 7.8l-2.2 6.4-6.4 2.2 2.2-6.4z'],
  sparkle:['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z'],
  // Added for the desktop console surface — same Lucide set, same 24px/2px grid.
  check:['M20 6L9 17l-5-5'],
  chevronDown:['M6 9l6 6 6-6'],
  filter:['M22 3H2l8 9.5V19l4 2v-8.5z'],
  settings:['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z','M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 8a1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V2a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V8a1.7 1.7 0 0 0 1.5 1H22a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  users:['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2','M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8','M22 21v-2a4 4 0 0 0-3-3.9','M16 3.1a4 4 0 0 1 0 7.8'],
  folder:['M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.9 3.9A2 2 0 0 0 8.2 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z'],
  ellipsis:['M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2','M19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2','M5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2'],
  bell:['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9','M10.3 21a1.9 1.9 0 0 0 3.4 0'],
  grid:['M3 3h7v7H3z','M14 3h7v7h-7z','M14 14h7v7h-7z','M3 14h7v7H3z'],
  clock:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M12 6v6l4 2'],
  globe:['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M2 12h20','M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z'],
  layers:['M12 2L2 7l10 5 10-5z','M2 17l10 5 10-5','M2 12l10 5 10-5']
};
export function Icon({name,size=20,stroke=1.7,color='currentColor',style,...rest}){
  const d=P[name]; if(!d) return null;
  return React.createElement('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:color,
    strokeWidth:stroke,strokeLinecap:'round',strokeLinejoin:'round',style:{display:'block',flex:'none',...style},...rest},
    d.map((p,i)=>React.createElement('path',{key:i,d:p})));
}
export const iconNames=Object.keys(P);
