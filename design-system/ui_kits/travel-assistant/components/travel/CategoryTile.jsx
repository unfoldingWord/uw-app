import React from 'react';
import {Icon} from '../../../../components/icons/Icon.jsx';
export function CategoryTile({image,title,label,size=122,style,...rest}){
  const [h,setH]=React.useState(false);
  return React.createElement('div',{style:{display:'flex',flexDirection:'column',alignItems:'center',gap:'var(--sp-5)',...style}},
    React.createElement('button',{onMouseEnter:()=>setH(true),onMouseLeave:()=>setH(false),
      style:{position:'relative',width:size,height:size*1.22,borderRadius:'var(--r-md)',overflow:'hidden',
        border:'var(--border-glass-soft)',cursor:'pointer',padding:0,background:'var(--glass-fill-2)',
        boxShadow:'var(--shadow-card)',transition:'var(--t-hover)',transform:h?'var(--hover-lift)':'none'},...rest},
      image?React.createElement('img',{src:image,alt:'',style:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}):null,
      React.createElement('span',{style:{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(2,26,40,0) 40%,rgba(2,24,36,.78) 100%)'}}),
      React.createElement('span',{style:{position:'absolute',top:8,right:8,width:20,height:20,borderRadius:'50%',
        background:'rgba(255,255,255,.9)',display:'grid',placeItems:'center'}},
        React.createElement(Icon,{name:'arrowUpRight',size:12,color:'var(--ink-900)',stroke:2})),
      title?React.createElement('span',{style:{position:'absolute',left:10,right:10,bottom:10,textAlign:'left',
        font:'var(--fw-bold) 14px/1.15 var(--font-core)',color:'var(--text-on-image)'}},title):null),
    label?React.createElement('span',{style:{font:'var(--type-overline)',letterSpacing:'var(--ls-overline)',
      textTransform:'uppercase',color:'var(--text-muted)'}},label):null);
}
