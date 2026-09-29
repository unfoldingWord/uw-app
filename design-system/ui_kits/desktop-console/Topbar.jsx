const {GlassInput,GlassIconButton,GlassButton,Icon} = window.GenerativeGlassDesignSystem_830e44;
function Topbar({title,onNew}){
  return <div style={{display:'flex',alignItems:'center',gap:12}}>
    <div style={{display:'grid',gap:3,marginRight:'auto'}}>
      <div style={{font:'var(--fw-medium) 9px/1 var(--font-core)',letterSpacing:'.12em',textTransform:'uppercase',color:'var(--accent-blue-text)'}}>Workspace</div>
      <h1 style={{margin:0,font:'var(--fw-semibold) 24px/1.1 var(--font-core)',letterSpacing:'-.02em',color:'var(--text-title)'}}>{title}</h1>
    </div>
    <GlassInput placeholder="Search everything" height={40} style={{width:260}}
      leading={<Icon name="search" size={16} color="var(--text-dim)"/>}/>
    <GlassIconButton size={40} label="Filter"><Icon name="filter" size={17}/></GlassIconButton>
    <GlassIconButton size={40} label="Notifications"><Icon name="bell" size={17}/></GlassIconButton>
    <GlassButton variant="solid" size="md" onClick={onNew} leading={<Icon name="plus" size={15}/>}>New</GlassButton>
  </div>;
}
Object.assign(window,{Topbar});
