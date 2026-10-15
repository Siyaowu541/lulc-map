# LULC Reference Atlas

A static Leaflet map of research areas from 40 reviewed land-cover papers.

- Select result/observation years from 2000 to 2026, or All years.
- Click a shaded study region to find its papers, or use Locate on map in the paper list.
- Green shows sourced image/tile outlines or named regional boundaries.
- Orange dashed outlines are approximate research regions: administrative context, alternative regional definitions, or outlines digitised from paper figures.
- Pale blue land represents global mapping studies. Globally distributed sample collections are not shown as continuous global coverage.
- No location-only point markers are displayed. Shading does not indicate publication counts or download availability.

All 40 records have a study-area review. Nineteen papers have regional geometry (some partial), four describe global mapping products, and seventeen currently have no recoverable geographic boundary. The last category is explained in each paper card; no geographic buffers or full-country data coverage are invented. Two GLC_FCS30D papers describe the same product.

See `study-area-audit.csv` for paper-by-paper sources, limitations, and full-text evidence. Boundary sources include IGN FLAIR, MOLCA, geoBoundaries, USGS WBD, INPE TerraBrasilis, the published Loess Plateau Region boundary, and Alibaba DataV. Approximate Central Indian Highlands, Alps and Carpathians outlines were digitised from the cited paper figures. Regional outlines do not claim that every pixel inside has a reference label. Some papers use scene-level classification benchmarks rather than pixel-level labels.

The basemap is OpenStreetMap. Leaflet and source attribution are retained on the map; detailed boundary-source links and license information appear in the footer. Source boundaries are simplified for display. Political boundaries imply no position on sovereignty.

Open `index.html` through any static web server. GitHub Pages publishes the main branch root at https://siyaowu541.github.io/lulc-map/ .
