const {DotRing,Filament,GlassButton,GlassChip,GlassIconButton,GlassInput,GlassSurface,Icon,MapCanvas,NightActionBar,RouteList,SpotHero,AuroraField,Avatar,CategoryTile,DestinationCard,FlightCard,RouteArc,StatusBar,SuggestionPill,WeatherPill} = window.GenerativeGlassDesignSystem_830e44 || {};
function HomeScreen({onOpenFlight,onCompose}){
  return <AuroraField style={{width:'100%',height:'100%'}}>
    <StatusBar/>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px var(--gutter-screen) 0'}}>
      <div style={{display:'flex',gap:'var(--gap-inline)'}}><WeatherPill/><OrbWidget/></div>
      <Avatar src={IMG+'avatar-amelia.png'} size={54}/>
    </div>
    <div style={{padding:'92px var(--gutter-screen) 0'}}>
      <div style={{font:'var(--type-caption)',color:'var(--text-muted)'}}>Wed, Apr 23</div>
      <h1 style={{margin:'6px 0 0',font:'var(--type-hero)',letterSpacing:'var(--ls-hero)',color:'var(--text-title)'}}>Good morning,<br/>Amelia</h1>
    </div>
    <div style={{position:'absolute',left:'var(--gutter-screen)',right:'var(--gutter-screen)',bottom:24,display:'grid',gap:'var(--gap-stack)'}}>
      <div onClick={onOpenFlight} style={{cursor:'pointer'}}><FlightCard/></div>
      <GlassSurface level={2} blur="strong" radius="xl" style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'0 0 0 var(--gutter-card)',height:78,overflow:'hidden'}}>
        <div>
          <div style={{font:'var(--type-caption)',color:'var(--text-muted)'}}>Best places to visit</div>
          <div style={{marginTop:2,font:'var(--fw-semibold) var(--fs-body)/1.2 var(--font-core)',color:'var(--text-title)'}}>First day in Tokyo</div>
        </div>
        <div style={{position:'relative',width:150,height:'100%'}}>
          <img src={IMG+'tokyo-night.png'} alt="" style={{width:'100%',height:'100%',objectFit:'cover',opacity:.75}}/>
          <span style={{position:'absolute',inset:0,background:'linear-gradient(90deg,rgba(244,250,251,.95) 0%,rgba(244,250,251,0) 55%)'}}/>
          <span style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',width:54,height:54,borderRadius:'50%',
            background:'rgba(255,255,255,.35)',backdropFilter:'blur(var(--blur-medium))',border:'var(--border-glass)',
            display:'grid',placeItems:'center'}}><Icon name="navigation" size={22} color="#fff"/></span>
        </div>
      </GlassSurface>
      <div style={{display:'flex',gap:'var(--gap-inline)'}}>
        <GlassInput placeholder="Type a message" onFocus={onCompose} style={{flex:1}}/>
        <GlassIconButton label="Voice input" size={58}><Icon name="mic" size={22} color="var(--text-muted)"/></GlassIconButton>
      </div>
    </div>
    <HomeIndicator/>
  </AuroraField>;
}
Object.assign(window,{HomeScreen});
