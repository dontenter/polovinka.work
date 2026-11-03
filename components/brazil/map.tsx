"use client";
import { useEffect, useRef, useState } from "react";
import { categories, places, mapLink, placeCategories, type Place, type Category } from "@/lib/brazil-data";
import { Source } from "./source";
import { DistrictCard } from "./district-card";
type LatLng = [number, number];
type Layer = { addTo(target: MapInstance | LayerGroup): Layer; on(event: string, handler: () => void): Layer; bindPopup(content: HTMLElement): Layer; openPopup(): Layer };
type AreaFeature = { type: "Feature"; properties: {placeId: string; name: string}; geometry: {type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][]} };
type AreaCollection = {type: "FeatureCollection"; features: AreaFeature[]};
type Bounds = {isValid(): boolean};
type AreaLayer = Layer & {getBounds(): Bounds; setStyle(style: object): AreaLayer; bringToFront(): AreaLayer; bindTooltip(content: HTMLElement, options: object): AreaLayer};
const areaColors = ["#26856b", "#527fba", "#b88b36", "#986eb0", "#3f929d", "#ba7261", "#6c9250"];
function areaStyle(index: number, active = false): object {return {color: areaColors[index % areaColors.length], weight: active ? 4 : 2, fillColor: areaColors[index % areaColors.length], fillOpacity: active ? 0.3 : 0.13, opacity: 0.9};}
type LayerGroup = { addTo(map: MapInstance): LayerGroup; clearLayers(): void };
type MapInstance = { remove(): void; setView(position: LatLng, zoom: number): MapInstance; fitBounds(bounds: LatLng[] | Bounds, options?: {padding: LatLng; paddingBottomRight?: LatLng; maxZoom?: number}): void; invalidateSize(): void };
type Leaflet = { map(element: HTMLElement, options: object): MapInstance; tileLayer(url: string, options: object): Layer; layerGroup(): LayerGroup; marker(position: LatLng, options: object): Layer; divIcon(options: object): object; geoJSON(feature: AreaFeature, options: object): AreaLayer };
declare global { interface Window { L?: Leaflet } }
let leafletPromise: Promise<Leaflet> | undefined;
function loadLeaflet(): Promise<Leaflet> {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-brazil-map]')) { const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "/brazil/leaflet.css"; css.dataset.brazilMap = "true"; document.head.append(css); }
    const script = document.createElement("script"); script.src = "/brazil/leaflet.js"; script.onload = () => window.L ? resolve(window.L) : reject(new Error("Map unavailable")); script.onerror = () => { script.remove(); leafletPromise = undefined; reject(new Error("Map unavailable")); }; document.head.append(script);
  });
  return leafletPromise;
}
export function BrazilMap() {
  const container = useRef<HTMLDivElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const groupRef = useRef<LayerGroup | null>(null);
  const markerRefs = useRef<Record<string, Layer>>({});
  const areaLayersRef = useRef<Record<string, {layer: AreaLayer; colorIndex: number}>>({});
  const selectedRef = useRef<Place | null>(null);
  const [boundaries, setBoundaries] = useState<AreaCollection | null>(null);
  const [boundaryError, setBoundaryError] = useState(false);
  const [boundaryAttempt, setBoundaryAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState<Category[]>(Object.keys(categories) as Category[]);
  const [selected, setSelected] = useState<Place | null>(null);
  useEffect(() => {
    if (sidebar.current) sidebar.current.scrollTop = 0;
    const area = selected?.category === "area" ? areaLayersRef.current[selected.id] : null;
    if (area && mapRef.current) {
      mapRef.current.invalidateSize();
      mapRef.current.fitBounds(area.layer.getBounds(), {padding:[24,24], paddingBottomRight: [container.current && container.current.clientWidth > 700 ? 420 : 24, 24], maxZoom:14});
    }
  }, [selected?.id]);
  const scopedPlaces = places;
  const visible = scopedPlaces.filter(p => placeCategories(p).some(c => enabled.includes(c)) && `${p.name} ${p.area} ${p.summary} ${p.note} ${p.address || ""} ${placeCategories(p).map(c => categories[c].label).join(" ")}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const displayCategory = (place: Place) => placeCategories(place).find(c => enabled.includes(c)) || place.category;
  useEffect(() => {
    const controller = new AbortController();
    setBoundaryError(false);
    fetch("/brazil/neighborhoods.geojson", {signal: controller.signal})
      .then(response => {if (!response.ok) throw new Error("Boundaries unavailable"); return response.json();})
      .then((data: AreaCollection) => {
        if (data.type !== "FeatureCollection" || !Array.isArray(data.features) || !places.filter(p=>p.category === "area").every(p=>data.features.some(f=>f.properties?.placeId===p.id && ["Polygon", "MultiPolygon"].includes(f.geometry?.type)))) throw new Error("Invalid boundaries");
        if (!controller.signal.aborted) setBoundaries(data);
      }).catch(() => {if (!controller.signal.aborted) setBoundaryError(true);});
    return () => controller.abort();
  }, [boundaryAttempt]);
  useEffect(() => {
    selectedRef.current = selected;
    Object.entries(areaLayersRef.current).forEach(([id, {layer, colorIndex}]) => layer.setStyle(areaStyle(colorIndex, id === selected?.id)));
  }, [selected]);
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    loadLeaflet().then(L => {
      if (cancelled || !container.current) return;
      const map = L.map(container.current, {scrollWheelZoom: false, zoomControl: true}).setView([-27.57, -48.49], 11);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on("tileerror", () => { if (!cancelled) setTileError(true); }).addTo(map);
      groupRef.current = L.layerGroup().addTo(map);
      observer = new ResizeObserver(() => map.invalidateSize()); observer.observe(container.current);
      setReady(true);
    }).catch(() => { if (!cancelled) setMapError(true); });
    return () => { cancelled = true; observer?.disconnect(); mapRef.current?.remove(); mapRef.current = null; groupRef.current = null; };
  }, []);
  useEffect(() => {
    if (!ready || !window.L || !groupRef.current) return;
    const L = window.L; const group = groupRef.current; group.clearLayers(); markerRefs.current = {}; areaLayersRef.current = {};
    visible.filter(p => p.category === "area").forEach(p => {
      if (p.category === "area") {
        const feature = boundaries?.features.find(f=>f.properties.placeId === p.id);
        if (!feature) return;
        const colorIndex = places.filter(place=>place.category === "area").findIndex(place=>place.id===p.id);
        const label = document.createElement("strong"); label.textContent = p.name;
        const layer = L.geoJSON(feature, {style: areaStyle(colorIndex, selectedRef.current?.id === p.id)})
          .bindTooltip(label, {sticky: true, direction: "top", className: "brazil-area-tooltip"})
          .on("mouseover", () => layer.setStyle(areaStyle(colorIndex, true)))
          .on("mouseout", () => layer.setStyle(areaStyle(colorIndex, selectedRef.current?.id === p.id)))
          .on("click", () => setSelected(p)) as AreaLayer;
        layer.addTo(group);
        areaLayersRef.current[p.id] = {layer, colorIndex};
        return;
      }
    });
    const pointGroups = new Map<string, Place[]>();
    visible.filter(p => p.category !== "area").forEach(p => { const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`; pointGroups.set(key, [...(pointGroups.get(key) || []), p]); });
    pointGroups.forEach(groupPlaces => {
      const p = groupPlaces[0];
      const c = categories[displayCategory(p)];
      const icon = L.divIcon({className: "brazil-marker-container", html: `<img class="brazil-map-pin" src="${c.icon}" alt="" width="48" height="60" draggable="false"/>${groupPlaces.length > 1 ? `<span class="map-pin-count">${groupPlaces.length}</span>` : ""}`, iconSize:[48,60], iconAnchor:[24,57], popupAnchor:[0,-48]});
      const popup = document.createElement("div");
      if (groupPlaces.length === 1) { const title = document.createElement("strong"); title.textContent = p.name; const text = document.createElement("p"); text.textContent = p.summary; popup.append(title,text); }
      else { const title = document.createElement("strong"); title.textContent = "Места по этому адресу"; popup.append(title); groupPlaces.forEach(place => { const button = document.createElement("button"); button.type = "button"; button.className = "map-popup-choice"; button.textContent = place.name; button.addEventListener("click", () => setSelected(place)); popup.append(button); }); }
      const title = groupPlaces.map(place => place.name).join(" · ");
      const marker = L.marker([p.lat,p.lng], {icon,title,alt:title,keyboard:true}).addTo(group).bindPopup(popup).on("click", () => { if (groupPlaces.length === 1) setSelected(p); });
      groupPlaces.forEach(place => { markerRefs.current[place.id] = marker; });
    });
  // Rebuild only for the map's filters, not selection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, query, enabled, boundaries]);
  const toggle = (category: Category) => { setEnabled(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]); setSelected(null); };
  return <section className="map-section" aria-label="Карта Флорианополиса">    <div className={selected?.category === "area" ? "map-workspace district-open detail-open" : selected ? "map-workspace detail-open" : "map-workspace map-overview"}><div className="map-main"><label className="map-search"><span className="sr-only">Поиск мест на карте</span><input type="search" placeholder="Найти место или район…" value={query} onChange={e => {setQuery(e.target.value); setSelected(null);}}/></label><div className="map-canvas" ref={container} aria-label="Интерактивная карта Флорианополиса; выберите место или район"/>{!ready && <div className="map-loading" role="status">{mapError ? "Карта не загрузилась. Обновите страницу, чтобы повторить попытку." : "Загружаем карту острова…"}</div>}
    <div className="map-layer-controls"><button type="button" className="map-area-toggle" aria-pressed={enabled.includes("area")} onClick={() => toggle("area")}>Районы</button><details className="map-filter-panel" open><summary>Показать на карте</summary><fieldset className="map-filters"><legend className="sr-only">Слои карты</legend><div className="map-layer-actions"><button type="button" onClick={()=>{setEnabled(prev => [...prev.filter(c => c === "area"), ...(Object.keys(categories) as Category[]).filter(c => c !== "area")]);setSelected(null);}}>Все слои</button><button type="button" onClick={()=>{setEnabled(prev => prev.filter(c => c === "area"));setSelected(null);}}>Скрыть слои</button></div>{(Object.keys(categories) as Category[]).filter(key => key !== "area").map(key => <label key={key}><input type="checkbox" checked={enabled.includes(key)} onChange={() => toggle(key)}/>{categories[key].icon ? <img className="filter-pin" src={categories[key].icon} alt="" width={23} height={28}/> : <span className="category-dot" style={{background: categories[key].color}}/>}{categories[key].label}<span className="filter-count">{scopedPlaces.filter(p=>placeCategories(p).includes(key)).length}</span></label>)}</fieldset></details></div>
    <button className="map-reset" onClick={() => mapRef.current?.fitBounds(scopedPlaces.map(p=>[p.lat, p.lng] as LatLng), {padding:[35,35]})}>Все места ↗</button>
    </div>{selected && <aside key={selected.id} ref={sidebar} className={selected?.category === "area" ? "map-sidebar district-sidebar" : "map-sidebar"}>{selected?.category === "area" ? <DistrictCard key={selected.id} place={selected} onBack={()=>setSelected(null)}/> : selected ? <div className="place-detail"><button className="detail-back" onClick={()=>setSelected(null)}>← К карте</button><h3>{selected.name}</h3>{selected.summary && <p>{selected.summary}</p>}{selected.note && <p>{selected.note}</p>}{selected.additionalCategories && <p className="venue-categories">{placeCategories(selected).map(c=>categories[c].label).join(" · ")}</p>}{selected.address && <p className="address">{selected.address}</p>}{selected.phone && <a href={`tel:${selected.phone.replace(/[^+\d]/g, "")}`}>{selected.phone}</a>}<Source href={selected.source}>{selected.sourceLabel}</Source><Source href={mapLink(selected)}>Найти по названию и адресу</Source></div> : null}</aside>}</div>
    <div className="map-caption" role="status">{boundaryError ? <>Не удалось загрузить границы районов. <button className="boundary-retry" onClick={()=>setBoundaryAttempt(n=>n+1)}>Повторить</button></> : !boundaries ? "Загружаем границы районов…" : <a href="https://redeplanejamento.pmf.sc.gov.br/pt-BR/planos/bairros" target="_blank" rel="noopener noreferrer">Границы районов: GeoFloripa · 2026 ↗</a>}{tileError && <p>Подложка недоступна. Границы и список мест работают.</p>}</div></section>;
}
