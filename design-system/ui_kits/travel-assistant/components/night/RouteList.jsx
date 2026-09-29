import React from 'react';
import {GlassSurface} from '../../../../components/glass/GlassSurface.jsx';
export function RouteList({items=[],style,...rest}){
  return React.createElement(GlassSurface,{tone:'night',level:3,blur:'strong',radius:'lg',
    style:{padding:'var(--sp-7) var(--sp-8)',display:'grid',gap:'var(--sp-7)',...style},...rest},
    items.map((it,i)=>React.createElement('div',{key:i,style:{display:'flex',gap:'var(--sp-6)',alignItems:'flex-start'}},
      React.createElement('span',{style:{width:8,height:8,borderRadius:'50%',marginTop:5,flex:'none',
        background:it.active?'var(--accent-warm)':'transparent',
        border:it.active?'none':'1.2px solid var(--on-night-400)'}}),
      React.createElement('div',null,
        React.createElement('div',{style:{font:'var(--fw-semibold) 14px/1.2 var(--font-core)',color:'var(--text-on-night)'}},it.name),
        React.createElement('div',{style:{marginTop:2,font:'var(--fw-regular) 11px/1.2 var(--font-core)',color:'var(--text-on-night-muted)'}},it.time)))));
}
