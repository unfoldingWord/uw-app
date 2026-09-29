const {GlassSurface,GlassChip,Icon} = window.GenerativeGlassDesignSystem_830e44;
function Stat({label,value,delta}){
  return <GlassSurface level={2} blur="strong" radius="lg" shadow="rest" style={{padding:'16px 18px',display:'grid',gap:6}}>
    <div style={{font:'var(--fw-medium) 9px/1 var(--font-core)',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-faint)'}}>{label}</div>
    <div style={{display:'flex',alignItems:'baseline',gap:8}}>
      <span style={{font:'var(--fw-semibold) 27px/1 var(--font-numeric)',letterSpacing:'-.02em',color:'var(--text-title)'}}>{value}</span>
      {delta?<span style={{font:'var(--fw-medium) 11px/1 var(--font-core)',color:'var(--accent-deep-text)'}}>{delta}</span>:null}
    </div>
  </GlassSurface>;
}
function Row({name,meta,tag,tone,active,onPick}){
  const [h,setH]=React.useState(false);
  return <div onClick={onPick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:'flex',alignItems:'center',gap:14,padding:'13px 16px',borderRadius:'var(--r-md)',cursor:'pointer',
      background:active||h?'var(--glass-fill-3)':'transparent',border:'.5px solid '+(active?'rgba(255,255,255,.7)':'transparent'),
      boxShadow:active?'var(--shadow-rest), var(--inner-top)':'none',transition:'var(--t-hover)'}}>
    <span style={{width:30,height:30,borderRadius:9,flex:'none',display:'grid',placeItems:'center',
      background:active||h?'transparent':'var(--glass-fill-2)',border:'var(--border-glass-soft)'}}>
      <Icon name="folder" size={15} color="var(--accent-deep-text)"/></span>
    <div style={{minWidth:0,flex:1}}>
      <div style={{font:'var(--fw-medium) 13px/1.3 var(--font-core)',color:'var(--text-title)'}}>{name}</div>
      <div style={{font:'var(--fw-regular) 11px/1.3 var(--font-core)',color:'var(--text-dim)'}}>{meta}</div>
    </div>
    <GlassChip tone="bare" size="sm" style={{color:tone==='warm'?'var(--accent-warm-text)':'var(--text-muted)'}}>{tag}</GlassChip>
    <Icon name="chevronRight" size={15} color="var(--text-faint)"/>
  </div>;
}
function Workspace({items,active,onPick}){
  return <div style={{flex:1,minWidth:0,display:'grid',gap:16,alignContent:'start'}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
      <Stat label="Collections" value="128" delta="+6"/>
      <Stat label="Contributors" value="42"/>
      <Stat label="Pending review" value="7" delta="−2"/>
    </div>
    <GlassSurface level={2} blur="strong" radius="lg" shadow="card" style={{padding:10}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px 12px'}}>
        <span style={{font:'var(--fw-semibold) 14px/1 var(--font-core)',letterSpacing:'-.01em',color:'var(--text-title)'}}>Recent collections</span>
        <span style={{display:'flex',alignItems:'center',gap:5,font:'var(--fw-medium) 11px/1 var(--font-core)',color:'var(--text-muted)',cursor:'pointer'}}>
          Sorted by activity <Icon name="chevronDown" size={13} color="var(--text-dim)"/></span>
      </div>
      <div style={{display:'grid',gap:2}}>
        {items.map(it=><Row key={it.name} {...it} active={active===it.name} onPick={()=>onPick(it.name)}/>)}
      </div>
    </GlassSurface>
  </div>;
}
Object.assign(window,{Workspace,Stat,Row});
