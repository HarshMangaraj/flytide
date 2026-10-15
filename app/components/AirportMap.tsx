
"use client";

import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";

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
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || airports.length === 0) return;

    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

    const origin = airports.find((airport) => airport.code === originCode);
    const destination = airports.find(
      (airport) => airport.code === destinationCode
    );

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
      // Add airport markers. Popups appear only when a marker is clicked.
      airports.forEach((airport) => {
        const isOrigin = airport.code === originCode;
        const isDestination = airport.code === destinationCode;

        const markerElement = document.createElement("button");
        markerElement.type = "button";
        markerElement.setAttribute(
          "aria-label",
          `${airport.code} — ${airport.city}`
        );

        Object.assign(markerElement.style, {
          width: isOrigin || isDestination ? "19px" : "13px",
          height: isOrigin || isDestination ? "19px" : "13px",
          borderRadius: "50%",
          background: isOrigin
            ? "#fbbf24"
            : isDestination
              ? "#10b981"
              : "#e2e8f0",
          border: "2px solid #0f172a",
          boxShadow: isOrigin
            ? "0 0 12px rgba(251,191,36,0.65)"
            : isDestination
              ? "0 0 12px rgba(16,185,129,0.65)"
              : "none",
          cursor: "pointer",
          padding: "0",
        });

        const popup = new Popup({
          offset: 12,
          closeButton: true,
          maxWidth: "240px",
        }).setHTML(
          `<div style="color:#0f172a;font-family:system-ui">
            <strong>${airport.code} — ${airport.city}</strong>
            <div style="margin-top:4px">${airport.name}</div>
            <div style="margin-top:2px;color:#64748b">${airport.country}</div>
          </div>`
        );

        new Marker({ element: markerElement })
          .setLngLat([airport.lon, airport.lat])
          .setPopup(popup)
          .addTo(map);
      });

      // Draw the flight route when both airports are available.
      if (origin && destination && origin.code !== destination.code) {
        const routeData = {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [origin.lon, origin.lat],
              [destination.lon, destination.lat],
            ],
          },
        };

        map.addSource("flight-route", {
          type: "geojson",
          data: routeData,
        });

        map.addLayer({
          id: "flight-route-glow",
          type: "line",
          source: "flight-route",
          paint: {
            "line-color": "#fbbf24",
            "line-width": 7,
            "line-opacity": 0.2,
          },
        });

        map.addLayer({
          id: "flight-route-line",
          type: "line",
          source: "flight-route",
          paint: {
            "line-color": "#fbbf24",
            "line-width": 2.5,
            "line-opacity": 0.95,
            "line-dasharray": [2, 1.5],
          },
        });

        const bounds = [
          [
            Math.min(origin.lon, destination.lon),
            Math.min(origin.lat, destination.lat),
          ],
          [
            Math.max(origin.lon, destination.lon),
            Math.max(origin.lat, destination.lat),
          ],
        ] as [[number, number], [number, number]];

        map.fitBounds(bounds, {
          padding: { top: 70, bottom: 70, left: 70, right: 70 },
          maxZoom: 5,
          duration: 800,
        });
      }
    });

    map.on("error", (event) => {
      console.error("Flytide map error:", event.error);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [airports, originCode, destinationCode]);

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a1323]">
      <div
        ref={containerRef}
        className="h-[420px] w-full sm:h-[500px] lg:h-[575px]"
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 px-5 py-4 text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          Departure
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Destination
        </span>

        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-slate-200" />
          Other airports
        </span>

        {destinationCode && (
          <span className="ml-auto text-amber-300">
            {originCode} → {destinationCode}
          </span>
        )}
      </div>
    </div>
  );
}
