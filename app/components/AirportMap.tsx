"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";

type Airport = {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
};

type AirportMapProps = {
  airports: Airport[];
  originCode: string;
  destinationCode?: string;
  onSelectDestination?: (code: string) => void;
};

export default function AirportMap({
  airports,
  originCode,
  destinationCode,
  onSelectDestination,
}: AirportMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelectDestination);

  useEffect(() => {
    onSelectRef.current = onSelectDestination;
  }, [onSelectDestination]);

  useEffect(() => {
    if (!containerRef.current || airports.length === 0) return;

    // Worker files are copied to public/maplibre by the project's predev/prebuild scripts.
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const origin = airports.find((item) => item.code === originCode);
    const destination = airports.find((item) => item.code === destinationCode);
    let disposed = false;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: origin ? [origin.lon, origin.lat] : [84, 22],
      zoom: 4,
      attributionControl: true,
    });

    mapRef.current = map;
    map.addControl(new NavigationControl(), "top-right");

    map.on("load", () => {
      if (disposed) return;

      airports.forEach((airport) => {
        const isOrigin = airport.code === originCode;
        const isDestination = airport.code === destinationCode;
        const markerElement = document.createElement("button");
        markerElement.type = "button";
        markerElement.setAttribute("aria-label", `${airport.code} — ${airport.city}`);
        markerElement.title = `${airport.code} · ${airport.city}${isOrigin ? " · Departure" : isDestination ? " · Selected destination" : " · Select destination"}`;
        Object.assign(markerElement.style, {
          width: isOrigin || isDestination ? "19px" : "13px",
          height: isOrigin || isDestination ? "19px" : "13px",
          borderRadius: "50%",
          background: isOrigin ? "#fbbf24" : isDestination ? "#10b981" : "#e2e8f0",
          border: "2px solid #0f172a",
          boxShadow: isOrigin ? "0 0 12px rgba(251,191,36,.65)" : isDestination ? "0 0 12px rgba(16,185,129,.65)" : "none",
          cursor: isOrigin ? "default" : "pointer",
          padding: "0",
        });

        // Build popup DOM safely instead of injecting airport data as HTML.
        const popupContent = document.createElement("div");
        popupContent.style.color = "#0f172a";
        popupContent.style.fontFamily = "system-ui, sans-serif";
        const title = document.createElement("strong");
        title.textContent = `${airport.code} — ${airport.city}`;
        const name = document.createElement("div");
        name.style.marginTop = "4px";
        name.textContent = airport.name;
        const country = document.createElement("div");
        country.style.marginTop = "2px";
        country.style.color = "#64748b";
        country.textContent = airport.country;
        const hint = document.createElement("div");
        hint.style.marginTop = "8px";
        hint.style.color = "#92400e";
        hint.textContent = isOrigin ? "Departure airport" : "Click marker to select this destination";
        popupContent.append(title, name, country, hint);

        const popup = new Popup({ offset: 12, closeButton: true, maxWidth: "240px" }).setDOMContent(popupContent);
        const marker = new Marker({ element: markerElement })
          .setLngLat([airport.lon, airport.lat])
          .setPopup(popup)
          .addTo(map);

        markerElement.addEventListener("click", () => {
          if (!isOrigin) onSelectRef.current?.(airport.code);
        });
      });

      if (origin && destination && origin.code !== destination.code) {
        const routeData = {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [[origin.lon, origin.lat], [destination.lon, destination.lat]],
          },
        };

        map.addSource("flight-route", { type: "geojson", data: routeData });
        map.addLayer({
          id: "flight-route-glow",
          type: "line",
          source: "flight-route",
          paint: { "line-color": "#fbbf24", "line-width": 8, "line-opacity": 0.18 },
        });
        map.addLayer({
          id: "flight-route-line",
          type: "line",
          source: "flight-route",
          paint: { "line-color": "#fbbf24", "line-width": 2.5, "line-opacity": 0.98, "line-dasharray": [2, 1.5] },
        });

        map.fitBounds(
          [
            [Math.min(origin.lon, destination.lon), Math.min(origin.lat, destination.lat)],
            [Math.max(origin.lon, destination.lon), Math.max(origin.lat, destination.lat)],
          ],
          { padding: { top: 70, bottom: 70, left: 70, right: 70 }, maxZoom: 5, duration: 700 }
        );
      } else if (origin) {
        map.easeTo({ center: [origin.lon, origin.lat], zoom: 4, duration: 500 });
      }
    });

    map.on("error", (event) => {
      console.error("Flytide map error:", event.error);
    });

    return () => {
      disposed = true;
      map.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [airports, originCode, destinationCode]);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a1323]">
      <div ref={containerRef} className="h-[420px] w-full sm:h-[500px] lg:h-[575px]" />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 px-5 py-4 text-sm text-slate-400">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-400" />Departure</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" />Destination</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-200" />Other airports</span>
        {destinationCode && <span className="ml-auto text-amber-300">{originCode} → {destinationCode}</span>}
      </div>
    </div>
  );
}
