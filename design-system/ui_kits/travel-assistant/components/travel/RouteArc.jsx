import React from 'react';
export function RouteArc({width=150,height=34,duration,style,...rest}){
  return React.createElement('div',{style:{position:'relative',width,height,...style},...rest},
    React.createElement('svg',{width,height,viewBox:`0 0 ${width} ${height}`,style:{display:'block'}},
      React.createElement('path',{d:`M 4 ${height-8} Q ${width/2} -2 ${width-4} ${height-8}`,
        fill:'none',stroke:'var(--text-faint)',strokeWidth:1,strokeDasharray:'3 4',strokeLinecap:'round'}),
      React.createElement('circle',{cx:4,cy:height-8,r:2.6,fill:'var(--text-body)'}),
      React.createElement('circle',{cx:width-4,cy:height-8,r:2.6,fill:'none',stroke:'var(--text-faint)',strokeWidth:1.2})),
    duration?React.createElement('span',{style:{position:'absolute',bottom:-4,left:'50%',transform:'translateX(-50%)',
      font:'var(--type-overline)',fontWeight:'var(--fw-regular)',letterSpacing:0,color:'var(--text-dim)',whiteSpace:'nowrap'}},duration):null);
}
