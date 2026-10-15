"use strict";
const el=id=>document.getElementById(id),escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let data,map,countries,regions,chosen=null;
const countryCodes=p=>p.regions.flatMap(k=>data.regions[k].countries);
function render(){
 let papers=data.papers;
 if(chosen?.type==='country')papers=papers.filter(p=>countryCodes(p).includes(chosen.id)||p.kind==='global');
 if(chosen?.type==='region')papers=papers.filter(p=>p.regions.includes(chosen.id)||p.kind==='global');
 el('area').textContent=chosen?.name||'All papers';
 el('count').textContent=papers.length+' papers'+(chosen?' (including global studies)':'');
 el('papers').innerHTML=papers.map(p=>'<article class="paper"><div>#'+p.id+' · '+p.year+' · '+escape(p.author)+'</div><strong>'+escape(p.title)+'</strong><div>'+escape(p.kind==='global'?'Global study — local sample availability may vary':p.regions.length?p.regions.map(k=>data.regions[k].name).join(' / '):p.originalScope)+'</div>'+(['scene','synthetic','unknown','distributed'].includes(p.kind)?'<div>'+escape({scene:'Scene labels, not pixel labels',synthetic:'Synthetic training data',unknown:'Study location unclear',distributed:'Sample coordinates not plotted'}[p.kind])+'</div>':'')+'<a target="_blank" rel="noopener" href="'+escape(p.pdf)+'">Paper PDF</a></article>').join('')||'<p>No related papers in this collection.</p>';
 countries.setStyle(f=>({color:chosen?.type==='country'&&chosen.id===f.properties.code?'#b97516':'#a9b8bd',weight:chosen?.type==='country'&&chosen.id===f.properties.code?2:.6,fillColor:chosen?.type==='country'&&chosen.id===f.properties.code?'#f3ca80':data.papers.some(p=>countryCodes(p).includes(f.properties.code))?'#c7dce5':'#f4f4ee',fillOpacity:.8}));
 regions.eachLayer(l=>{const active=chosen?.type==='region'&&chosen.id===l.areaKey;l.setStyle({color:active?'#b97516':'#427b94',weight:active?3:1.3,fillColor:active?'#f3ca80':'#427b94',fillOpacity:active?.25:l.isPoint?.8:.04});});
}
Promise.all([fetch('data.json').then(r=>r.json()),fetch('countries.geojson').then(r=>r.json())]).then(([d,w])=>{
 data=d;map=L.map('map',{minZoom:1,maxZoom:13,zoomSnap:.5}).setView([22,10],1.5);
 map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/">Natural Earth</a>');
 countries=L.geoJSON(w,{onEachFeature:(f,l)=>{l.bindTooltip(f.properties.name);l.on('click',()=>{chosen={type:'country',id:f.properties.code,name:f.properties.name};render();el('papers').scrollTop=0;});}}).addTo(map);
 regions=L.featureGroup().addTo(map);
 for(const[k,r]of Object.entries(data.regions)){
 const shapes=[];if(r.bbox){const[a,b,c,d]=r.bbox;shapes.push(L.rectangle([[b,a],[d,c]],{dashArray:'5 5',bubblingMouseEvents:false}));}
 for(const[lon,lat]of r.points){const l=L.circleMarker([lat,lon],{radius:5,bubblingMouseEvents:false});l.isPoint=true;shapes.push(l);}
 for(const l of shapes){l.areaKey=k;l.addTo(regions).bindTooltip(r.name);l.on('click',()=>{chosen={type:'region',id:k,name:r.name};render();el('papers').scrollTop=0;});}
 }
 el('reset').onclick=()=>{chosen=null;render();map.setView([22,10],1.5);el('papers').scrollTop=0;};render();
}).catch(()=>{el('count').textContent='Could not load the map. Please refresh.';});
