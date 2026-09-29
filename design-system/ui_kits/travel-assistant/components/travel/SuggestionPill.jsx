import React from 'react';
export function SuggestionPill({children,style,...rest}){
  const [h,setH]=React.useState(false);
  return React.createElement('button',{onMouseEnter:()=>setH(true),onMouseLeave:()=>setH(false),
    style:{padding:'11px 18px',borderRadius:'var(--r-pill)',cursor:'pointer',whiteSpace:'nowrap',
      background:h?'var(--glass-fill-3)':'var(--glass-fill-2)',border:'var(--border-glass-soft)',
      backdropFilter:'blur(var(--blur-medium)) var(--sat-glass)',WebkitBackdropFilter:'blur(var(--blur-medium)) var(--sat-glass)',
      boxShadow:'var(--shadow-rest), var(--inner-top)',font:'var(--type-label)',color:'var(--text-body)',
      transition:'var(--t-hover)',transform:h?'var(--hover-lift)':'none',...style},...rest},children);
}
