const {DotRing,Filament,GlassButton,GlassChip,GlassIconButton,GlassInput,GlassSurface,Icon,MapCanvas,NightActionBar,RouteList,SpotHero,AuroraField,Avatar,CategoryTile,DestinationCard,FlightCard,RouteArc,StatusBar,SuggestionPill,WeatherPill} = window.GenerativeGlassDesignSystem_830e44 || {};
function FlightScreen({onNext}){
  return <AuroraField intensity={.55} style={{width:'100%',height:'100%'}}>
    <StatusBar/>
    <div style={{display:'grid',placeItems:'center',paddingTop:12}}>
      <span style={{width:34,height:4,borderRadius:2,background:'var(--dot-ring-stroke)'}}/>
      <div style={{marginTop:14,font:'var(--type-label)',color:'var(--text-muted)'}}>Your flight today</div>
    </div>
    <div style={{padding:'16px var(--gutter-screen) 0'}}>
      <FlightCard image={IMG+'city-night.png'} dep={{time:'22:30',code:'JFK',city:'New York'}}
        arr={{time:'06:20',code:'HND',city:'Tokyo'}} duration="8 h 10m"/>
    </div>
    <div style={{display:'grid',placeItems:'center',marginTop:-2}}>
      <Filament height={64}/>
      <DotRing size={170} style={{marginTop:-8}}>
        <button onClick={onNext} aria-label="Ask" style={{width:46,height:46,borderRadius:'50%',border:'none',cursor:'pointer',
          background:'transparent',display:'grid',placeItems:'center'}}><Icon name="plus" size={24} color="var(--text-dim)"/></button>
      </DotRing>
    </div>
    <div style={{position:'absolute',left:-40,right:-40,bottom:56,display:'grid',gap:'var(--gap-inline)',justifyItems:'center'}}>
      <div style={{display:'flex',gap:'var(--gap-inline)'}}><SuggestionPill>Ramen spots nearby</SuggestionPill><span style={{width:120}}/><SuggestionPill>Hotel check-in</SuggestionPill></div>
      <div style={{display:'flex',gap:'var(--gap-inline)'}}><SuggestionPill>Local etiquette tips for Japan</SuggestionPill><SuggestionPill onClick={onNext}>Help me beat jet lag</SuggestionPill></div>
      <div style={{display:'flex',gap:'var(--gap-inline)',opacity:.45}}><SuggestionPill>Great spots in Tokyo</SuggestionPill><SuggestionPill>Tokyo beyond the guidebook</SuggestionPill></div>
    </div>
    <HomeIndicator/>
  </AuroraField>;
}
Object.assign(window,{FlightScreen});
