const {DotRing,Filament,GlassButton,GlassChip,GlassIconButton,GlassInput,GlassSurface,Icon,MapCanvas,NightActionBar,RouteList,SpotHero,AuroraField,Avatar,CategoryTile,DestinationCard,FlightCard,RouteArc,StatusBar,SuggestionPill,WeatherPill} = window.GenerativeGlassDesignSystem_830e44 || {};
const IMG='../../assets/img/';
function Phone({children,tone='light'}){
  return <div style={{width:390,height:844,borderRadius:'var(--r-device)',padding:5,flex:'none',
    background:'var(--device-frame,linear-gradient(150deg,#EFF6F8 0%,#BFD0D8 22%,#E7F0F3 48%,#ADC3CD 78%,#E2EDF0 100%))',
    boxShadow:'0 2px 6px rgba(1,66,99,.14), 0 30px 70px rgba(1,66,99,.24), 0 90px 160px rgba(1,66,99,.18)'}}>
    <div style={{width:'100%',height:'100%',borderRadius:'var(--r-screen)',overflow:'hidden',position:'relative',
      background:tone==='night'?'var(--night-900)':'var(--surface-app)'}}>{children}</div>
  </div>;
}
function HomeIndicator({tone='light'}){
  return <div style={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',width:134,height:5,
    borderRadius:3,background:tone==='night'?'rgba(255,255,255,.5)':'rgba(1,66,99,.30)'}}/>;
}
function OrbWidget(){
  return <GlassSurface level={3} blur="soft" radius="pill" shadow="rest"
    style={{width:104,height:54,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 6px'}}>
    <svg width="34" height="14" viewBox="0 0 34 14"><circle cx="3" cy="7" r="2.4" fill="var(--text-body)"/><path d="M5.4 7h18" stroke="var(--text-body)" strokeWidth="1.6" strokeLinecap="round"/></svg>
    <span style={{width:42,height:42,borderRadius:'50%',flex:'none',
      /* Source-mandated: the assistant orb is a dark iridescent violet sphere in
         scene-home.png. It is deliberately NOT rebranded — it reads as a rendered
         object sitting on the glass, not as UI chrome. */
      background:'radial-gradient(circle at 34% 30%,#6E4BD8 0%,#2A1560 42%,#08040F 74%)',
      boxShadow:'0 0 14px rgba(140,90,230,.55), inset 0 0 10px rgba(255,255,255,.25)'}}/>
  </GlassSurface>;
}
Object.assign(window,{Phone,HomeIndicator,OrbWidget,IMG});
