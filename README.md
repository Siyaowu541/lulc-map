# LULC Reference Atlas

Public Leaflet map: https://siyaowu541.github.io/lulc-map/

Updated 2026-10-28: original 40 mapped papers plus 50 newly uploaded papers (90 map records). The Google tracker also holds a separate 20-paper batch that is not part of this map release. Map IDs follow the tracker, so IDs 41–60 are not in this geographic collection.

- Select study/result years from 2000 to 2026, or All years. Publication year never determines the time filter.
- Independent observation epochs retain gaps. For example, the Potapov global release appears in 2000 and 2020, not every intermediate year. Forecast years are excluded from observed map results.
- Mixed-date composite maps are labelled and controlled by the Include mixed-year results checkbox.
- Click a study boundary to show its publications; Read paper opens the uploaded PDF.
- Solid green lines show named administrative regions or published image tiles. Dashed orange lines show reconstructed / approximate research outlines. The exact original GIS clipping mask has not been recovered for every study. Boundaries remain study scope, not classified pixels or reference-label availability.
- Global studies use a separate domain indicator; a global thematic product does not imply every pixel has samples or a class of interest.

## Geographic pie charts

Zoom thresholds: <3 continents, 3–5 countries, 5–8 provinces/states, >=8 local study regions. Click a chart label to zoom and filter the paper list. Pan or zoom to change geographic context; an explicitly selected chart region stays pinned until the user navigates the map.

Statistics count papers in this collection, not area or all published research. Every paper has a total weight of one. For multi-country studies its weight is divided equally between countries, then equally between intersecting provinces/states, and then between local study regions. National and continental studies stay separate at finer levels; global studies and unallocated/distributed records are separate in the world chart. One paper is counted once in All years, irrespective of how many result years it has. Charts update with the year filter; they do not use publication dates or count only the viewport. The denominator is displayed as paper-equivalents. Other groups may be expanded; 3% threshold, maximum six main slices.

Boundary / temporal evidence for the new batch: [batch50-audit.csv](batch50-audit.csv). Earlier 40-paper audit: [study-area-audit.csv](study-area-audit.csv). Named administrative boundaries are current geographic references and may differ from the historical boundaries used by authors. Figure-derived outlines are for browsing, not measurement.

Sources: Natural Earth public-domain countries and admin-1 boundaries; geoBoundaries (see original footer licenses); Alibaba DataV named county/city boundaries; the cited publications and their figures; JAXA mosaic tile identifiers in the cited methods; original IGN FLAIR / MOLCA / USGS / INPE regional sources retained from the previous map.

Basemap: OpenStreetMap. Leaflet 1.9.4, BSD-2-Clause. The site contains no PDF bytes: it links to the user-authorized Google Drive uploads. Serve the directory with any static HTTP server. GitHub Pages publishes the main branch root.
