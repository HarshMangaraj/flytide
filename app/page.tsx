
"use client";

import { useEffect, useState } from "react";

const durations = [5, 15, 25, 45, 60, 90, 120, 180];

const airports = [
  { code: "BBI", name: "Bhubaneswar" },
  { code: "DEL", name: "New Delhi" },
  { code: "BOM", name: "Mumbai" },
  { code: "BLR", name: "Bengaluru" },
  { code: "HYD", name: "Hyderabad" },
];

const destinations = [
  { code: "CCU", name: "Kolkata", distance: 364 },
  { code: "VTZ", name: "Visakhapatnam", distance: 385 },
  { code: "RPR", name: "Raipur", distance: 450 },
  { code: "LKO", name: "Lucknow", distance: 750 },
  { code: "DEL", name: "New Delhi", distance: 1270 },
  { code: "BOM", name: "Mumbai", distance: 1370 },
  { code: "BLR", name: "Bengaluru", distance: 1190 },
  { code: "HYD", name: "Hyderabad", distance: 840 },
];

type Flight = {
  id: string;
  origin: string;
  destination: string;
  destinationName: string;
  duration: number;
  distance: number;
  startTime: number;
  endTime: number;
  status: "flying" | "landed" | "diverted";
};

const STORAGE_KEY = "flytide-flights-v1";

function readFlights(): Flight[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) as Flight[] : [];
  } catch {
    return [];
  }
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export default function Home() {
  const [duration, setDuration] = useState(25);
  const [airport, setAirport] = useState("BBI");
  const [showDestinations, setShowDestinations] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [note, setNote] = useState("");

  useEffect(() => {
    const savedFlights = readFlights().map((flight) => {
      if (flight.status === "flying" && Date.now() >= flight.endTime) {
        return { ...flight, status: "landed" as const };
      }
      return flight;
    });

    setFlights(savedFlights);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
  }, [flights, hydrated]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const activeFlight = flights.find((flight) => flight.status === "flying");
  const landedFlight = flights.find(
    (flight) => flight.status === "landed" && flight.endTime <= now
  );

  const departure = airports.find((item) => item.code === airport)!;
  const maxDistance = duration * 13.9;
  const reachable = destinations.filter(
    (item) => item.code !== airport && item.distance <= maxDistance
  );

  function bookFlight() {
    const destination = destinations.find((item) => item.code === selectedCode);
    if (!destination || activeFlight) return;

    const startTime = Date.now();
    const flight: Flight = {
      id: crypto.randomUUID(),
      origin: airport,
      destination: destination.code,
      destinationName: destination.name,
      duration,
      distance: destination.distance,
      startTime,
      endTime: startTime + duration * 60_000,
      status: "flying",
    };

    setFlights((previous) => [flight, ...previous]);
    setNote("");
    setNow(startTime);
  }

  function divertFlight(flightId: string) {
    setFlights((previous) =>
      previous.map((flight) =>
        flight.id === flightId && flight.status === "flying"
          ? { ...flight, status: "diverted" }
          : flight
      )
    );
  }

  function saveNote(flightId: string) {
    setFlights((previous) =>
      previous.map((flight) =>
        flight.id === flightId ? { ...flight, note } : flight
      )
    );
    setNote("");
  }

  if (!hydrated) {
    return <main className="min-h-screen bg-[#080d19] p-10 text-white">Preparing flight deck...</main>;
  }

  if (activeFlight) {
    const remaining = activeFlight.endTime - now;
    const landed = remaining <= 0;

    return (
      <main className="min-h-screen bg-[#080d19] px-6 py-16 text-white">
        <section className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-xs tracking-[0.25em] text-amber-300">
            FLYTIDE · IN-FLIGHT
          </p>
          <h1 className="mt-5 text-4xl font-semibold">
            {landed ? "Welcome to your destination." : "Cruising above the noise."}
          </h1>
          <p className="mt-3 text-slate-400">
            {activeFlight.origin} → {activeFlight.destination}
          </p>

          <div className="my-10 text-center">
            <div className="text-5xl font-semibold tabular-nums text-amber-300">
              {formatTime(remaining)}
            </div>
            <p className="mt-3 text-sm text-slate-400">
              {landed ? "Flight complete" : "Time until landing"}
            </p>
          </div>

          <div className="rounded-2xl bg-[#0c1423] p-5">
            <p className="text-sm text-slate-400">Destination</p>
            <p className="mt-1 text-xl font-medium">{activeFlight.destinationName}</p>
            <p className="mt-2 text-sm text-slate-400">
              {activeFlight.distance.toLocaleString("en-IN")} km ·{" "}
              {activeFlight.duration} minutes
            </p>
          </div>

          {landed ? (
            <div className="mt-6">
              <p className="rounded-xl border border-emerald-400/30 p-4 text-emerald-300">
                ✦ Landed successfully! Your flight is saved.
              </p>
              <label className="mt-6 block text-sm text-slate-400">
                Flight journal (optional)
              </label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What did you accomplish?"
                className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-[#101827] p-4 text-white outline-none focus:border-amber-300"
              />
              <button
                onClick={() => saveNote(activeFlight.id)}
                className="mt-3 w-full rounded-xl bg-amber-300 p-4 font-semibold text-slate-950"
              >
                Save journal & return to flight deck
              </button>
            </div>
          ) : (
            <button
              onClick={() => divertFlight(activeFlight.id)}
              className="mt-6 w-full rounded-xl border border-red-400/30 p-4 text-red-300 hover:bg-red-400/10"
            >
              Divert flight · End early (no miles)
            </button>
          )}
        </section>
      </main>
    );
  }

  const miles = flights
    .filter((flight) => flight.status === "landed")
    .reduce((sum, flight) => sum + flight.distance, 0);

  return (
    <main className="min-h-screen bg-[#080d19] px-6 py-12 text-white md:px-12">
      <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-white/10 pb-6">
        <span className="text-2xl font-semibold">flytide<span className="text-amber-300">.</span></span>
        <span className="text-xs tracking-[0.2em] text-slate-400">YOUR FLIGHT DECK</span>
      </header>

      <section className="mx-auto max-w-5xl py-14">
        <p className="text-sm uppercase tracking-[0.25em] text-amber-300">Your next destination: deep focus</p>
        <h1 className="mt-5 text-5xl font-semibold leading-tight md:text-7xl">
          Leave the noise.<br /><span className="text-slate-400">Find your altitude.</span>
        </h1>
        <p className="mt-5 max-w-xl leading-7 text-slate-400">
          Every focus session is a flight. Pick your destination, settle into the cabin, and earn miles one minute at a time.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <h2 className="text-xl font-medium">Plan your flight</h2>
            <label htmlFor="airport" className="mb-2 mt-6 block text-sm text-slate-400">Departure airport</label>
            <select id="airport" value={airport} disabled={Boolean(activeFlight)} onChange={(event) => { setAirport(event.target.value); setShowDestinations(false); setSelectedCode(null); }} className="w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3">
              {airports.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}
            </select>

            <div className="mb-3 mt-7 flex justify-between">
              <label className="text-sm text-slate-400">Duration</label>
              <span className="text-xl text-amber-300">{duration} min</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {durations.map((minutes) => (
                <button key={minutes} onClick={() => { setDuration(minutes); setShowDestinations(false); setSelectedCode(null); }} className={`rounded-xl border p-3 text-sm ${duration === minutes ? "border-amber-300 bg-amber-300 text-slate-950" : "border-white/10 text-slate-300"}`}>
                  {minutes}m
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-[#0c1423] p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500">Maximum distance</p>
              <p className="mt-2 text-3xl font-semibold">{Math.round(maxDistance).toLocaleString("en-IN")} km</p>
            </div>

            <button onClick={() => setShowDestinations(true)} className="mt-6 w-full rounded-xl bg-amber-300 p-4 font-semibold text-slate-950">
              Find my destination ↗
            </button>
          </section>

          <aside className="flex min-h-80 flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-[#172440] to-[#090e19] p-7">
            <div>
              <p className="text-xs tracking-widest text-slate-400">YOUR JOURNEY</p>
              <div className="mt-12 text-6xl">✈</div>
              <h2 className="mt-5 text-2xl">One flight at a time.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">Build focus. Collect miles. Reach new horizons.</p>
            </div>
            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-xs text-slate-500">TOTAL MILES</p>
              <p className="mt-1 text-2xl font-semibold text-amber-300">{miles.toLocaleString("en-IN")} km</p>
            </div>
          </aside>
        </div>

        {showDestinations && (
          <section className="mt-10">
            <h2 className="mb-5 text-2xl font-semibold">Choose your destination</h2>
            {reachable.length === 0 ? <p className="text-slate-400">No sample routes in range. Try a longer flight.</p> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reachable.map((destination) => (
                  <button key={destination.code} onClick={() => setSelectedCode(destination.code)} className={`rounded-2xl border p-5 text-left ${selectedCode === destination.code ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-white/[0.03]"}`}>
                    <span className="rounded-md bg-amber-300 px-2 py-1 text-xs font-bold text-slate-950">{destination.code}</span>
                    <h3 className="mt-4 text-lg">{destination.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{destination.distance.toLocaleString("en-IN")} km</p>
                    <p className="mt-2 text-xs text-slate-500">Approx. {Math.ceil(destination.distance / 13.9)} min</p>
                  </button>
                ))}
              </div>
            )}

            {selectedCode && (
              <div className="mt-5 rounded-2xl border border-amber-300/30 p-5">
                <p className="text-slate-400">Selected destination</p>
                <p className="mt-1 text-xl font-semibold">{destinations.find((item) => item.code === selectedCode)?.name}</p>
                <button onClick={bookFlight} disabled={Boolean(activeFlight)} className="mt-5 w-full rounded-xl bg-amber-300 p-4 font-semibold text-slate-950 disabled:opacity-50">
                  Book flight & start focus
                </button>
              </div>
            )}
          </section>
        )}

        <section className="mt-14">
          <h2 className="mb-4 text-xl font-semibold">Flight log</h2>
          {flights.length === 0 ? <p className="text-sm text-slate-500">Your journey starts with your first flight.</p> : (
            <div className="space-y-3">
              {flights.map((flight) => (
                <div key={flight.id} className="rounded-xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{flight.origin} → {flight.destination}</p>
                    <span className={`text-xs ${flight.status === "landed" ? "text-emerald-300" : flight.status === "diverted" ? "text-red-300" : "text-amber-300"}`}>{flight.status.toUpperCase()}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{flight.duration} min · {flight.distance} km</p>
                  {flight.note && <p className="mt-3 text-sm text-slate-300">{flight.note}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
