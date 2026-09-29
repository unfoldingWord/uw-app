import React from 'react';
import {GlassButton} from '../../../../components/glass/GlassButton.jsx';
export function DestinationCard({image,title,subtitle,cta='Open',onOpen,width=178,height=322,style,...rest}){
  const [h,setH]=React.useState(false);
  return React.createElement('div',{onMouseEnter:()=>setH(true),onMouseLeave:()=>setH(false),
    style:{position:'relative',width,height,borderRadius:'var(--r-xl)',overflow:'hidden',
      boxShadow:'var(--shadow-float)',transition:'var(--t-hover)',transform:h?'translateY(-3px)':'none',...style},...rest},
    React.createElement('img',{src:image,alt:'',style:{position:'absolute',inset:0,width:'100%',height:'100%',
      objectFit:'cover',transform:h?'scale(1.04)':'scale(1)',transition:'transform var(--dur-slow) var(--ease-liquid)'}}),
    React.createElement('div',{style:{position:'absolute',inset:0,
      background:'linear-gradient(180deg,rgba(1,40,60,0) 34%,rgba(1,34,52,.64) 62%,rgba(2,22,33,.93) 100%)'}}),
    React.createElement('div',{style:{position:'absolute',left:0,right:0,bottom:0,padding:'var(--sp-8)'}},
      React.createElement('div',{style:{font:'var(--fw-bold) 17px/1.15 var(--font-core)',letterSpacing:'var(--ls-title)',color:'var(--text-on-image)'}},title),
      subtitle?React.createElement('div',{style:{marginTop:6,font:'var(--fw-regular) 13px/1.3 var(--font-core)',color:'rgba(255,255,255,.82)'}},subtitle):null,
      cta?React.createElement(GlassButton,{variant:'solid',size:'sm',full:true,onClick:onOpen,style:{marginTop:'var(--sp-7)'}},cta):null));
}
