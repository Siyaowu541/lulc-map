(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasStats=api;})(typeof window!=='undefined'?window:this,function(){
 'use strict';
 function zoomLevel(z){return z<3?'continent':z<5?'country':z<8?'admin':'local';}
 function matches(u,c){return (!c.continent||u.continent===c.continent)&&(!c.country||u.country===c.country)&&(!c.admin||u.admin===c.admin)&&(!c.local||u.local===c.local)&&(!c.countrywide||!u.admin)&&(!c.regionwide||!u.country);}
 function contains(p,c){return (p.geoUnits||[]).some(u=>matches(u,c));}
 function breakdown(papers,level,context={}){
  const totals=new Map();let denominator=0;
  for(const p of papers)for(const u of p.geoUnits||[]){
   if(!matches(u,context))continue;
   let key=level==='continent'?u.continent:level==='country'?(u.country||'__regionwide'):level==='admin'?(u.admin||'__countrywide'):(u.local||'__regionwide');
   const value=u.weight;denominator+=value;totals.set(key,(totals.get(key)||0)+value);
  }
  return {denominator,slices:[...totals].map(([key,value])=>({key,value,percentage:denominator?value/denominator*100:0})).sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key))};
 }
 return {zoomLevel,matches,contains,breakdown};
});
