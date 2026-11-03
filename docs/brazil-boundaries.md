# Florianópolis neighborhood boundaries

Source: GeoFloripa / Prefeitura Municipal de Florianópolis, layer `Geoportal:gvw_bairros`, Decreto Municipal 29.142 of 10 April 2026.

Official description: https://redeplanejamento.pmf.sc.gov.br/pt-BR/planos/bairros
Original WFS request preserved in the downloaded archive: https://geofloripa.pmf.sc.gov.br/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Geoportal:gvw_bairros&outputFormat=SHAPE-ZIP

The municipal host was unreachable during this task. Used the public GeoFloripa mirror distributed by Forest-GIS: https://forest-gis.com/shapefiles/bairros/Bairros_FlorianopolisSC.zip (archive entries dated 2026-09-30). The archive includes original WFS request, municipality legislation, names and EPSG:31982 projection. Retrieved 2026-10-24.

Selected 13 named neighborhoods matching the guide. Coqueiros and Estreito are separate features; Beira-Mar is not treated as a neighborhood separate from Centro. Reprojected SIRGAS 2000 / UTM 22S (EPSG:31982) to WGS84 (EPSG:4326), simplified in projected coordinates with a 5 m tolerance and preserved topology, rounded coordinates to 6 decimal places. Largest area deviation from source: 0.104%. All features validated as nonempty valid polygons within Florianópolis bounds. This is a display layer, not a cadastral survey.

The static GeoJSON is `public/brazil/neighborhoods.geojson`, fetched once on map mount. No runtime dependency on external WFS. Sidebar and polygon selection share place IDs, filters and search. Facility markers remain separate.
