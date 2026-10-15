
"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";

setWorkerUrl("maplibre/maplibre-gl-worker.mjs");

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
};

export default function AirportMap({
  airports,
  originCode,
  destinationCode,
}: AirportMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [84, 22],
      zoom: 3.5,
      attributionControl: {},
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const drawAirports = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      airports.forEach((airport) => {
        const isOrigin = airport.code === originCode;
        const isDestination = airport.code === destinationCode;

        const element = document.createElement("div");
        element.style.width = isOrigin || isDestination ? "16px" : "10px";
        element.style.height = isOrigin || isDestination ? "16px" : "10px";
        element.style.borderRadius = "50%";
        element.style.background = isOrigin
          ? "#fbbf24"
          : isDestination
            ? "#34d399"
            : "#e2e8f0";
        element.style.border = "2px solid #07101f";
        element.style.boxShadow = "0 0 12px rgba(251,191,36,.5)";
        element.title = `${airport.code} · ${airport.city}`;

        const marker = new maplibregl.Marker({ element })
          .setLngLat([airport.lon, airport.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 12 }).setHTML(
              `<strong>${airport.code}</strong><br/>${airport.city}`
            )
          )
          .addTo(map);

        markersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) {
      drawAirports();
    } else {
      map.once("load", drawAirports);
    }

    return () => {
      map.off("load", drawAirports);
    };
  }, [airports, originCode, destinationCode]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div
        ref={containerRef}
        className="h-[420px] w-full bg-[#0a1323]"
        aria-label="Interactive airport map"
      />
      <div className="flex flex-wrap gap-5 bg-[#0a1323] px-4 py-3 text-xs text-slate-400">
        <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />Departure</span>
        <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />Destination</span>
        <span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-slate-200" />Other airports</span>
      </div>
    </div>
  );
}
