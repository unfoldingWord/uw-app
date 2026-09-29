const {GlassSurface,GlassChip,Icon} = window.GenerativeGlassDesignSystem_830e44;
const NAV=[['grid','Overview'],['folder','Collections'],['layers','Sources'],['users','People'],['clock','Activity']];
function Sidebar({active,onGo}){
  return <GlassSurface level={2} blur="strong" radius="lg" shadow="card"
    style={{width:236,flex:'none',display:'flex',flexDirection:'column',padding:'18px 14px',gap:22}}>
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'2px 8px'}}>
      <span style={{width:26,height:26,borderRadius:8,background:'var(--accent-blue)',display:'grid',placeItems:'center',flex:'none'}}>
        <Icon name="sparkle" size={15} color="#fff" stroke={2}/></span>
      <span style={{font:'var(--fw-semibold) 14px/1 var(--font-core)',letterSpacing:'-.01em',color:'var(--text-title)'}}>Console</span>
    </div>
    <nav style={{display:'grid',gap:2}}>
      {NAV.map(([icon,label])=>{
        const on=active===label;
        return <button key={label} onClick={()=>onGo(label)} style={{display:'flex',alignItems:'center',gap:10,
          padding:'9px 10px',borderRadius:'var(--r-md)',border:'.5px solid '+(on?'rgba(255,255,255,.7)':'transparent'),
          background:on?'var(--glass-fill-3)':'transparent',cursor:'pointer',textAlign:'left',
          boxShadow:on?'var(--shadow-rest), var(--inner-top)':'none',transition:'var(--t-hover)',
          font:`${on?'var(--fw-medium)':'var(--fw-regular)'} 13px/1 var(--font-core)`,
          color:on?'var(--text-title)':'var(--text-muted)'}}>
          <Icon name={icon} size={16} color={on?'var(--accent-deep-text)':'var(--text-dim)'}/>{label}</button>;
      })}
    </nav>
    <div style={{marginTop:'auto',display:'grid',gap:8}}>
      <div style={{font:'var(--fw-medium) 9px/1 var(--font-core)',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-faint)',padding:'0 10px'}}>Storage</div>
      <div style={{padding:'0 10px',display:'grid',gap:7}}>
        <div style={{height:5,borderRadius:3,background:'var(--glass-fill-3)',overflow:'hidden'}}>
          <div style={{width:'62%',height:'100%',borderRadius:3,background:'var(--accent-blue)'}}/></div>
        <div style={{font:'var(--fw-regular) 11px/1.3 var(--font-core)',color:'var(--text-dim)'}}>18.4 GB of 30 GB</div>
      </div>
      <GlassChip style={{alignSelf:'start',marginLeft:10}} leading={<Icon name="globe" size={10}/>}>3 regions</GlassChip>
    </div>
  </GlassSurface>;
}
Object.assign(window,{Sidebar});
