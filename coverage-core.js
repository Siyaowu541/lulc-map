(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CoverageCore=api;})(typeof window!=='undefined'?window:this,function(){
 'use strict';
 function matchesYear(p,year,includeMixed=false){return year===null||(p.years.includes(year)&&(p.dateQuality!=='mixed'||includeMixed));}
 function activePapers(papers,year,includeMixed){return papers.filter(p=>matchesYear(p,year,includeMixed));}
 function featurePapers(feature,papers,year){const q=feature.properties;return papers.filter(p=>q.paperIds.includes(p.id)&&(year===null||!q.years||q.years.includes(year)));}
 function globalProductCount(papers){return new Set(papers.filter(p=>p.globalMap).map(p=>[6,22].includes(p.id)?'GLC_FCS30D':p.id)).size;}
 function pointInRing(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(((a[1]>point[1])!==(b[1]>point[1]))&&(point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0]))inside=!inside;}return inside;}
 function pointInGeometry(point,g){if(g.type==='Polygon')return pointInRing(point,g.coordinates[0])&&!g.coordinates.slice(1).some(r=>pointInRing(point,r));if(g.type==='MultiPolygon')return g.coordinates.some(c=>pointInGeometry(point,{type:'Polygon',coordinates:c}));return false;}
 return {matchesYear,activePapers,featurePapers,globalProductCount,pointInGeometry};
});
