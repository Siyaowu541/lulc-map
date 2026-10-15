"use strict";
const el=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const core=CoverageCore,studyColour=count=>count>=3?'#b7a3fa':count===2?'#65b9ef':'#42d6a0';
let data,footprints,map,countries,coverage,chosen=null,active=[],activeFeatures=[],renderedLayers=[],year=2020;
const initial=Number(new URLSearchParams(location.search).get('year'));if(new URLSearchParams(location.search).has('year')&&Number.isInteger(initial)&&initial>=2000&&initial<=2026)year=initial;
if(new URLSearchParams(location.search).get('year')==='all')year=null;
const countryCodes=p=>p.regions.flatMap(k=>data.regions[k]?.countries||[]);
const precisionLabel={footprint:'Reconstructed aerial-patch footprint',tile:'Published tile extent; partial valid pixels',study:'Administrative study boundary',locator:'Study location only; exact extent unavailable'};
function areaDetail(q){if(q.precision==='footprint'){const n=q.detail.match(/^(\d+) aerial patches/),dates=q.detail.match(/Acquisition dates ([\d-]+) to ([\d-]+)/);return `${n?n[1]+' aerial image patches. ':''}${dates?'Acquired '+dates[1]+(dates[1]===dates[2]?'':' to '+dates[2])+'. ':''}Image bounds reconstructed from official coordinates.`;}return precisionLabel[q.precision]+'. '+q.detail;}
function setYear(value){year=value;chosen=null;el('year-range').value=value??2020;el('year-select').value=value??'all';el('all-years').classList.toggle('active',value===null);el('previous').disabled=value===null||value===2000;el('next').disabled=value===null||value===2026;const u=new URL(location.href);u.searchParams.set('year',value??'all');history.replaceState(null,'',u);render();el('papers').scrollTop=0;}
function setChosen(value){chosen=value;renderList();renderCountryStyles();highlightFeatures();el('papers').scrollTop=0;}
function worldView(){map.fitBounds([[-60,-180],[80,180]],{padding:[12,24],maxZoom:1.5});}
function matchingList(){if(!chosen)return active;if(chosen.type==='feature')return active.filter(p=>chosen.paperIds.includes(p.id));if(chosen.type==='globals')return active.filter(p=>p.globalMap);if(chosen.type==='country')return active.filter(p=>countryCodes(p).includes(chosen.id)||p.globalMap);return active;}
function renderList(){
 const papers=matchingList();el('area').textContent=chosen?.name||'Worldwide';el('clear-area').hidden=!chosen;
 el('count').textContent=`${papers.length} publication${papers.length===1?'':'s'} · ${year===null?'all result years':year}${chosen?.type==='country'?' · includes global map products':''}`;
 el('selection-detail').hidden=!chosen?.detail;el('selection-detail').textContent=chosen?.detail||'';
 el('papers').innerHTML=papers.map(p=>{
  const canLocate=activeFeatures.some(f=>f.properties.paperIds.includes(p.id));
  const quality=p.dateQuality==='unknown'?'Result years not reported':p.dateQuality==='mixed'?'Mixed-year inputs; not an annual sequence':p.dateQuality==='approximate'?'Approximate baseline year':'';
  const missing=(!p.globalMap&&!canLocate&&p.kind!=='synthetic')?'No geographic footprint is plotted for this publication.':'';
  return `<article class="paper" data-paper-id="${p.id}"><div class="paper-top"><span class="paper-id">PAPER ${String(p.id).padStart(2,'0')}</span><span class="badge study-badge">Land-cover study</span></div><h3>${esc(p.title)}</h3><div class="byline">${esc(p.author)} · Published ${p.year}</div><div class="paper-meta"><span>Results: ${esc(p.resultYears)}</span><span>${esc(p.resolution)}</span></div><p class="paper-scope">${esc(p.scope)}</p><p class="paper-scope">${esc(p.frequency)}</p>${[quality,p.coverageNote,missing].filter(Boolean).map(t=>`<p class="paper-note">${esc(t)}</p>`).join('')}<div class="paper-actions"><a target="_blank" rel="noopener" href="${esc(p.pdf)}">Read paper ↗</a>${canLocate?`<button class="locate-paper" data-locate="${p.id}">Locate on map →</button>`:''}</div></article>`;
 }).join('')||'<div class="empty-list">No results in this collection match this selection.<br>Try another year, enable mixed-year results, or choose All years. An empty map does not mean no data exist elsewhere.</div>';
 el('papers').querySelectorAll('[data-locate]').forEach(b=>b.onclick=()=>locatePaper(Number(b.dataset.locate)));
}
function renderCountryStyles(){const globals=active.some(p=>p.globalMap);countries.setStyle(f=>({color:chosen?.type==='country'&&chosen.id===f.properties.code?'#ffe59a':'#d9e3dc',weight:chosen?.type==='country'&&chosen.id===f.properties.code?2:.45,fillColor:chosen?.type==='country'&&chosen.id===f.properties.code?'#ffe59a':'#a7bed4',fillOpacity:chosen?.type==='country'&&chosen.id===f.properties.code?.18:globals?.14:0}));}
function locatePaper(id){const features=activeFeatures.filter(f=>f.properties.paperIds.includes(id));const layer=L.geoJSON(features);if(layer.getBounds().isValid())map.fitBounds(layer.getBounds().pad(.12),{maxZoom:11,animate:!matchMedia('(prefers-reduced-motion: reduce)').matches});setChosen({type:'feature',paperIds:[id],name:`Paper ${id}`,detail:data.papers.find(p=>p.id===id).scope});}
function addCoverage(){
 coverage.clearLayers();renderedLayers=[];
 for(const f of activeFeatures){
  const papers=core.featurePapers(f,active,year),q=f.properties,colour=studyColour(papers.length);
  const style={color:colour,weight:q.precision==='study'?1.8:1,fillColor:colour,fillOpacity:q.precision==='study'?.22:q.precision==='tile'?.16:.4,dashArray:q.precision==='study'?'6 4':null,bubblingMouseEvents:false};
  const shape=L.geoJSON(f,{style,pointToLayer:(_f,ll)=>L.circleMarker(ll,{...style,radius:6,weight:1.5,fillOpacity:.95,color:'#fff',className:'map-point'}),onEachFeature:(_f,l)=>{
   l.bindTooltip(`<strong>${esc(q.name)}</strong><small>${esc(precisionLabel[q.precision])}</small><small>${papers.length} matching publication${papers.length===1?'':'s'}${q.years?' · '+q.years.join(', '):''}</small>`);
   renderedLayers.push({layer:l,properties:q,style:{...style,...(q.precision==='locator'?{fillOpacity:.95,color:'#fff',weight:1.5}:{} )}});
   l.on('click',e=>{L.DomEvent.stopPropagation(e);setChosen({type:'feature',key:q.key,name:q.name,paperIds:papers.map(p=>p.id),detail:areaDetail(q)});if(l.getBounds&&map.getZoom()<7)map.fitBounds(l.getBounds().pad(.3),{maxZoom:10});});
  }});shape.addTo(coverage);
 }
}
function highlightFeatures(){for(const {layer,properties:q,style}of renderedLayers){const selected=chosen?.type==='feature'&&(chosen.key?chosen.key===q.key:q.paperIds.some(id=>chosen.paperIds.includes(id)));layer.setStyle(selected?{...style,color:'#ffe59a',fillColor:'#ffe59a',fillOpacity:q.precision==='locator'?1:.4,weight:2.5}:style);if(selected)layer.bringToFront();}}
function render(){
 active=core.activePapers(data.papers,year,el('mixed-years').checked);
 activeFeatures=footprints.features.filter(f=>core.featurePapers(f,active,year).length);
 el('map-year').textContent=year===null?'All years':year;el('map-matches').textContent=` · ${active.length} publications`;
 const unknown=data.papers.filter(p=>!p.years.length).length,mixed=data.papers.filter(p=>p.dateQuality==='mixed'&&p.years.includes(year)).length;
 el('year-context').textContent=year===null?'Includes unreported years and synthetic benchmarks':`${unknown} papers with unreported / non-applicable years excluded${mixed&&!el('mixed-years').checked?` · ${mixed} mixed-year results excluded`:''}`;
 const globals=active.filter(p=>p.globalMap),n=core.globalProductCount(active);
 el('global-summary').innerHTML=n?`<button id="show-globals">${n} global mapping stud${n===1?'y':'ies'} · ${globals.length} publication${globals.length===1?'':'s'}<span>These studies map land cover worldwide.</span></button>`:'';
 if(n)el('show-globals').onclick=()=>setChosen({type:'globals',name:'Global mapping studies',detail:'These publications map land cover worldwide. GLC_FCS30D has two papers describing the same product.'});
 el('map-empty').hidden=active.length>0;
 const counts=Array.from({length:27},(_,i)=>core.activePapers(data.papers,2000+i,el('mixed-years').checked).length),max=Math.max(...counts,1);
 el('year-bars').querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',year===Number(b.dataset.year));b.classList.toggle('zero',counts[i]===0);b.style.height=Math.max(3,counts[i]/max*31)+'px';b.title=b.getAttribute('aria-label');b.setAttribute('aria-label',`${2000+i}: ${counts[i]} dated publications`);b.title=b.getAttribute('aria-label');});
 addCoverage();renderCountryStyles();renderList();
}
function setupTimeline(){
 el('year-select').innerHTML='<option value="all">All years</option>'+Array.from({length:27},(_,i)=>`<option value="${2000+i}">${2000+i}</option>`).join('');
 const counts=Array.from({length:27},(_,i)=>core.activePapers(data.papers,2000+i,false).length),max=Math.max(...counts,1);
 el('year-bars').innerHTML=counts.map((n,i)=>`<button data-year="${2000+i}" class="${n?'':'zero'}" style="height:${Math.max(3,n/max*31)}px" title="${2000+i}: ${n} dated publications" aria-label="${2000+i}: ${n} dated publications"></button>`).join('');
 el('year-bars').querySelectorAll('button').forEach(b=>b.onclick=()=>setYear(Number(b.dataset.year)));
 el('year-range').oninput=e=>setYear(Number(e.target.value));el('year-select').onchange=e=>setYear(e.target.value==='all'?null:Number(e.target.value));
 el('previous').onclick=()=>setYear(Math.max(2000,year-1));el('next').onclick=()=>setYear(Math.min(2026,year+1));el('all-years').onclick=()=>setYear(null);
 el('mixed-years').onchange=()=>{chosen=null;render();};el('clear-area').onclick=()=>setChosen(null);el('reset-map').onclick=()=>{setChosen(null);worldView();};
}
Promise.all(['data.json?v=timeline1','countries.geojson','coverage.geojson?v=research1'].map(u=>fetch(u).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}))).then(([d,w,g])=>{
 data=d;footprints=g;map=L.map('map',{minZoom:.5,maxZoom:19,zoomSnap:.5,zoomControl:false,preferCanvas:true}).setView([22,10],1.5);
 L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,noWrap:true,attribution:'Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community'}).addTo(map);
 L.control.zoom({position:'topright'}).addTo(map);L.control.scale({position:'bottomright',imperial:false}).addTo(map);
 map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/">Natural Earth</a> · <a href="https://www.geoboundaries.org/">geoBoundaries</a> · IGN · MOLCA');
 countries=L.geoJSON(w,{onEachFeature:(f,l)=>{l.bindTooltip(esc(f.properties.name));l.on('click',()=>setChosen({type:'country',id:f.properties.code,name:f.properties.name,detail:'Publications associated with this country, plus any global map products. A country association is not continuous sample coverage.'}));}}).addTo(map);
 coverage=L.featureGroup().addTo(map);setupTimeline();setYear(year);worldView();
}).catch(error=>{console.error(error);el('count').textContent='Could not load the collection. Please refresh.';el('year-context').textContent='Map data unavailable';});
