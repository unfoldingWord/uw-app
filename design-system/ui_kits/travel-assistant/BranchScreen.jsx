const {DotRing,Filament,GlassButton,GlassChip,GlassIconButton,GlassInput,GlassSurface,Icon,MapCanvas,NightActionBar,RouteList,SpotHero,AuroraField,Avatar,CategoryTile,DestinationCard,FlightCard,RouteArc,StatusBar,SuggestionPill,WeatherPill} = window.GenerativeGlassDesignSystem_830e44 || {};
function BranchScreen({onPick}){
  return <AuroraField intensity={.6} style={{width:'100%',height:'100%'}}>
    <StatusBar/>
    <div style={{padding:'8px var(--gutter-screen) 0',opacity:.42,transform:'scale(.8)',transformOrigin:'top center'}}>
      <FlightCard compact dep={{time:'22:30',code:'JFK',city:'New York'}} arr={{time:'06:20',code:'HND',city:'Tokyo'}} duration="8 h 10m"/>
    </div>
    <div style={{display:'grid',justifyItems:'center',marginTop:-14}}>
      <Filament height={44} node={false}/>
      <div style={{position:'relative'}}>
        <DestinationCard image={IMG+'fuji-blossom.png'} title={<>Best places<br/>in Tokyo</>}
          subtitle="A relaxed route for your first day" cta={null} width={178} height={250}/>
        <div style={{position:'absolute',top:-16,right:-26,display:'flex'}}>
          <Avatar src={IMG+'avatar-amelia.png'} size={26} ring/>
          <span style={{width:26,height:26,borderRadius:'50%',marginLeft:-8,background:'var(--surface-solid)',
            display:'grid',placeItems:'center',boxShadow:'var(--shadow-rest)'}}>
            <svg width="13" height="9" viewBox="0 0 24 16"><path d="M1 14C7 9 14 4 23 1c-3 6-9 11-15 13z" fill="#1B2A4A"/><path d="M4 15c5-3 11-7 17-11-2 5-7 9-13 11z" fill="#C8102E" opacity=".85"/></svg>
          </span>
        </div>
      </div>
      <Filament branch width={186} height={72}/>
      <div style={{display:'flex',gap:'var(--sp-9)',marginTop:6}}>
        <CategoryTile image={IMG+'nature-tokyo.png'} title={<>Nature<br/>around<br/>Tokyo</>} label="Nature" size={116}/>
        <CategoryTile image={IMG+'tokyo-night.png'} title={<>Tokyo at<br/>night</>} label="Nightlife" size={116} onClick={onPick}/>
      </div>
    </div>
    <HomeIndicator/>
  </AuroraField>;
}
Object.assign(window,{BranchScreen});
