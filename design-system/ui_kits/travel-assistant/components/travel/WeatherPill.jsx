import React from 'react';
import {GlassSurface} from '../../../../components/glass/GlassSurface.jsx';
export function WeatherPill({temp='28°',style,...rest}){
  return React.createElement(GlassSurface,{level:3,blur:'soft',radius:'pill',shadow:'rest',
    style:{width:54,height:54,display:'grid',placeItems:'center',position:'relative',...style},...rest},
    React.createElement('span',{style:{position:'absolute',top:9,left:'50%',transform:'translateX(-50%)',
      width:5,height:5,borderRadius:'50%',background:'var(--accent-warm)',boxShadow:'0 0 6px rgba(229,157,51,.75)'}}),
    React.createElement('span',{style:{font:'var(--fw-medium) var(--fs-label)/1 var(--font-numeric)',color:'var(--text-title)',marginTop:8}},temp));
}
