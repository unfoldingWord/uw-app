import React from 'react';
export function GlassChip({leading,tone='light',size='md',style,children,...rest}){
  const night=tone==='night',bare=tone==='bare';
  return React.createElement('span',{style:{display:'inline-flex',alignItems:'center',gap:'var(--sp-3)',
    padding:bare?'4px 0':(size==='sm'?'4px 9px':'5px 11px'),borderRadius:'var(--r-pill)',
    background:bare?'none':(night?'rgba(255,255,255,.16)':'var(--glass-fill-3)'),
    color:night?'var(--on-night-900)':'var(--text-muted)',
    border:bare?'none':(night?'.5px solid rgba(255,255,255,.18)':'var(--border-glass)'),
    backdropFilter:bare?'none':'blur(var(--blur-soft))',WebkitBackdropFilter:bare?'none':'blur(var(--blur-soft))',
    font:`var(--fw-medium) ${size==='sm'?'var(--fs-overline)':'var(--fs-micro)'}/1.1 var(--font-core)`,
    letterSpacing:'.01em',...style},...rest},leading,children);
}
