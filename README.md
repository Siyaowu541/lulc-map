# LULC Reference Atlas

A static, English-language literature map for 40 LULC publications (Part 1 + Part 2). Hosted on GitHub Pages. No server or API key is needed.

## Year logic

The timeline spans 2000–2026 and filters **result/observation years**, not publication years. Discrete map years remain discrete; single-date benchmarks are not extrapolated. Unreported dates and synthetic training scenes appear only under All years. Mixed-year composites (MOLCA and the Alps/Carpathians consensus comparison) require the explicit mixed-year checkbox. Approximate baseline years are labelled. A year without matching results means none are documented in this 40-paper collection, not that no global data exist.

GLC_FCS30D is counted as one global map product although it has two publications (#6 and #22). Global mapped coverage is distinct from globally distributed ground-reference points. Paper #7 and #24 do not paint the entire world as reference labels.

## Geographic precision and provenance

No old schematic rectangles are used. `coverage.geojson` distinguishes four precision levels:

- `footprint`: FLAIR image-patch footprints reconstructed from the official EPSG:2154 centroids and 102.4 m image widths. The NeurIPS dataset is restricted to its actual 77,762 patch IDs, using the original training/validation lists plus the official FLAIR2 test archive's central-directory index. The current metadata release is a superset, so its additional patches are excluded. Paper #10 is restricted to its original FLAIR1 split and 13 named domains. Footprints are filtered by their own acquisition years. Shared edge artefacts from reprojection were repaired; all output geometries are valid.
- `tile`: 2,075 published MOLCA tile extents from `MOLCA_tiles_with_statistics.gpkg`. Only some pixels within a tile are valid agreement labels; tile extents do not mean complete labels. Mixed baselines are 2016–2020.
- `study`: Sichuan province, Jingyuan/Longde counties and Mirzapur district administrative boundaries. These locate the study, not its training/validation sample masks.
- `locator`: representative study-location points where exact geometry has not been established. No surrounding area is claimed as labelled. Broad natural regions without verified boundaries are represented by points rather than invented outlines.

Sources and licences:

- IGN FLAIR2: https://ignf.github.io/FLAIR/FLAIR2/flair_2.html — Licence Ouverte / Open Licence 2.0. Metadata and membership lists only; no aerial imagery was downloaded.
- Original FLAIR1 split lists: https://github.com/IGNF/FLAIR-1/tree/main/csv_full
- MOLCA: https://doi.org/10.5281/zenodo.8071675 — CC BY 4.0; Gorica Bratic and Maria Antonia Brovelli. Grid-vector metadata only; no land-cover rasters downloaded.
- geoBoundaries: https://www.geoboundaries.org/ — CHN ADM1 Public Domain; CHN ADM2 PDDL v1.0; IND ADM2 ODbL 1.0. Administrative geometry has been simplified for this index. The derived administrative geometries retain the source licence; this does not relicense unrelated literature metadata or application code.
- Natural Earth: https://www.naturalearthdata.com/ — Public Domain.
- Leaflet 1.9.4 — BSD-2-Clause; licence included.
- Satellite basemap: Esri World Imagery; on-map provider attribution retained.

Each feature retains its source, precision and explanation in `coverage.geojson`. Access status is inherited from the data tracker; this update is not a recheck of every download link. Colours now show the number of papers linked to each marked area (1 / 2 / 3+), independent of download status. Yellow highlights the selection. Pale blue land tint represents global mapping studies. Eight named study cities use administrative outlines instead of centre points; these outlines do not imply that every location in a city was analysed.

## Files

`index.html`, `style.css`, `app.js`, `coverage-core.js`, `data.json`, `coverage.geojson`, `countries.geojson` and bundled Leaflet files are served directly from the repository root. Query-string versions prevent stale browser assets after publication. A `?year=2018` URL opens a selected year; `?year=all` opens the full collection.

The map is a published land-cover research coverage index. Reference-data access badges have been removed from the interface; the separate data tracker is unchanged.
