const {DotRing,Filament,GlassButton,GlassChip,GlassIconButton,GlassInput,GlassSurface,Icon,MapCanvas,NightActionBar,RouteList,SpotHero,AuroraField,Avatar,CategoryTile,DestinationCard,FlightCard,RouteArc,StatusBar,SuggestionPill,WeatherPill} = window.GenerativeGlassDesignSystem_830e44 || {};
function SpotScreen({onBack,onRoute}){
  return <div style={{width:'100%',height:'100%',position:'relative',background:'var(--night-900)'}}>
    <SpotHero image={IMG+'tokyo-night.png'} eyebrow="View spot" title="Tokyo at night"
      body="Neon streets, quiet temples, and the city that never fully sleeps."
      style={{position:'absolute',inset:0}}/>
    <div style={{position:'absolute',top:0,left:0,right:0}}><StatusBar tone="night"/></div>
    <NightActionBar style={{position:'absolute',left:0,right:0,bottom:34}}>
      <GlassIconButton tone="night" size={64} label="Back" onClick={onBack}><Icon name="chevronLeft" size={22}/></GlassIconButton>
      <GlassButton variant="night" size="lg" onClick={onRoute} leading={<Icon name="navigation" size={18}/>} style={{height:64,paddingLeft:30,paddingRight:30}}>Route</GlassButton>
      <GlassIconButton tone="night" size={64} label="Save"><Icon name="plus" size={22}/></GlassIconButton>
    </NightActionBar>
    <HomeIndicator tone="night"/>
  </div>;
}
Object.assign(window,{SpotScreen});
