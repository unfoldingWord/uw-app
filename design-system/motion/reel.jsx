/* Motion reel — the six-beat flow from the source frames, rendered as ONE
   continuous composition. Every layer below is mounted the whole time; a beat
   is just motion whose start and end straddle a cue. Choreography is keyed to
   T (authored seconds) so the host timeline can retime any section. */
/* Read engine + design-system exports off window: every text/babel script in the
   page shares one global scope, so top-level names must not collide. */
const {useComposition:useComp,Captions:Cap,Easing:E,animate:anim,interpolate:lerp,clamp:cl} = window;
const RDS = window.GenerativeGlassDesignSystem_830e44;
const {AuroraField,StatusBar,WeatherPill,Avatar,FlightCard,GlassInput,GlassIconButton,Icon,
  GlassChip,GlassSurface,Filament,DotRing,DestinationCard,CategoryTile,SpotHero,MapCanvas,RouteList} = RDS;

const IMG='../assets/img/';
const PW=390, PH=844;

/* The only three easing wrappers in the piece. */
const MOTION={
  enter:(from,to,start,end)=>anim({from,to,start,end,ease:E.easeOutQuart}),
  swell:(from,to,start,end)=>anim({from,to,start,end,ease:E.easeOutBack}),
  draw: (from,to,start,end)=>anim({from,to,start,end,ease:E.easeInOutCubic})
};
const blurPx=v=>`blur(${Math.max(0,v).toFixed(2)}px)`;

/* Keyboard key — same construction as the travel kit's ChatScreen. */
function Key({children,dark,flex}){
  return <span style={{flex:flex||1,minWidth:0,height:42,display:'grid',placeItems:'center',
    borderRadius:'var(--r-key)',background:dark?'rgba(166,181,190,.85)':'var(--paper-000)',
    color:'var(--text-title)',font:'var(--fw-regular) 20px/1 var(--font-core)',
    boxShadow:'0 1px 0 rgba(1,66,99,.26)'}}>{children}</span>;
}

/* Phone shell — the whole piece happens inside it. */
function Phone({children,frame}){
  return <div style={{width:PW,height:PH,borderRadius:54,padding:5,flex:'none',position:'relative',
    background:frame,boxShadow:'0 2px 6px rgba(1,66,99,.14), 0 30px 70px rgba(1,66,99,.24), 0 90px 160px rgba(1,66,99,.18)'}}>
    <div style={{width:'100%',height:'100%',borderRadius:46,overflow:'hidden',position:'relative',background:'#F4FAFB'}}>
      {children}
    </div>
  </div>;
}

function Reel({captions=true}){
  const {T,CUES}=useComp();
  const C=CUES;

  /* ---- camera: never fully still ---- */
  const camScale =
    T<C.Flight  ? MOTION.enter(1.00,1.03,0,C.Flight)(T) :
    T<C.Ask     ? MOTION.enter(1.03,1.16,C.Flight,C.Flight+1.6)(T) :
    T<C.Branch  ? MOTION.enter(1.16,1.08,C.Ask,C.Ask+1.2)(T) :
    T<C.Spot    ? MOTION.enter(1.08,1.00,C.Branch,C.Branch+1.4)(T) :
    T<C.Route   ? MOTION.enter(1.00,1.20,C.Spot,C.Spot+2.4)(T) :
    T<C.Return  ? MOTION.enter(1.20,1.02,C.Route,C.Route+1.6)(T) :
                  MOTION.enter(1.02,1.00,C.Return,C.Return+2.2)(T);
  const camY =
    T<C.Flight ? 0 :
    T<C.Ask    ? MOTION.enter(0,-70,C.Flight,C.Flight+1.6)(T) :
    T<C.Branch ? MOTION.enter(-70,-30,C.Ask,C.Ask+1.2)(T) :
    T<C.Spot   ? MOTION.enter(-30,0,C.Branch,C.Branch+1.4)(T) :
    T<C.Route  ? MOTION.enter(0,10,C.Spot,C.Spot+2.4)(T) : 0;

  /* ---- ambient: the aurora breathes the whole time ---- */
  const drift=Math.sin(T*0.5)*10, drift2=Math.cos(T*0.38)*8;
  const night=cl(lerp([C.Route-0.4,C.Route+0.7],[0,1],E.easeInOutQuad)(T),0,1)
             *cl(lerp([C.Return+0.2,C.Return+1.4],[1,0],E.easeInOutQuad)(T),0,1);

  /* ---- header widgets ---- */
  const headIn=MOTION.enter(0,1,0.25,1.15)(T);
  const headOut=cl(lerp([C.Spot-0.2,C.Spot+0.5],[1,0],E.easeInOutQuad)(T),0,1);
  const headLive=cl(lerp([C.Return+0.1,C.Return+0.9],[1,0],E.easeInOutQuad)(T),0,1);
  const headOp=headIn*headOut*Math.max(headOut,0)*headLive;
  const float=Math.sin(T*1.05)*3;

  /* ---- greeting ---- */
  const grIn=MOTION.enter(0,1,0.7,1.7)(T);
  const grOut=cl(lerp([C.Ask-0.5,C.Ask+0.3],[1,0],E.easeInOutQuad)(T),0,1);
  const grY=MOTION.enter(18,0,0.7,1.7)(T);

  /* ---- flight card: rises, expands, then recedes behind the chat ---- */
  const fcIn=MOTION.enter(0,1,2.0,3.0)(T);
  const fcRise=MOTION.swell(26,0,2.0,3.2)(T);
  const fcBlur=MOTION.enter(9,0,2.0,3.1)(T);
  const fcRecede=cl(lerp([C.Ask-0.2,C.Ask+0.9],[0,1],E.easeInOutQuad)(T),0,1);
  const fcGone=cl(lerp([C.Branch+0.2,C.Branch+1.0],[1,0],E.easeInOutQuad)(T),0,1);
  const fcScale=MOTION.enter(0.97,1,2.0,3.2)(T)-fcRecede*0.07;
  const fcY=fcRise + MOTION.enter(0,-14,C.Flight,C.Flight+1.2)(T) - fcRecede*120;

  /* ---- chat ---- */
  const askIn=MOTION.enter(0,1,C.Ask+0.7,C.Ask+1.5)(T);
  const askOut=cl(lerp([C.Branch-0.55,C.Branch+0.15],[1,0],E.easeInOutQuad)(T),0,1);
  const kbY=MOTION.enter(300,0,C.Ask+0.15,C.Ask+1.05)(T)+MOTION.enter(0,300,C.Branch-0.35,C.Branch+0.45)(T);

  /* ---- branch: filament draws, then the card lands, then the tiles fork ---- */
  const fil=MOTION.draw(0,1,C.Branch+1.35,C.Branch+2.15)(T);
  const filOut=cl(lerp([C.Spot-0.45,C.Spot+0.15],[1,0],E.easeInOutQuad)(T),0,1);
  const destIn=MOTION.swell(0,1,C.Branch+0.3,C.Branch+1.2)(T);
  const destOut=cl(lerp([C.Spot-0.45,C.Spot+0.15],[1,0],E.easeInOutQuad)(T),0,1);
  const tile=i=>MOTION.swell(0,1,C.Branch+2.35+i*0.15,C.Branch+3.2+i*0.15)(T);

  /* ---- spot: the chosen tile becomes the whole screen ---- */
  const spot=MOTION.enter(0,1,C.Spot+0.3,C.Spot+1.5)(T);
  const spotOut=cl(lerp([C.Route-0.2,C.Route+0.6],[1,0],E.easeInOutQuad)(T),0,1);

  /* ---- route: the map wipes out from the puck, then the list rises ---- */
  const wipe=MOTION.draw(0,120,C.Route+0.15,C.Route+1.7)(T);
  const listIn=MOTION.swell(0,1,C.Route+1.6,C.Route+2.6)(T);
  const routeOut=cl(lerp([C.Return,C.Return+1.1],[1,0],E.easeInOutQuad)(T),0,1);

  const tone=night>0.5?'night':'light';
  const frame=night>0.5
    ?'linear-gradient(150deg,#3E4E57 0%,#141F27 22%,#4A5C66 48%,#0F1A21 78%,#33434B 100%)'
    :'linear-gradient(150deg,#EFF6F8 0%,#BFD0D8 22%,#E7F0F3 48%,#ADC3CD 78%,#E2EDF0 100%)';

  return <div style={{width:1280,height:720,position:'relative',overflow:'hidden',
    background:'var(--studio-bg)',fontFamily:'var(--font-core)',WebkitFontSmoothing:'antialiased'}}>

    <div style={{position:'absolute',inset:0,background:'var(--aurora-field)',opacity:.55,
      transform:`translate(${drift}px,${drift2}px) scale(1.1)`,filter:'blur(30px)'}}/>

    <div style={{position:'absolute',left:'50%',top:'50%',
      transform:`translate(-50%,-50%) translateY(${camY*0.35}px) scale(${0.735*camScale})`,
      transformOrigin:'50% 50%'}}>
      <Phone frame={frame}>

        {/* light ground */}
        <div style={{position:'absolute',inset:0,opacity:1-night}}>
          <AuroraField style={{position:'absolute',inset:0}}/>
        </div>
        {/* night ground */}
        <div style={{position:'absolute',inset:0,opacity:night,background:'#04161F'}}>
          <MapCanvas style={{position:'absolute',inset:0,
              WebkitMaskImage:`radial-gradient(circle at 52% 47%, #000 ${wipe}%, transparent ${wipe+14}%)`,
              maskImage:`radial-gradient(circle at 52% 47%, #000 ${wipe}%, transparent ${wipe+14}%)`}}
            roads={['M8 12 L58 70','M0 118 L100 56','M52 47 L96 78','M20 150 L70 40','M64 0 L40 160']}
            user={{x:52,y:47}}
            places={[{x:45,y:22,name:'Tokyo\nSkytree'},{x:53,y:57,name:'Senso-ji',accent:true},
                     {x:22,y:66,name:'Ueno Park',muted:true,dot:5},{x:74,y:40,name:'Asakusa',muted:true,dot:5}]}/>
        </div>

        <StatusBar tone={tone}/>

        {/* header widgets */}
        <div style={{position:'absolute',left:18,right:18,top:58,display:'flex',alignItems:'center',
          justifyContent:'space-between',opacity:headOp,transform:`translateY(${float}px)`}}>
          <WeatherPill temp="28°"/>
          <Avatar src={IMG+'avatar-amelia.png'} size={54}/>
        </div>

        {/* greeting */}
        <div style={{position:'absolute',left:18,right:18,top:150,opacity:grIn*grOut,
          transform:`translateY(${grY}px)`}}>
          <div style={{font:'var(--fw-regular) 12px/1.3 var(--font-core)',color:'var(--text-muted)'}}>Wed, Apr 23</div>
          <h1 style={{margin:'6px 0 0',font:'var(--fw-medium) 28px/1.16 var(--font-core)',
            letterSpacing:'-.02em',color:'var(--text-title)'}}>Good morning,<br/>Amelia</h1>
        </div>

        {/* flight card */}
        <div style={{position:'absolute',left:18,right:18,top:352,
          opacity:fcIn*(1-fcRecede*0.55)*fcGone,
          filter:blurPx(fcBlur+fcRecede*6),
          transform:`translateY(${fcY}px) scale(${fcScale})`,transformOrigin:'50% 30%'}}>
          <FlightCard/>
        </div>

        {/* chat line */}
        <div style={{position:'absolute',left:18,right:60,top:300,opacity:askIn*askOut,
          transform:`translateY(${MOTION.enter(14,0,C.Ask+0.7,C.Ask+1.5)(T)}px)`}}>
          <GlassSurface level={2} blur="strong" radius="lg" shadow="card" style={{padding:'14px 16px'}}>
            <div style={{font:'var(--fw-regular) 15px/1.45 var(--font-core)',color:'var(--text-body)'}}>
              Two days in Tokyo — here is where to start.</div>
          </GlassSurface>
        </div>

        {/* filament + destination card + category tiles */}
        <div style={{position:'absolute',left:0,right:0,top:534,display:'grid',justifyItems:'center',
          opacity:filOut}}>
          <Filament height={56} width={150} branch={fil>0.55}
            style={{opacity:fil,clipPath:`inset(0 0 ${(1-fil)*100}% 0)`}}/>
        </div>

        <div style={{position:'absolute',left:'50%',top:300,transform:
          `translateX(-50%) translateY(${(1-destIn)*30}px) scale(${0.9+destIn*0.1})`,
          opacity:destIn*destOut}}>
          <DestinationCard image={IMG+'fuji-blossom.png'} title={<>Best places<br/>in Tokyo</>}
            subtitle="A relaxed route for your first day" width={200} height={230}/>
        </div>

        <div style={{position:'absolute',left:18,right:18,top:596,display:'flex',gap:12,justifyContent:'center'}}>
          {[['nature-tokyo.png','Nature',<>Nature<br/>around Tokyo</>],
            ['tokyo-night.png','Nightlife',<>Tokyo<br/>at night</>]].map((t,i)=>
            <div key={i} style={{opacity:tile(i)*destOut,
              transform:`translateY(${(1-tile(i))*26}px) scale(${0.88+tile(i)*0.12})`}}>
              <CategoryTile image={IMG+t[0]} label={t[1]} title={t[2]} size={118}/>
            </div>)}
        </div>

        {/* spot hero — the chosen tile grown to full bleed */}
        <div style={{position:'absolute',left:0,right:0,top:0,bottom:0,opacity:spot*spotOut,
          transform:`scale(${0.82+spot*0.18})`,transformOrigin:'62% 78%'}}>
          <SpotHero image={IMG+'tokyo-night.png'} eyebrow="View spot" title="Tokyo at night"
            body="Neon streets, quiet temples, and the city that never fully sleeps."
            style={{position:'absolute',inset:0}}/>
        </div>

        {/* route list */}
        <div style={{position:'absolute',left:18,right:18,bottom:96,opacity:listIn*routeOut,
          transform:`translateY(${(1-listIn)*28}px)`}}>
          <RouteList items={[{name:'Senso-ji Temple',time:'30 min',active:true},
            {name:'Nakamise Street',time:'45 min'},{name:'Shibuya Crossing',time:'1h 20m'}]}/>
        </div>

        {/* composer + keyboard */}
        <div style={{position:'absolute',left:18,right:18,bottom:96,display:'flex',gap:8,
          opacity:MOTION.enter(0,1,0.15,0.95)(T)*(1-night)*(1-fcRecede*0.2)*headLive*cl(lerp([C.Branch+1.4,C.Branch+2.2],[1,0],E.easeInOutQuad)(T),0,1)}}>
          <GlassInput placeholder="Type a message" style={{flex:1}}/>
          <GlassIconButton size={58} label="Voice"><Icon name="mic" size={22} color="var(--text-muted)"/></GlassIconButton>
        </div>
        {/* Keyboard — the same four-row build as the travel kit's ChatScreen:
            two letter rows, a shift/delete row, then the space row. */}
        <div style={{position:'absolute',left:0,right:0,bottom:0,
          transform:`translateY(${kbY}px)`,background:'rgba(202,216,222,.72)',
          backdropFilter:'blur(var(--blur-strong))',padding:'8px 3px 34px',display:'grid',gap:9,alignContent:'start'}}>
          {[['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l']].map((row,i)=>
            <div key={i} style={{display:'flex',gap:5,padding:i?'0 18px':'0 3px'}}>
              {row.map(k=><Key key={k}>{k}</Key>)}
            </div>)}
          <div style={{display:'flex',gap:5,padding:'0 3px'}}>
            <Key dark flex={1.4}><Icon name="shift" size={18}/></Key>
            {['z','x','c','v','b','n','m'].map(k=><Key key={k}>{k}</Key>)}
            <Key dark flex={1.4}><Icon name="delete" size={18}/></Key>
          </div>
          <div style={{display:'flex',gap:5,padding:'0 3px'}}>
            <Key dark flex={1.6}><span style={{fontSize:14}}>ABC</span></Key>
            <Key flex={5}><span style={{fontSize:14}}>space</span></Key>
            <Key dark flex={2}><span style={{fontSize:14}}>return</span></Key>
          </div>
        </div>

        {/* home indicator */}
        <div style={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',width:134,height:5,
          borderRadius:3,background:night>0.5?'rgba(255,255,255,.5)':'rgba(1,66,99,.30)'}}/>
      </Phone>
    </div>

    {captions?<Cap style={{
      /* Narration sits in the left margin beside the device — the stage is 1280
         wide and the phone only ~290, so there is a clear column. Ocean ink on
         the light studio backdrop instead of the engine's white-on-nothing. */
      left:72,right:'auto',bottom:'auto',top:'50%',transform:'translateY(-50%)',
      width:330,textAlign:'left',color:'var(--ink-900)',textShadow:'none',
      font:'500 27px/1.35 var(--font-brand)',letterSpacing:'-.01em',textWrap:'pretty'
    }} items={[
      {at:1.4,until:3.6,text:'Elements rise into place — nothing simply appears'},
      {at:C.Ask+0.9,until:C.Branch+0.1,text:'What leaves softens before what arrives lands'},
      {at:C.Branch+0.4,until:C.Branch+3.2,text:'The answer lands, then flows down into what it opens'},
      {at:C.Route+0.3,until:C.Route+2.2,text:'Screens dissolve and reform — they never cut'}
    ]}/>:null}
  </div>;
}
Object.assign(window,{Reel});
