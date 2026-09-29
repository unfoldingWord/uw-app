const {DotRing,Filament,GlassButton,GlassChip,GlassIconButton,GlassInput,GlassSurface,Icon,MapCanvas,NightActionBar,RouteList,SpotHero,AuroraField,Avatar,CategoryTile,DestinationCard,FlightCard,RouteArc,StatusBar,SuggestionPill,WeatherPill} = window.GenerativeGlassDesignSystem_830e44 || {};
const ROWS=[['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l']];
function Key({children,wide,dark,flex}){
  return <span style={{flex:flex||1,minWidth:0,height:42,display:'grid',placeItems:'center',borderRadius:'var(--r-key)',
    background:dark?'rgba(166,181,190,.85)':'var(--paper-000)',color:'var(--text-title)',
    font:'var(--fw-regular) 20px/1 var(--font-core)',boxShadow:'0 1px 0 rgba(1,66,99,.26)'}}>{children}</span>;
}
function Keyboard(){
  return <div style={{background:'rgba(202,216,222,.72)',backdropFilter:'blur(var(--blur-strong))',padding:'8px 3px 34px',display:'grid',gap:9}}>
    {ROWS.map((r,i)=><div key={i} style={{display:'flex',gap:5,padding:i?'0 18px':'0 3px'}}>{r.map(k=><Key key={k}>{k}</Key>)}</div>)}
    <div style={{display:'flex',gap:5,padding:'0 3px'}}>
      <Key dark flex={1.4}><Icon name="shift" size={18}/></Key>
      {['z','x','c','v','b','n','m'].map(k=><Key key={k}>{k}</Key>)}
      <Key dark flex={1.4}><Icon name="delete" size={18}/></Key>
    </div>
    <div style={{display:'flex',gap:5,padding:'0 3px'}}>
      <Key dark flex={1.6}><span style={{font:'var(--fw-regular) 14px/1 var(--font-core)'}}>ABC</span></Key>
      <Key flex={5}><span style={{font:'var(--fw-regular) 14px/1 var(--font-core)'}}>space</span></Key>
      <Key dark flex={2}><span style={{font:'var(--fw-regular) 14px/1 var(--font-core)'}}>return</span></Key>
    </div>
  </div>;
}
function ChatScreen({onSend}){
  const [v,setV]=React.useState('Best places in Tokyo');
  return <AuroraField intensity={.5} style={{width:'100%',height:'100%'}}>
    <StatusBar/>
    <div style={{padding:'8px var(--gutter-screen) 0',opacity:.5,transform:'scale(.86)',transformOrigin:'top center'}}>
      <FlightCard compact dep={{time:'22:30',code:'JFK',city:'New York'}} arr={{time:'06:20',code:'HND',city:'Tokyo'}} duration="8 h 10m"/>
    </div>
    <div style={{position:'absolute',top:300,left:0,right:0,textAlign:'center',padding:'0 34px'}}>
      <p style={{margin:0,font:'var(--fw-medium) 19px/1.35 var(--font-core)',letterSpacing:'var(--ls-title)',color:'var(--text-muted)'}}>
        <span style={{color:'var(--text-title)',fontWeight:'var(--fw-semibold)'}}>Amelia,</span> you just landed in Tokyo. What&rsquo;s first?</p>
      <DotRing size={150} dots={22} style={{margin:'18px auto 0',opacity:.5}}/>
    </div>
    <div style={{position:'absolute',left:0,right:0,bottom:0}}>
      <div style={{display:'flex',alignItems:'center',gap:'var(--sp-6)',padding:'0 var(--gutter-screen) 14px'}}>
        <GlassIconButton label="Attach" size={46}><Icon name="plus" size={20} color="var(--text-muted)"/></GlassIconButton>
        <input value={v} onChange={e=>setV(e.target.value)} style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',
          font:'var(--type-body)',fontSize:16,color:'var(--text-title)'}}/>
        <GlassIconButton label="Send" size={54} tone="dark" onClick={onSend}><Icon name="chevronRight" size={22}/></GlassIconButton>
      </div>
      <Keyboard/>
    </div>
  </AuroraField>;
}
Object.assign(window,{ChatScreen,Keyboard});
