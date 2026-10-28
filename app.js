"use strict";
const el=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const core=CoverageCore;
let data,footprints,map,countries,coverage,adminData,adminLayer,chosen=null,active=[],activeFeatures=[],renderedLayers=[],year=null;
let statsFocus={continent:'Asia',country:'CHN',admin:null},statsTimer,statsPinned=false;
const initial=Number(new URLSearchParams(location.search).get('year'));if(new URLSearchParams(location.search).has('year')&&Number.isInteger(initial)&&initial>=2000&&initial<=2026)year=initial;
if(new URLSearchParams(location.search).get('year')==='all')year=null;
const countryCodes=p=>p.regions.flatMap(k=>data.regions[k]?.countries||[]);
const precisionLabel={footprint:'Image study area',tile:'Published study tiles',boundary:'Named regional boundary',study:'Approximate study region',digitized:'Approximate outline from paper figure'};
function areaDetail(q){if(q.precision==='footprint'){const n=q.detail.match(/^(\d+) aerial patches/),dates=q.detail.match(/Acquisition dates ([\d-]+) to ([\d-]+)/);return `${n?n[1]+' aerial image patches. ':''}${dates?'Acquired '+dates[1]+(dates[1]===dates[2]?'':' to '+dates[2])+'. ':''}Image bounds reconstructed from official coordinates.`;}return precisionLabel[q.precision]+'. '+q.detail;}
function setYear(value){year=value;chosen=null;el('year-range').value=value??2020;el('year-select').value=value??'all';el('all-years').classList.toggle('active',value===null);el('previous').disabled=value===null||value===2000;el('next').disabled=value===null||value===2026;const u=new URL(location.href);u.searchParams.set('year',value??'all');history.replaceState(null,'',u);render();el('papers').scrollTop=0;}
function setChosen(value){chosen=value;renderList();renderCountryStyles();highlightFeatures();renderStatistics();el('papers').scrollTop=0;}
function worldView(){map.stop();map.fitBounds([[-60,-180],[80,180]],{padding:[12,24],maxZoom:1.5,animate:false});}
function matchingList(){if(!chosen)return active;if(chosen.type==='geo')return active.filter(p=>AtlasStats.contains(p,chosen.context));if(chosen.type==='feature')return active.filter(p=>chosen.paperIds.includes(p.id));if(chosen.type==='globals')return active.filter(p=>p.globalMap);if(chosen.type==='country')return active.filter(p=>countryCodes(p).includes(chosen.id)||p.globalMap);return active;}
function renderList(){
 const papers=matchingList();el('area').textContent=chosen?.name||'Worldwide';el('clear-area').hidden=!chosen;
 el('count').textContent=year===null?'Study areas · all result years':`Study areas with results for ${year}`;
 el('selection-detail').hidden=!chosen?.detail;el('selection-detail').textContent=chosen?.detail||'';
 el('papers').innerHTML=papers.map(p=>{
  const paperShapes=activeFeatures.filter(f=>f.properties.paperIds.includes(p.id)),canLocate=paperShapes.length>0;
  const boundaryNote=paperShapes.some(f=>['study','digitized'].includes(f.properties.precision))?'Map outline: approximate study region. Click the area for boundary details.':'';
  const quality=p.dateQuality==='unknown'?'Result years not reported':p.dateQuality==='mixed'?'Mixed-year inputs; not an annual sequence':p.dateQuality==='approximate'?'Approximate baseline year':'';
 const missing=(!p.globalMap&&!canLocate)?'Study area reviewed; a usable geographic boundary has not been recovered.':'';
  return `<article class="paper" data-paper-id="${p.id}"><div class="paper-top"><span class="paper-id">PAPER ${String(p.id).padStart(2,'0')}</span><span class="badge study-badge">${p.collection?'New batch':'Land-cover study'}</span></div><h3>${esc(p.title)}</h3><div class="byline">${esc(p.author)} · Published ${p.year}</div><div class="paper-meta"><span>Results: ${esc(p.resultYears)}</span><span>${esc(p.resolution)}</span></div><p class="paper-scope">${esc(p.scope)}</p><p class="paper-scope">${esc(p.frequency)}</p>${[quality,p.coverageNote,boundaryNote,missing].filter(Boolean).map(t=>`<p class="paper-note">${esc(t)}</p>`).join('')}<div class="paper-actions"><a target="_blank" rel="noopener" href="${esc(p.pdf)}">Read paper ↗</a>${canLocate?`<button class="locate-paper" data-locate="${p.id}">Locate on map →</button>`:''}</div></article>`;
 }).join('')||'<div class="empty-list">No mapped study results in this collection match this selection.<br>Try another year, enable mixed-year results, or choose All years. An empty map does not mean the area has never been studied.</div>';
 el('papers').querySelectorAll('[data-locate]').forEach(b=>b.onclick=()=>locatePaper(Number(b.dataset.locate)));
}
function renderCountryStyles(){const globals=active.some(p=>p.globalMap);countries.setStyle(f=>({color:chosen?.type==='country'&&chosen.id===f.properties.code?'#ffe59a':'#d9e3dc',weight:chosen?.type==='country'&&chosen.id===f.properties.code?2:.45,fillColor:chosen?.type==='country'&&chosen.id===f.properties.code?'#ffe59a':'#a7bed4',fillOpacity:chosen?.type==='country'&&chosen.id===f.properties.code?.18:globals?.035:0}));}
function locatePaper(id){const features=activeFeatures.filter(f=>f.properties.paperIds.includes(id));const layer=L.geoJSON(features);if(layer.getBounds().isValid())map.fitBounds(layer.getBounds().pad(.12),{maxZoom:11,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});setChosen({type:'feature',paperIds:[id],name:`Paper ${id}`,detail:[data.papers.find(p=>p.id===id).scope,...new Set(features.map(f=>areaDetail(f.properties)))].join(' ')});}
function addCoverage(){
 coverage.clearLayers();renderedLayers=[];
 for(const f of activeFeatures){
 const papers=core.featurePapers(f,active,year),q=f.properties,approx=['study','digitized'].includes(q.precision),colour=approx?'#e7a44b':'#42d6a0';
  const broad=papers.some(p=>['country','continent'].includes(p.studyScale));
  const style={color:colour,weight:approx?1.5:1.2,fillColor:colour,fillOpacity:broad?.035:approx?.1:q.precision==='tile'?.12:.17,dashArray:approx?'6 4':null,bubblingMouseEvents:false};
  const shape=L.geoJSON(f,{style,pointToLayer:(_f,ll)=>L.circleMarker(ll,{...style,radius:6,weight:1.5,fillOpacity:.95,color:'#fff',className:'map-point'}),onEachFeature:(_f,l)=>{
   l.bindTooltip(`<strong>${esc(q.name)}</strong><small>${esc(precisionLabel[q.precision])}</small><small>${year!==null?'Study results for '+year:q.years?'Result / reference years: '+q.years.join(', '):'Paper study area'}</small>`);
   renderedLayers.push({layer:l,properties:q,style:{...style,...(q.precision==='locator'?{fillOpacity:.95,color:'#fff',weight:1.5}:{} )}});
   l.on('click',e=>{L.DomEvent.stopPropagation(e);focusAt(e.latlng);const hits=activeFeatures.filter(x=>core.pointInGeometry([e.latlng.lng,e.latlng.lat],x.geometry)),ids=[...new Set([...hits.flatMap(x=>core.featurePapers(x,active,year).map(p=>p.id)),...active.filter(p=>p.globalMap).map(p=>p.id)])];setChosen({type:'feature',key:q.key,name:q.name,paperIds:ids.length?ids:papers.map(p=>p.id),detail:areaDetail(q)});if(l.getBounds&&map.getZoom()<7)map.fitBounds(l.getBounds().pad(.3),{maxZoom:10});});
  }});shape.addTo(coverage);
 }
}
function highlightFeatures(){for(const {layer,properties:q,style}of renderedLayers){const selected=chosen?.type==='feature'&&(chosen.key?chosen.key===q.key:q.paperIds.some(id=>chosen.paperIds.includes(id)));layer.setStyle(selected?{...style,color:'#ac6c16',fillColor:'#f5d074',fillOpacity:q.precision==='locator'?1:.4,weight:2.5}:style);if(selected)layer.bringToFront();}}
function render(){
 active=core.activePapers(data.papers,year,el('mixed-years').checked);
 activeFeatures=footprints.features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)&&core.featurePapers(f,active,year).length);
 el('map-year').textContent=year===null?'All years':year;el('map-matches').textContent=' · Study areas';
 const unknown=data.papers.filter(p=>!p.years.length).length,mixed=data.papers.filter(p=>p.dateQuality==='mixed'&&p.years.includes(year)).length;
 el('year-context').textContent=year===null?'All study-result years; publication dates do not filter the map.':'Showing results for '+year+', including papers published later. Unknown result years appear under All years.';
 const globals=active.filter(p=>p.globalMap),n=core.globalProductCount(active);
 el('global-summary').innerHTML=n?'<button id="show-globals">Global mapping studies<span>Pale blue land shows global study scope.</span></button>':'';
 if(n)el('show-globals').onclick=()=>setChosen({type:'globals',name:'Global mapping studies',detail:'Global research domains include thematic mapping, such as mangroves and urban land. Pale blue does not imply reference samples at every location. Two GLC_FCS30D papers describe one product.'});
 el('map-empty').hidden=activeFeatures.length>0||n>0;
 const counts=Array.from({length:27},(_,i)=>core.activePapers(data.papers,2000+i,el('mixed-years').checked).length),max=Math.max(...counts,1);
 el('year-bars').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',year===Number(b.dataset.year));b.classList.toggle('zero',counts[i]===0);b.style.height=Math.max(3,counts[i]/max*31)+'px';b.setAttribute('aria-label',String(2000+i));b.title=String(2000+i);});
 addCoverage();renderCountryStyles();renderList();renderStatistics();
}
function setupTimeline(){
 el('year-select').innerHTML='<option value="all">All years</option>'+Array.from({length:27},(_,i)=>`<option value="${2000+i}">${2000+i}</option>`).join('');
 const counts=Array.from({length:27},(_,i)=>core.activePapers(data.papers,2000+i,false).length),max=Math.max(...counts,1);
 el('year-bars').innerHTML=counts.map((n,i)=>`<button data-year="${2000+i}" class="${n?'':'zero'}" style="height:${Math.max(3,n/max*31)}px" title="${2000+i}" aria-label="${2000+i}"></button>`).join('');
 el('year-bars').querySelectorAll('button').forEach(b=>b.onclick=()=>setYear(Number(b.dataset.year)));
 el('year-range').oninput=e=>setYear(Number(e.target.value));el('year-select').onchange=e=>setYear(e.target.value==='all'?null:Number(e.target.value));
 el('previous').onclick=()=>setYear(Math.max(2000,year-1));el('next').onclick=()=>setYear(Math.min(2026,year+1));el('all-years').onclick=()=>setYear(null);
 el('mixed-years').onchange=()=>{chosen=null;render();};el('clear-area').onclick=()=>setChosen(null);el('reset-map').onclick=()=>{setChosen(null);worldView();};
}
const pieColours=['#287c8e','#dba34f','#71874c','#9b78a6','#d47867','#6c91bb','#a4aaa5'];
function geographyLabel(level,key){if(key==='__regionwide')return 'Region-wide / unspecified';if(key==='__countrywide')return 'Country-wide / unspecified';if(level==='country')return data.countryMeta[key]?.name||key;if(level==='admin')return adminData.features.find(f=>f.properties.id===key)?.properties.name||key;if(level==='local')return footprints.features.find(f=>f.properties.key===key)?.properties.name||key;return key;}
function focusAt(ll){
 const point=[((ll.lng+180)%360+360)%360-180,ll.lat];
 const a=adminData.features.find(f=>{const b=f._bounds;return b&&point[0]>=b[0]&&point[0]<=b[2]&&point[1]>=b[1]&&point[1]<=b[3]&&core.pointInGeometry(point,f.geometry);});
 if(a){statsFocus={continent:a.properties.continent,country:a.properties.country,admin:a.properties.id};return;}
 const c=countries.toGeoJSON().features.find(f=>core.pointInGeometry(point,f.geometry));
 if(c&&data.countryMeta[c.properties.code])statsFocus={continent:data.countryMeta[c.properties.code].continent,country:c.properties.code,admin:null};
}
function drawAdminContext(){
 if(!adminLayer||!adminData)return;adminLayer.clearLayers();if(map.getZoom()<5)return;
 adminLayer.addData(adminData.features.filter(f=>f.properties.country===statsFocus.country));
}
function fitGeography(level,key,context){
 let features=[],ctx={...context};statsPinned=true;
 if(level==='continent'){
  if(key==='Global'){setChosen({type:'globals',name:'Global studies'});worldView();return;}
  if(key==='Unlocated / distributed'){setChosen({type:'geo',name:key,context:{continent:key},detail:'Geographic allocation is unavailable; these papers remain in the collection.'});return;}
  ctx={continent:key};statsFocus={continent:key,country:null,admin:null};features=countries.toGeoJSON().features.filter(f=>data.countryMeta[f.properties.code]?.continent===key);
 }else if(level==='country'){
  if(key==='__regionwide'){setChosen({type:'geo',name:'Region-wide studies',context:{...context,regionwide:true}});return;}if(key.startsWith('__'))return;ctx={continent:context.continent,country:key};statsFocus={...ctx,admin:null};features=adminData.features.filter(f=>f.properties.country===key);
 }else if(level==='admin'){
  if(key.startsWith('__')){setChosen({type:'geo',name:geographyLabel(level,key),context:{...context,countrywide:true},detail:'Country-wide studies are kept separate from province-specific studies.'});return;}
  ctx={...context,admin:key};statsFocus={...ctx};features=adminData.features.filter(f=>f.properties.id===key);
 }else{
  if(key.startsWith('__'))return;ctx={...context,local:key};features=footprints.features.filter(f=>f.properties.key===key);
 }
 const layer=L.geoJSON(features),bounds=layer.getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(.08),{maxZoom:level==='continent'?3.5:level==='country'?5.5:level==='admin'?8:11,animate:false});
 setChosen({type:'geo',name:geographyLabel(level,key),context:ctx,detail:'Paper list for this geography. Charts count the whole year-filtered collection, not just the current map viewport.'});drawAdminContext();renderStatistics();
}
function pieChart(title,level,context){
 const result=AtlasStats.breakdown(active,level,context),all=result.slices,keep=all.filter((s,i)=>i<5||s.percentage>=3).slice(0,6),rest=all.filter(s=>!keep.includes(s));
 if(rest.length)keep.push({key:'__other',value:rest.reduce((a,s)=>a+s.value,0),percentage:rest.reduce((a,s)=>a+s.percentage,0),others:rest});
 let angle=-Math.PI/2;
 const arcs=keep.map((s,i)=>{
  const start=angle;angle+=s.percentage/100*Math.PI*2;const x1=60+49*Math.cos(start),y1=60+49*Math.sin(start),x2=60+49*Math.cos(angle),y2=60+49*Math.sin(angle),label=s.key==='__other'?'Other regions':geographyLabel(level,s.key),tooltip=`${label}: ${s.percentage.toFixed(1)}% (${Number(s.value.toFixed(2))} paper-equivalents)`;
  return s.percentage>99.999?`<circle cx="60" cy="60" r="49" fill="${pieColours[i]}"><title>${esc(tooltip)}</title></circle>`:`<path d="M60 60 L${x1} ${y1} A49 49 0 ${s.percentage>50?1:0} 1 ${x2} ${y2} Z" fill="${pieColours[i]}" stroke="#fff" stroke-width="1"><title>${esc(tooltip)}</title></path>`;
 }).join('');
 const labels=keep.map((s,i)=>{const text=s.key==='__other'?`Other (${rest.length})`:geographyLabel(level,s.key);return `<li><button data-slice="${i}" ${s.key==='__other'?'aria-expanded="false"':''}><i style="background:${pieColours[i]}"></i><span>${esc(text)}</span><b>${s.percentage.toFixed(1)}%</b></button></li>`;}).join('');
 const element=document.createElement('article');element.className='stat-card';element.innerHTML=`<h3>${esc(title)}</h3><p>${Number(result.denominator.toFixed(2))} paper-equivalents · ${year??'all years'}</p>${result.denominator?`<div class="pie-layout"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(title)} paper shares">${arcs}</svg><ul>${labels}</ul></div>`:'<div class="no-stat">No geographically indexed papers for this selection.</div>'}`;
 element.querySelectorAll('[data-slice]').forEach(b=>b.onclick=()=>{const s=keep[Number(b.dataset.slice)];if(s.key==='__other'){const ul=b.closest('ul');b.closest('li').remove();for(const t of rest){const li=document.createElement('li');li.innerHTML=`<button><i style="background:#a4aaa5"></i><span>${esc(geographyLabel(level,t.key))}</span><b>${t.percentage.toFixed(1)}%</b></button>`;li.querySelector('button').onclick=()=>fitGeography(level,t.key,context);ul.append(li);}return;}fitGeography(level,s.key,context);});return element;
}
function renderStatistics(){
 if(!data||!map||!adminData)return;const z=map.getZoom(),level=AtlasStats.zoomLevel(z),c=statsFocus.continent||'Asia',code=statsFocus.country||'CHN',country=data.countryMeta[code]?.name||code,admin=statsFocus.admin,adminName=adminData.features.find(f=>f.properties.id===admin)?.properties.name;
 el('stats-level').textContent=`${data.papers.length} papers · ${level==='admin'?'province / state':level} view · ${year??'all study years'}`;
 const cards=el('stats-cards');cards.replaceChildren();
 if(z<5){cards.append(pieChart('World → continents','continent',{}),pieChart(c+' → countries','country',{continent:c}),pieChart(country+' → provinces / states','admin',{country:code}));}
 else{cards.append(pieChart(c+' → countries','country',{continent:c}),pieChart(country+' → provinces / states','admin',{country:code}),pieChart((adminName||country)+' → study regions','local',admin?{country:code,admin}:{country:code}));}
 el('stats-breadcrumbs').innerHTML=`<button data-world>World</button><span>›</span><button data-continent>${esc(c)}</button><span>›</span><button data-country>${esc(country)}</button>${adminName?`<span>›</span><span>${esc(adminName)}</span>`:''}`;
 el('stats-breadcrumbs').querySelector('[data-world]').onclick=()=>{setChosen(null);worldView();};el('stats-breadcrumbs').querySelector('[data-continent]').onclick=()=>fitGeography('continent',c,{});el('stats-breadcrumbs').querySelector('[data-country]').onclick=()=>fitGeography('country',code,{continent:c});
}
Promise.all(['data.json?v=batch50-1','countries.geojson','coverage.geojson?v=batch50-1','admin1.geojson?v=batch50-1'].map(u=>fetch(u).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}))).then(([d,w,g,a])=>{
 data=d;footprints=g;adminData=a;
 for(const f of adminData.features){let minx=180,miny=90,maxx=-180,maxy=-90;function walk(a){if(typeof a[0]==='number'){minx=Math.min(minx,a[0]);miny=Math.min(miny,a[1]);maxx=Math.max(maxx,a[0]);maxy=Math.max(maxy,a[1]);}else a.forEach(walk);}walk(f.geometry.coordinates);f._bounds=[minx,miny,maxx,maxy];}
 map=L.map('map',{minZoom:.5,maxZoom:19,zoomSnap:.5,zoomControl:false,preferCanvas:true}).setView([22,10],1.5);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,noWrap:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
 L.control.zoom({position:'topright'}).addTo(map);L.control.scale({position:'bottomright',imperial:false}).addTo(map);
 map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/">Natural Earth</a> · <a href="https://www.geoboundaries.org/">geoBoundaries</a> · IGN · MOLCA');
 countries=L.geoJSON(w,{onEachFeature:(f,l)=>{l.bindTooltip(esc(f.properties.name));l.on('click',e=>{focusAt(e.latlng);const hits=activeFeatures.filter(x=>core.pointInGeometry([e.latlng.lng,e.latlng.lat],x.geometry)),ids=[...new Set([...hits.flatMap(x=>core.featurePapers(x,active,year).map(p=>p.id)),...active.filter(p=>p.globalMap).map(p=>p.id)])];setChosen({type:'feature',paperIds:ids,name:f.properties.name,detail:ids.length?'Papers with a plotted study area at this location, including global mapping studies.':'No plotted study boundary at this location. Unlocated benchmark studies remain under Clear area.'});});}}).addTo(map);
 adminLayer=L.geoJSON([],{style:{color:'#7a8f88',weight:.6,fillOpacity:0,interactive:false}}).addTo(map);
 coverage=L.featureGroup().addTo(map);setupTimeline();setYear(year);worldView();
 map.on('dragstart',()=>{statsPinned=false;});map.getContainer().addEventListener('wheel',()=>{statsPinned=false;},{passive:true});map.getContainer().addEventListener('dblclick',()=>{statsPinned=false;});
 map.getContainer().querySelectorAll('.leaflet-control-zoom-in,.leaflet-control-zoom-out').forEach(b=>b.addEventListener('click',()=>{statsPinned=false;}));
 map.on('moveend zoomend',()=>{clearTimeout(statsTimer);statsTimer=setTimeout(()=>{if(map.getZoom()>=3&&!statsPinned)focusAt(map.getCenter());renderStatistics();drawAdminContext();},120);});
}).catch(error=>{console.error(error);el('count').textContent='Could not load the collection. Please refresh.';el('year-context').textContent='Map data unavailable';});
