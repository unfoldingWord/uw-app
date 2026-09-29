const {GlassSurface,GlassButton,GlassChip,GlassIconButton,Icon,DotRing} = window.GenerativeGlassDesignSystem_830e44;
function Inspector({item,onClose}){
  if(!item) return <GlassSurface level={1} blur="medium" radius="lg" shadow="rest"
    style={{width:288,flex:'none',display:'grid',placeItems:'center',padding:24}}>
    <div style={{display:'grid',justifyItems:'center',gap:14}}>
      <DotRing size={120} rings={5} dots={22}/>
      <div style={{font:'var(--fw-regular) 12px/1.5 var(--font-core)',color:'var(--text-dim)',textAlign:'center',maxWidth:170}}>
        Select a collection to inspect it.</div>
    </div>
  </GlassSurface>;
  return <GlassSurface level={2} blur="strong" radius="lg" shadow="card"
    style={{width:288,flex:'none',display:'flex',flexDirection:'column',padding:18,gap:16}}>
    <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
      <div style={{minWidth:0,flex:1}}>
        <div style={{font:'var(--fw-medium) 9px/1 var(--font-core)',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--accent-blue-text)'}}>Collection</div>
        <div style={{marginTop:7,font:'var(--fw-semibold) 18px/1.2 var(--font-core)',letterSpacing:'-.015em',color:'var(--text-title)'}}>{item.name}</div>
      </div>
      <GlassIconButton size={30} label="Close" onClick={onClose}><Icon name="plus" size={14} style={{transform:'rotate(45deg)'}}/></GlassIconButton>
    </div>
    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
      <GlassChip size="sm">{item.tag}</GlassChip><GlassChip size="sm">Shared</GlassChip><GlassChip size="sm">v4</GlassChip>
    </div>
    <div style={{height:'.5px',background:'rgba(1,66,99,.10)'}}/>
    <dl style={{margin:0,display:'grid',gap:11}}>
      {[['Owner','A. Mercer'],['Updated',item.meta],['Region','eu-west'],['Items','1,284']].map(([k,v])=>
        <div key={k} style={{display:'flex',justifyContent:'space-between',gap:12}}>
          <dt style={{font:'var(--fw-regular) 12px/1.3 var(--font-core)',color:'var(--text-dim)'}}>{k}</dt>
          <dd style={{margin:0,font:'var(--fw-medium) 12px/1.3 var(--font-core)',color:'var(--text-body)'}}>{v}</dd>
        </div>)}
    </dl>
    <div style={{height:'.5px',background:'rgba(1,66,99,.10)'}}/>
    <div style={{display:'grid',gap:9}}>
      <div style={{font:'var(--fw-medium) 9px/1 var(--font-core)',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--text-faint)'}}>Review</div>
      <div style={{display:'flex',alignItems:'center',gap:9}}>
        <span style={{width:22,height:22,borderRadius:'50%',flex:'none',display:'grid',placeItems:'center',background:'var(--accent-blue)'}}>
          <Icon name="check" size={12} color="#fff" stroke={2.4}/></span>
        <span style={{font:'var(--fw-regular) 12px/1.4 var(--font-core)',color:'var(--text-body)'}}>Passed automated checks</span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:9}}>
        <span style={{width:22,height:22,borderRadius:'50%',flex:'none',display:'grid',placeItems:'center',
          background:'var(--glass-fill-4)',border:'var(--border-glass-soft)'}}>
          <Icon name="clock" size={12} color="var(--accent-warm-text)"/></span>
        <span style={{font:'var(--fw-regular) 12px/1.4 var(--font-core)',color:'var(--text-body)'}}>Awaiting one approval</span>
      </div>
    </div>
    <div style={{marginTop:'auto',display:'grid',gap:8}}>
      <GlassButton variant="solid" size="md" full>Open collection</GlassButton>
      <GlassButton variant="glass" size="md" full leading={<Icon name="users" size={15}/>}>Manage access</GlassButton>
    </div>
  </GlassSurface>;
}
Object.assign(window,{Inspector});
