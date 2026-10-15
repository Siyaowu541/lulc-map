"use strict";
const el=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const core=CoverageCore;
let data,footprints,map,countries,coverage,chosen=null,active=[],activeFeatures=[],renderedLayers=[],year=null;
const initial=Number(new URLSearchParams(location.search).get('year'));if(new URLSearchParams(location.search).has('year')&&Number.isInteger(initial)&&initial>=2000&&initial<=2026)year=initial;
if(new URLSearchParams(location.search).get('year')==='all')year=null;
const countryCodes=p=>p.regions.flatMap(k=>data.regions[k]?.countries||[]);
const precisionLabel={footprint:'Image study area',tile:'Published study tiles',boundary:'Named regional boundary',study:'Approximate study region',digitized:'Approximate outline from paper figure'};
function areaDetail(q){if(q.precision==='footprint'){const n=q.detail.match(/^(\d+) aerial patches/),dates=q.detail.match(/Acquisition dates ([\d-]+) to ([\d-]+)/);return `${n?n[1]+' aerial image patches. ':''}${dates?'Acquired '+dates[1]+(dates[1]===dates[2]?'':' to '+dates[2])+'. ':''}Image bounds reconstructed from official coordinates.`;}return precisionLabel[q.precision]+'. '+q.detail;}
function setYear(value){year=value;chosen=null;el('year-range').value=value??2020;el('year-select').value=value??'all';el('all-years').classList.toggle('active',value===null);el('previous').disabled=value===null||value===2000;el('next').disabled=value===null||value===2026;const u=new URL(location.href);u.searchParams.set('year',value??'all');history.replaceState(null,'',u);render();el('papers').scrollTop=0;}
function setChosen(value){chosen=value;renderList();renderCountryStyles();highlightFeatures();el('papers').scrollTop=0;}
function worldView(){map.stop();map.fitBounds([[-60,-180],[80,180]],{padding:[12,24],maxZoom:1.5,animate:false});}
function matchingList(){if(!chosen)return active;if(chosen.type==='feature')return active.filter(p=>chosen.paperIds.includes(p.id));if(chosen.type==='globals')return active.filter(p=>p.globalMap);if(chosen.type==='country')return active.filter(p=>countryCodes(p).includes(chosen.id)||p.globalMap);return active;}
function renderList(){
 const papers=matchingList();el('area').textContent=chosen?.name||'Worldwide';el('clear-area').hidden=!chosen;
 el('count').textContent=year===null?'All result years':`Data for ${year}`;
 el('selection-detail').hidden=!chosen?.detail;el('selection-detail').textContent=chosen?.detail||'';
 el('papers').innerHTML=papers.map(p=>{
  const paperShapes=activeFeatures.filter(f=>f.properties.paperIds.includes(p.id)),canLocate=paperShapes.length>0;
  const boundaryNote=paperShapes.some(f=>['study','digitized'].includes(f.properties.precision))?'Map outline: approximate study region. Click the area for boundary details.':'';
  const quality=p.dateQuality==='unknown'?'Result years not reported':p.dateQuality==='mixed'?'Mixed-year inputs; not an annual sequence':p.dateQuality==='approximate'?'Approximate baseline year':'';
 const missing=(!p.globalMap&&!canLocate)?'Study area reviewed; a usable geographic boundary has not been recovered.':'';
  return `<article class="paper" data-paper-id="${p.id}"><div class="paper-top"><span class="paper-id">PAPER ${String(p.id).padStart(2,'0')}</span><span class="badge study-badge">Land-cover study</span></div><h3>${esc(p.title)}</h3><div class="byline">${esc(p.author)} · Published ${p.year}</div><div class="paper-meta"><span>Results: ${esc(p.resultYears)}</span><span>${esc(p.resolution)}</span></div><p class="paper-scope">${esc(p.scope)}</p><p class="paper-scope">${esc(p.frequency)}</p>${[quality,p.coverageNote,boundaryNote,missing].filter(Boolean).map(t=>`<p class="paper-note">${esc(t)}</p>`).join('')}<div class="paper-actions"><a target="_blank" rel="noopener" href="${esc(p.pdf)}">Read paper ↗</a>${canLocate?`<button class="locate-paper" data-locate="${p.id}">Locate on map →</button>`:''}</div></article>`;
 }).join('')||'<div class="empty-list">No results in this collection match this selection.<br>Try another year, enable mixed-year results, or choose All years. An empty map does not mean no data exist elsewhere.</div>';
 el('papers').querySelectorAll('[data-locate]').forEach(b=>b.onclick=()=>locatePaper(Number(b.dataset.locate)));
}
function renderCountryStyles(){const globals=active.some(p=>p.globalMap);countries.setStyle(f=>({color:chosen?.type==='country'&&chosen.id===f.properties.code?'#ffe59a':'#d9e3dc',weight:chosen?.type==='country'&&chosen.id===f.properties.code?2:.45,fillColor:chosen?.type==='country'&&chosen.id===f.properties.code?'#ffe59a':'#a7bed4',fillOpacity:chosen?.type==='country'&&chosen.id===f.properties.code?.18:globals?.14:0}));}
function locatePaper(id){const features=activeFeatures.filter(f=>f.properties.paperIds.includes(id));const layer=L.geoJSON(features);if(layer.getBounds().isValid())map.fitBounds(layer.getBounds().pad(.12),{maxZoom:11,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});setChosen({type:'feature',paperIds:[id],name:`Paper ${id}`,detail:[data.papers.find(p=>p.id===id).scope,...new Set(features.map(f=>areaDetail(f.properties)))].join(' ')});}
function addCoverage(){
 coverage.clearLayers();renderedLayers=[];
 for(const f of activeFeatures){
 const papers=core.featurePapers(f,active,year),q=f.properties,approx=['study','digitized'].includes(q.precision),colour=approx?'#e7a44b':'#42d6a0';
  const style={color:colour,weight:approx?1.8:1,fillColor:colour,fillOpacity:approx?.2:q.precision==='tile'?.16:.4,dashArray:approx?'6 4':null,bubblingMouseEvents:false};
  const shape=L.geoJSON(f,{style,pointToLayer:(_f,ll)=>L.circleMarker(ll,{...style,radius:6,weight:1.5,fillOpacity:.95,color:'#fff',className:'map-point'}),onEachFeature:(_f,l)=>{
   l.bindTooltip(`<strong>${esc(q.name)}</strong><small>${esc(precisionLabel[q.precision])}</small><small>${q.years?'Observation year: '+q.years.join(', '):'Paper study area'}</small>`);
   renderedLayers.push({layer:l,properties:q,style:{...style,...(q.precision==='locator'?{fillOpacity:.95,color:'#fff',weight:1.5}:{} )}});
   l.on('click',e=>{L.DomEvent.stopPropagation(e);const hits=activeFeatures.filter(x=>core.pointInGeometry([e.latlng.lng,e.latlng.lat],x.geometry)),ids=[...new Set(hits.flatMap(x=>core.featurePapers(x,active,year).map(p=>p.id)))];setChosen({type:'feature',key:q.key,name:q.name,paperIds:ids.length?ids:papers.map(p=>p.id),detail:areaDetail(q)});if(l.getBounds&&map.getZoom()<7)map.fitBounds(l.getBounds().pad(.3),{maxZoom:10});});
  }});shape.addTo(coverage);
 }
}
function highlightFeatures(){for(const {layer,properties:q,style}of renderedLayers){const selected=chosen?.type==='feature'&&(chosen.key?chosen.key===q.key:q.paperIds.some(id=>chosen.paperIds.includes(id)));layer.setStyle(selected?{...style,color:'#ac6c16',fillColor:'#f5d074',fillOpacity:q.precision==='locator'?1:.4,weight:2.5}:style);if(selected)layer.bringToFront();}}
function render(){
 active=core.activePapers(data.papers,year,el('mixed-years').checked);
 activeFeatures=footprints.features.filter(f=>['Polygon','MultiPolygon'].includes(f.geometry.type)&&core.featurePapers(f,active,year).length);
 el('map-year').textContent=year===null?'All years':year;el('map-matches').textContent=' · Study areas';
 const unknown=data.papers.filter(p=>!p.years.length).length,mixed=data.papers.filter(p=>p.dateQuality==='mixed'&&p.years.includes(year)).length;
 el('year-context').textContent=year===null?'All observation years':'Observation years, not publication years. Unreported years appear under All years.';
 const globals=active.filter(p=>p.globalMap),n=core.globalProductCount(active);
 el('global-summary').innerHTML=n?'<button id="show-globals">Global mapping studies<span>Pale blue land shows global study scope.</span></button>':'';
 if(n)el('show-globals').onclick=()=>setChosen({type:'globals',name:'Global mapping studies',detail:'These publications map land cover worldwide. GLC_FCS30D has two papers describing the same product.'});
 el('map-empty').hidden=activeFeatures.length>0||n>0;
 const counts=Array.from({length:27},(_,i)=>core.activePapers(data.papers,2000+i,el('mixed-years').checked).length),max=Math.max(...counts,1);
 el('year-bars').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',year===Number(b.dataset.year));b.classList.toggle('zero',counts[i]===0);b.style.height=Math.max(3,counts[i]/max*31)+'px';b.setAttribute('aria-label',String(2000+i));b.title=String(2000+i);});
 addCoverage();renderCountryStyles();renderList();
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
Promise.all(['data.json?v=studyareas2','countries.geojson','coverage.geojson?v=studyareas2'].map(u=>fetch(u).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}))).then(([d,w,g])=>{
 data=d;footprints=g;map=L.map('map',{minZoom:.5,maxZoom:19,zoomSnap:.5,zoomControl:false,preferCanvas:true}).setView([22,10],1.5);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,noWrap:true,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
 L.control.zoom({position:'topright'}).addTo(map);L.control.scale({position:'bottomright',imperial:false}).addTo(map);
 map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/">Natural Earth</a> · <a href="https://www.geoboundaries.org/">geoBoundaries</a> · IGN · MOLCA');
 countries=L.geoJSON(w,{onEachFeature:(f,l)=>{l.bindTooltip(esc(f.properties.name));l.on('click',e=>{const hits=activeFeatures.filter(x=>core.pointInGeometry([e.latlng.lng,e.latlng.lat],x.geometry)),ids=[...new Set([...hits.flatMap(x=>core.featurePapers(x,active,year).map(p=>p.id)),...active.filter(p=>p.globalMap).map(p=>p.id)])];setChosen({type:'feature',paperIds:ids,name:f.properties.name,detail:ids.length?'Papers with a plotted study area at this location, including global mapping studies.':'No plotted study boundary at this location. Unlocated benchmark studies remain under Clear area.'});});}}).addTo(map);
 coverage=L.featureGroup().addTo(map);setupTimeline();setYear(year);worldView();
}).catch(error=>{console.error(error);el('count').textContent='Could not load the collection. Please refresh.';el('year-context').textContent='Map data unavailable';});
