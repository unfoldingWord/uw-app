import React from 'react';
export function MapCanvas({places=[],roads=[],user={x:52,y:47},style,children,...rest}){
  return React.createElement('div',{style:{position:'relative',overflow:'hidden',width:'100%',height:'100%',
    background:'radial-gradient(60% 40% at 50% 8%,#0A3A4E 0%,#04202C 46%,#031219 78%,#0B1418 100%)',...style},...rest},
    React.createElement('svg',{viewBox:'0 0 100 160',preserveAspectRatio:'none',
      style:{position:'absolute',inset:0,width:'100%',height:'100%'}},
      roads.map((d,i)=>React.createElement('path',{key:i,d,fill:'none',stroke:'rgba(255,255,255,.22)',strokeWidth:.35}))),
    React.createElement('div',{'aria-hidden':true,style:{position:'absolute',left:`${user.x}%`,top:`${user.y}%`,
      transform:'translate(-50%,-50%)',width:74,height:74,borderRadius:'50%',display:'grid',placeItems:'center',
      border:'.5px solid rgba(255,255,255,.10)'}},
      React.createElement('span',{style:{width:44,height:44,borderRadius:'50%',display:'grid',placeItems:'center',
        border:'.5px solid rgba(255,255,255,.16)'}},
        React.createElement('span',{style:{width:14,height:14,borderRadius:'50%',background:'#fff',
          boxShadow:'0 0 12px rgba(255,255,255,.55)'}}))),
    places.map((p,i)=>React.createElement('div',{key:i,style:{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,
      transform:'translate(-50%,-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:4}},
      React.createElement('span',{style:{width:p.dot||8,height:p.dot||8,borderRadius:'50%',
        background:p.accent?'var(--accent-warm)':p.muted?'rgba(255,255,255,.35)':'#fff',
        boxShadow:p.accent?'0 0 10px rgba(229,157,51,.85)':'0 0 8px rgba(255,255,255,.5)'}}),
      p.name?React.createElement('span',{style:{font:'var(--fw-semibold) 7px/1.15 var(--font-core)',
        letterSpacing:'.08em',textTransform:'uppercase',color:p.muted?'var(--on-night-400)':'var(--on-night-500)',
        whiteSpace:'pre-line',textAlign:'center'}},p.name):null)),
    children);
}
