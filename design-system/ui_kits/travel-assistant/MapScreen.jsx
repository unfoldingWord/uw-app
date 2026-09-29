const {DotRing,Filament,GlassButton,GlassChip,GlassIconButton,GlassInput,GlassSurface,Icon,MapCanvas,NightActionBar,RouteList,SpotHero,AuroraField,Avatar,CategoryTile,DestinationCard,FlightCard,RouteArc,StatusBar,SuggestionPill,WeatherPill} = window.GenerativeGlassDesignSystem_830e44 || {};
function MapScreen({onBack}){
  return <div style={{width:'100%',height:'100%',position:'relative',background:'var(--night-map)'}}>
    <MapCanvas style={{position:'absolute',inset:0}}
      roads={['M6 26 L58 78','M0 122 L100 58','M52 58 L98 84','M18 158 L74 44','M30 8 L62 62','M62 62 L100 96']}
      user={{x:52,y:58}}
      places={[{x:45,y:22,name:'Tokyo\nSkytree'},{x:56,y:68,name:'Senso-ji Temple',accent:true},
               {x:20,y:74,name:'Ueno Park',muted:true,dot:5},{x:74,y:64,name:'Tokyo Tower',muted:true,dot:5},
               {x:19,y:24,name:'Asakusa',muted:true,dot:5}]}>
      <span style={{position:'absolute',left:'6%',right:'6%',top:0,height:130,
        background:'linear-gradient(180deg,rgba(3,19,28,.85),rgba(3,19,28,0))'}}/>
      <div style={{position:'absolute',top:22,left:'50%',transform:'translateX(-50%)',width:64,height:78,
        borderRadius:'0 0 var(--r-md) var(--r-md)',overflow:'hidden',boxShadow:'var(--shadow-night)'}}>
        <img src={IMG+'tokyo-night.png'} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      </div>
    </MapCanvas>
    <div style={{position:'absolute',top:0,left:0,right:0}}><StatusBar tone="night"/></div>
    <GlassIconButton tone="night" size={54} label="Recentre" style={{position:'absolute',right:20,bottom:196}}>
      <Icon name="navigation" size={20}/></GlassIconButton>
    <div style={{position:'absolute',left:18,right:18,bottom:40,display:'flex',gap:'var(--gap-inline)',alignItems:'flex-end'}}>
      <GlassSurface tone="night" level={3} blur="strong" radius="lg" style={{width:130,height:118,position:'relative'}}>
        <GlassIconButton tone="night" size={44} label="Save" style={{position:'absolute',top:12,right:12}}><Icon name="bookmark" size={18}/></GlassIconButton>
        <GlassIconButton tone="night" size={44} label="Collapse" onClick={onBack} style={{position:'absolute',bottom:12,left:12}}><Icon name="minimize" size={18}/></GlassIconButton>
      </GlassSurface>
      <RouteList style={{flex:1}} items={[{name:'Senso-ji Temple',time:'30 min',active:true},{name:'Shibuya Crossing',time:'1h 20m'}]}/>
    </div>
    <HomeIndicator tone="night"/>
  </div>;
}
Object.assign(window,{MapScreen});
