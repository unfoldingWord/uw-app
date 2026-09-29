Dark map background for the route view. Roads are hairlines, labels are 7px uppercase, and nothing is coloured except the destination pin.

```jsx
<MapCanvas roads={['M10 20 L60 70','M0 120 L100 60']}
  places={[{x:45,y:22,name:'Tokyo\nSkytree'},{x:53,y:57,name:'Senso-ji Temple',accent:true}]}
  style={{width:390,height:560}} />
```
