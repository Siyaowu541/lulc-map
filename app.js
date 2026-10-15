'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const kindNames={pixel:'Pixel labels / reference data',global:'Global studies',distributed:'Distributed samples · not located',scene:'Scene labels',synthetic:'Synthetic training data',unknown:'Location unclear'};
const statusNames={Yes:'Public',Partial:'Partly public',No:'Unverified / on request'};
const colors={Yes:'#168977',Partial:'#d58b35',No:'#89939c'};
let data,world,geoLayer,map,regionLayer,selected={type:'all'},focusPaper=null;
let countryLayers=new Map(),drawnRegions=[];
function allowed(p){
 const s=$('status').value,k=$('kind').value,q=$('search').value.trim().toLowerCase();
 if(s!=='all'&&p.status!==s)return false;
 if(k==='pixel'&&!['pixel','global','distributed'].includes(p.kind))return false;
 if(k==='scene'&&p.kind!=='scene')return false;
 if(k==='global'&&p.kind!=='global')return false;
 if(k==='unmapped'&&p.regions.length)return false;
 if(q&&![p.title,p.author,p.originalScope,p.audit,...p.regions.map(r=>data.regions[r].name)].join(' ').toLowerCase().includes(q))return false;
 return true;
}
function countryCodes(p){return new Set(p.regions.flatMap(r=>data.regions[r].countries));}
function matchesSelection(p){
 if(selected.type==='all')return true;
 if(selected.type==='global')return p.kind==='global';
 if(p.kind==='global'&&$('include-global').checked)return true;
 if(selected.type==='country')return countryCodes(p).has(selected.code);
 return p.regions.includes(selected.id);
}
function visible(){return data.papers.filter(p=>allowed(p)&&matchesSelection(p));}
function bestStatus(ps){return ps.some(p=>p.status==='Yes')?'Yes':ps.some(p=>p.status==='Partial')?'Partial':'No';}
function baseStyle(feature){
 const code=feature.properties.code,ps=data.papers.filter(p=>allowed(p)&&countryCodes(p).has(code));
 const active=selected.type==='country'&&selected.code===code;
 const focus=focusPaper&&countryCodes(data.papers.find(p=>p.id===focusPaper)).has(code);
 let fill=ps.length?(ps.every(p=>p.kind==='scene')?'#a58ab8':colors[bestStatus(ps)]):'#f7f7ef';
 return{color:active||focus?'#ba8a26':'#b8c9c7',weight:active||focus?2.2:.65,fillColor:active?'#ffcf64':fill,fillOpacity:active?.42:ps.length?.20:.9,opacity:1};
}
function updateMap(){
 geoLayer.setStyle(baseStyle);regionLayer.clearLayers();drawnRegions=[];
 for(const [id,r] of Object.entries(data.regions)){
  const ps=data.papers.filter(p=>r.paperIds.includes(p.id)&&allowed(p));if(!ps.length)continue;
  const selectedRegion=selected.type==='region'&&selected.id===id;
  const countryActive=selected.type==='country'&&r.countries.includes(selected.code);
  const paperActive=focusPaper&&r.paperIds.includes(focusPaper);
  const isFocus=selectedRegion||countryActive||paperActive;
  const dim=focusPaper&&!paperActive;
  const color=isFocus?'#ba8a26':colors[bestStatus(ps)];
  const style={color,fillColor:isFocus?'#ffcf64':colors[bestStatus(ps)],weight:isFocus?2.8:1.5,opacity:dim?.15:.85,fillOpacity:dim?.01:isFocus?.22:.065,dashArray:'5 5',bubblingMouseEvents:false};
  let layers=[];
  if(r.bbox){const [w,s,e,n]=r.bbox;layers.push(L.rectangle([[s,w],[n,e]],style));}
  for(const [lon,lat]of r.points)layers.push(L.circleMarker([lat,lon],{...style,dashArray:null,radius:isFocus?8:5.5,fillOpacity:dim?.15:.9,color:isFocus?'#9a6c17':'#fff',weight:isFocus?3:1.5}));
  for(const layer of layers){
   layer.addTo(regionLayer).bindTooltip(esc(r.name)+'<br><small>'+ps.length+' related paper(s) · '+esc(r.accuracy)+'</small>');
   layer.on('click',()=>selectRegion(id,true));
   const el=layer.getElement();if(el){el.setAttribute('tabindex','0');el.setAttribute('role','button');el.setAttribute('aria-label',r.name+'，'+ps.length+' related paper(s)');el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectRegion(id,true);}});}
   drawnRegions.push({id,layer});
  }
 }
 updateZoom();
}
function selectionText(){
 let title='All regions',note='Colours show reference-data access. Regions are locators, not sample footprints.',kicker='PAPER DIRECTORY';
 if(selected.type==='global'){title='Global studies';note='Global mapping or globally distributed samples; reference labels are not available at every location.';kicker='Separate from regional overlays';}
 if(selected.type==='country'){title=selected.name;note='Country / broad-region matches. Check each study area; these do not prove labels exist throughout the country or at the clicked point.';kicker='SELECTED COUNTRY';}
 if(selected.type==='region'){title=data.regions[selected.id].name;note=data.regions[selected.id].accuracy+'；This selects an area index. Check the paper and data files for actual sample locations.';kicker='SELECTED REGION';}
 $('selection-name').textContent=title;$('selection-note').textContent=note;$('selection-kicker').textContent=kicker;
}
function card(p){
 const mapped=p.regions.length>0;
 const place=p.regions.length?p.regions.map(r=>data.regions[r].name).join(' / '):p.originalScope;
 const isGlobal=p.kind==='global';
 const links=p.dataLinks.filter(u=>/^https?:\/\//.test(u)).slice(0,4).map((u,i)=>'<a target="_blank" rel="noopener" href="'+esc(u)+'">Data / source '+(i+1)+' ↗</a>').join(' · ');
 return `<article class="paper-card ${focusPaper===p.id?'is-active':''}" data-paper="${p.id}"><div class="paper-top"><span>#${String(p.id).padStart(2,'0')} · PART ${p.part} · ${p.year}</span><span class="badge ${p.status}">${statusNames[p.status]}</span></div><div class="paper-title">${esc(p.title)}</div><div class="paper-meta">${esc(p.author)}<br>${esc(place)}</div><span class="type-tag ${p.kind}">${kindNames[p.kind]}</span><div class="card-actions"><button class="locate" data-locate="${p.id}">${mapped?'⌖ Locate on map':isGlobal?'◉ Global scope':'ⓘ Coverage notes'}</button><a href="${esc(p.pdf)}" target="_blank" rel="noopener">Paper PDF ↗</a><a href="${esc(p.doi)}" target="_blank" rel="noopener">DOI ↗</a></div><details ${focusPaper===p.id?'open':''}><summary>Coverage & data notes</summary><p>${esc(p.audit)}</p><p><b>Image / reference dates:</b>${esc(p.time)}</p>${p.year!==p.sheetYear?'<p><b>Year difference: </b>Sheet '+p.sheetYear+'；PDF volume '+p.year+'。The source sheet is unchanged.</p>':''}${p.note?'<p><b>Sheet note: </b>'+esc(p.note)+'</p>':''}<p>${links}</p><p class="muted">Access status comes from the sheet; all downloads have not been retested.</p><details><summary>PDF evidence excerpt</summary><p>${esc(p.evidence)}</p></details></details></article>`;
}
function render(){
 selectionText();const ps=visible();$('paper-list').innerHTML=ps.length?ps.map(card).join(''):'<div class="empty">No papers match these filters.<br>Try resetting the filters or including global studies.<br>No match does not mean no data exist here.</div>';
 $('result-count').textContent=ps.length+'  matching paper(s)';$('filter-info').textContent=selected.type==='all'?'Part 1 + Part 2':'Study-area matches';
 $('paper-list').querySelectorAll('[data-locate]').forEach(b=>b.onclick=()=>locatePaper(Number(b.dataset.locate)));
 updateMap();
}
function selectCountry(feature){selected={type:'country',code:feature.properties.code,name:feature.properties.name};focusPaper=null;render();$('paper-list').scrollTop=0;}
function selectRegion(id,zoom){selected={type:'region',id};focusPaper=null;render();if(zoom)fitRegion(id);$('paper-list').scrollTop=0;}
function fitRegion(id){const r=data.regions[id];if(r.bbox){const[w,s,e,n]=r.bbox;map.fitBounds([[s,w],[n,e]],{padding:[65,65],maxZoom:9});}else if(r.points.length){map.fitBounds(L.latLngBounds(r.points.map(p=>[p[1],p[0]])),{padding:[75,75],maxZoom:9});}else{const ls=r.countries.map(c=>countryLayers.get(c)).filter(Boolean);if(ls.length)map.fitBounds(L.featureGroup(ls).getBounds(),{padding:[55,55],maxZoom:5});}}
function locatePaper(id){
 const p=data.papers.find(p=>p.id===id);focusPaper=id;render();
 if(p.kind==='global'){map.setView([22,10],1.5);$('map-tip').textContent='Global studies · Scattered samples do not imply labels at every location';}
 else if(!p.regions.length){$('map-tip').textContent='Coordinates are not plotted. See the paper card for coverage notes.';}
 else{const points=[];for(const key of p.regions){const r=data.regions[key];if(r.bbox){const[w,s,e,n]=r.bbox;points.push([s,w],[n,e]);}points.push(...r.points.map(p=>[p[1],p[0]]));if(!r.bbox&&!r.points.length){for(const c of r.countries){const l=countryLayers.get(c);if(l){const b=l.getBounds();points.push(b.getSouthWest(),b.getNorthEast());}}}}if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[65,65],maxZoom:9});$('map-tip').textContent='Highlighted  #'+id+'  area index · not exact sample footprints';}
 const el=$('paper-list').querySelector('[data-paper="'+id+'"]');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function reset(){selected={type:'all'};focusPaper=null;$('search').value='';$('status').value='all';$('kind').value='all';$('include-global').checked=false;$('map-tip').textContent='Drag to move · Scroll to zoom · Click a region to find papers';render();}
function updateZoom(){if(map)$('zoom-label').textContent='Zoom '+map.getZoom().toFixed(0)+' · Area index';}
async function init(){
 [data,world]=await Promise.all([fetch('data.json').then(r=>{if(!r.ok)throw Error('data');return r.json();}),fetch('countries.geojson').then(r=>{if(!r.ok)throw Error('borders');return r.json();})]);
 $('sheet-link').href=data.sourceSheet;
 map=L.map('map',{zoomControl:false,minZoom:1,maxZoom:13,zoomSnap:.5,worldCopyJump:false,maxBounds:[[-85,-205],[85,205]],maxBoundsViscosity:.5}).setView([22,10],1.5);
 L.control.zoom({position:'topright',zoomInTitle:'Zoom in',zoomOutTitle:'Zoom out'}).addTo(map);
 map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> · Schematic index');
 // Vector-only basemap: works without external tile services or an API key.
 const grid=L.layerGroup().addTo(map);for(let lng=-180;lng<=180;lng+=30)L.polyline([[-80,lng],[80,lng]],{weight:.5,color:'#c9dadd',interactive:false}).addTo(grid);for(let lat=-60;lat<=60;lat+=30)L.polyline([[lat,-180],[lat,180]],{weight:.5,color:'#c9dadd',interactive:false}).addTo(grid);
 geoLayer=L.geoJSON(world,{style:baseStyle,onEachFeature:(f,l)=>{countryLayers.set(f.properties.code,l);l.bindTooltip(()=>{const n=data.papers.filter(p=>allowed(p)&&countryCodes(p).has(f.properties.code)).length;return esc(f.properties.name)+'<br><small>'+n+' area-index match(es) · excluding global studies</small>';});l.on('click',()=>selectCountry(f));l.on('mouseover',()=>l.setStyle({weight:1.7,color:'#508779'}));l.on('mouseout',()=>l.setStyle(baseStyle(f)));}}).addTo(map);
 for(const l of countryLayers.values()){const el=l.getElement();if(el){el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',l.feature.properties.name+'，find related papers');el.addEventListener('keydown',e=>{if(e.key==='Enter'){selectCountry(l.feature);}});}}
 regionLayer=L.featureGroup().addTo(map);map.on('zoomend',updateZoom);
 $('search').oninput=()=>{focusPaper=null;render();};for(const id of ['status','kind','include-global'])$(id).onchange=()=>{focusPaper=null;render();};
 $('reset').onclick=reset;$('all-papers').onclick=reset;$('world').onclick=()=>map.setView([22,10],1.5);
 $('global-papers').onclick=()=>{reset();selected={type:'global'};render();};
 $('audit-open').onclick=()=>$('audit-dialog').showModal();$('audit-close').onclick=()=>$('audit-dialog').close();
 $('audit-dialog').addEventListener('click',e=>{if(e.target===$('audit-dialog'))$('audit-dialog').close();});
 $('audit-list').innerHTML=data.papers.map(p=>`<details class="audit-record"><summary>#${p.id} · ${esc(p.author)} (${p.year}) · ${esc(p.title)}</summary><p><b>Sheet scope: </b>${esc(p.originalScope)}</p><p><b>Coverage audit: </b>${esc(p.audit)}</p><p><b>Type: </b>${kindNames[p.kind]}</p><blockquote>${esc(p.evidence)}</blockquote><a href="${esc(p.pdf)}" target="_blank" rel="noopener">Open uploaded PDF ↗</a></details>`).join('');
 render();
}
init().catch(e=>{console.error(e);$('load-error').hidden=false;$('result-count').textContent='Loading failed';});
