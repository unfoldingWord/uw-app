import React from 'react';
import {GlassSurface} from '../../../../components/glass/GlassSurface.jsx';
import {GlassChip} from '../../../../components/glass/GlassChip.jsx';
import {Icon} from '../../../../components/icons/Icon.jsx';
import {RouteArc} from './RouteArc.jsx';
export function FlightCard({title='Flight from',route='New York to Tokyo',code='FY8722',
  dep={time:'22:30',code:'JFK',city:'New York'},arr={time:'06:20',code:'HND',city:'Tokyo'},
  duration='8 h 10m',image,seat='A6',compact=false,style,...rest}){
  const scale=compact?.72:1;
  return React.createElement(GlassSurface,{level:2,blur:'strong',radius:'xl',shadow:'card',
    style:{overflow:'hidden',...style},...rest},
    image?React.createElement('div',{style:{margin:10,marginBottom:0,borderRadius:'var(--r-lg)',overflow:'hidden',height:200}},
      React.createElement('img',{src:image,alt:'',style:{width:'100%',height:'100%',objectFit:'cover',display:'block'}})):null,
    React.createElement('div',{style:{display:'flex',alignItems:'flex-start',justifyContent:'space-between',
      gap:'var(--sp-6)',padding:`${18*scale}px var(--gutter-card) ${14*scale}px`}},
      React.createElement('div',{style:{flex:1,minWidth:0}},
        React.createElement('div',{style:{font:'var(--type-card-title)',fontSize:19*scale,letterSpacing:'var(--ls-title)',color:'var(--text-title)'}},title),
        React.createElement('div',{style:{font:'var(--type-card-title)',fontSize:19*scale,letterSpacing:'var(--ls-title)',color:'var(--text-title)'}},route),
        React.createElement('div',{style:{marginTop:10*scale}},
          React.createElement(GlassChip,{leading:React.createElement(Icon,{name:'moon',size:10*scale})},code))),
      React.createElement('div',{style:{display:'flex',alignItems:'center'}},
        React.createElement('div',{style:{width:34*scale,height:34*scale,borderRadius:'50%',background:'var(--surface-solid)',
          display:'grid',placeItems:'center',boxShadow:'var(--shadow-rest)',zIndex:1}},
          React.createElement('svg',{width:17*scale,height:11*scale,viewBox:'0 0 24 16'},
            React.createElement('path',{d:'M1 14C7 9 14 4 23 1c-3 6-9 11-15 13z',fill:'#1B2A4A'}),
            React.createElement('path',{d:'M4 15c5-3 11-7 17-11-2 5-7 9-13 11z',fill:'#C8102E',opacity:.85}))),
        React.createElement('div',{style:{width:34*scale,height:34*scale,borderRadius:'50%',background:'var(--accent-blue)',
          marginLeft:-9*scale,display:'grid',placeItems:'center',color:'#fff',
          font:`var(--fw-semibold) ${13*scale}px/1 var(--font-core)`,boxShadow:'var(--shadow-rest)'}},seat))),
    React.createElement('div',{style:{height:'.5px',background:'rgba(1,66,99,.10)'}}),
    React.createElement('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',
      gap:'var(--sp-6)',padding:`${16*scale}px var(--gutter-card)`,background:'var(--glass-fill-2)'}},
      React.createElement(Endpoint,{...dep,scale,align:'left'}),
      React.createElement(RouteArc,{width:150*scale,height:34*scale,duration}),
      React.createElement(Endpoint,{...arr,scale,align:'right'})));
}
function Endpoint({time,code,city,scale=1,align}){
  return React.createElement('div',{style:{textAlign:align,minWidth:52*scale}},
    React.createElement('div',{style:{font:'var(--type-caption)',fontSize:11*scale,color:'var(--text-dim)'}},code),
    React.createElement('div',{style:{font:'var(--type-time)',fontSize:17*scale,color:'var(--text-title)',letterSpacing:'-.01em'}},time),
    city?React.createElement('div',{style:{font:'var(--type-caption)',fontSize:11*scale,color:'var(--text-muted)'}},city):null);
}
