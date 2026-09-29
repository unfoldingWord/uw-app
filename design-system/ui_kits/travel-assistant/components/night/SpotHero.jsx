import React from 'react';
import {GlassChip} from '../../../../components/glass/GlassChip.jsx';
export function SpotHero({image,eyebrow='View spot',title,body,style,children,...rest}){
  return React.createElement('div',{style:{position:'relative',overflow:'hidden',background:'var(--night-900)',...style},...rest},
    React.createElement('img',{src:image,alt:'',style:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}),
    React.createElement('div',{style:{position:'absolute',inset:0,
      background:'linear-gradient(180deg,rgba(2,16,24,.25) 0%,rgba(2,16,24,0) 28%,rgba(2,18,27,.74) 66%,rgba(1,11,17,.96) 100%)'}}),
    React.createElement('div',{style:{position:'absolute',left:0,right:0,bottom:0,padding:'var(--sp-10) var(--sp-11) var(--sp-13)'}},
      eyebrow?React.createElement(GlassChip,{tone:'night',size:'sm',style:{textTransform:'uppercase',letterSpacing:'var(--ls-overline)'}},eyebrow):null,
      React.createElement('h1',{style:{margin:'var(--sp-6) 0 0',font:'var(--fw-bold) 29px/1.1 var(--font-core)',
        letterSpacing:'var(--ls-hero)',color:'var(--text-on-night)'}},title),
      body?React.createElement('p',{style:{margin:'var(--sp-5) 0 0',maxWidth:280,
        font:'var(--fw-regular) 13px/1.45 var(--font-core)',color:'var(--text-on-night-muted)'}},body):null,
      children));
}
