import React from 'react';
export function NightActionBar({children,style,...rest}){
  return React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'center',
    gap:'var(--sp-4)',...style},...rest},children);
}
