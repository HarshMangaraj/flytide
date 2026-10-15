
"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "flytide-flights-v1";

const DURATIONS = [5, 15, 25, 45, 60, 90, 120, 180];

const AIRPORTS = [
  { code: "BBI", name: "Bhubaneswar" },
  { code: "DEL", name: "New Delhi" },
  { code: "BOM", name: "Mumbai" },
  { code: "BLR", name: "Bengaluru" },
  { code: "HYD", name: "Hyderabad" },
];

const DESTINATIONS = [
  { code: "CCU", name: "Kolkata", distance: 364 },
  { code: "VTZ", name: "Visakhapatnam", distance: 385 },
  { code: "RPR", name: "Raipur", distance: 450 },
  { code: "LKO", name: "Lucknow", distance: 750 },
  { code: "HYD", name: "Hyderabad", distance: 840 },
  { code: "BLR", name: "Bengaluru", distance: 1190 },
  { code: "DEL", name: "New Delhi", distance: 1270 },
  { code: "BOM", name: "Mumbai", distance: 1370 },
];

const TIERS = [
  { name: "First Wings", threshold: 1000, symbol: "✈" },
  { name: "Sky Explorer", threshold: 5000, symbol: "✦" },
  { name: "Cloud Navigator", threshold: 20000, symbol: "✧" },
  { name: "Earth Circler", threshold: 40075, symbol: "◎" },
];

type FlightStatus = "flying" | "landed" | "diverted";

type Flight = {
  id: string;
  origin: string;
  destination: string;
  destinationName: string;
  duration: number;
  distance: number;
  startTime: number;
  endTime: number;
  status: FlightStatus;
  note: string;
};

function readFlights(): Flight[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (flight): flight is Flight =>
        typeof flight === "object" &&
        flight !== null &&
        typeof flight.id === "string" &&
        typeof flight.startTime === "number" &&
        typeof flight.endTime === "number" &&
        ["flying", "landed", "diverted"].includes(flight.status)
    );
  } catch {
    return [];
  }
}

function formatTime(milliseconds: number) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  return [hours, minutes, remainder]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Home() {
  const [duration, setDuration] = useState(25);
  const [airport, setAirport] = useState("BBI");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [showDestinations, setShowDestinations] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(0);
  const [note, setNote] = useState("");
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const currentTime = Date.now();

    const savedFlights = readFlights().map((flight) => {
      if (flight.status === "flying" && currentTime >= flight.endTime) {
        return { ...flight, status: "landed" as const };
      }
      return flight;
    });

    setFlights(savedFlights);
    setNow(currentTime);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
    } catch {
      // The app remains usable if browser storage is unavailable.
    }
  }, [flights, hydrated]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  // Automatically record a landing, even if the tab was in the background.
  useEffect(() => {
    if (!hydrated || now === 0) return;

    setFlights((previous) =>
      previous.map((flight) =>
        flight.status === "flying" && now >= flight.endTime
          ? { ...flight, status: "landed" }
          : flight
      )
    );
  }, [now, hydrated]);

  const activeFlight = flights.find((flight) => flight.status === "flying");

  const viewedFlight =
    flights.find((flight) => flight.id === selectedFlightId) ?? activeFlight;

  const isLanding =
    viewedFlight !== undefined &&
    (viewedFlight.status === "landed" ||
      (viewedFlight.status === "flying" && now >= viewedFlight.endTime));

  const departure = AIRPORTS.find((item) => item.code === airport)!;
  const maxDistance = duration * 13.9;

  const reachable = DESTINATIONS.filter(
    (item) => item.code !== airport && item.distance <= maxDistance
  );

  const miles = flights
    .filter((flight) => flight.status === "landed")
    .reduce((total, flight) => total + flight.distance, 0);

  const landedCount = flights.filter(
    (flight) => flight.status === "landed"
  ).length;

  const divertCount = flights.filter(
    (flight) => flight.status === "diverted"
  ).length;

  const bookFlight = useCallback(() => {
    const destination = DESTINATIONS.find(
      (item) => item.code === selectedCode
    );

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
      note: "",
    };

    setFlights((previous) => [flight, ...previous]);
    setSelectedFlightId(null);
    setNote("");
    setShowDestinations(false);
    setNow(startTime);
  }, [activeFlight, airport, duration, selectedCode]);

  function divertFlight(flightId: string) {
    setFlights((previous) =>
      previous.map((flight) =>
        flight.id === flightId && flight.status === "flying"
          ? { ...flight, status: "diverted" }
          : flight
      )
    );

    setSelectedFlightId(null);
    setNote("");
  }

  function completeFlight(flightId: string) {
    setFlights((previous) =>
      previous.map((flight) =>
        flight.id === flightId
          ? {
              ...flight,
              status: "landed",
              note: note.trim(),
            }
          : flight
      )
    );

    setSelectedFlightId(null);
    setNote("");
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080d19] text-white">
        Preparing your flight deck...
      </main>
    );
  }

  // Flight details and boarding pass.
  if (viewedFlight) {
    const remaining = viewedFlight.endTime - now;
    const landing = isLanding;

    return (
      <main className="min-h-screen bg-[#080d19] px-5 py-10 text-white md:px-8">
        <div className="mx-auto max-w-xl">
          <button
            onClick={() => {
              if (viewedFlight.status !== "flying" || landing) {
                setSelectedFlightId(null);
                setNote("");
              }
            }}
            className="mb-8 text-sm text-slate-400 hover:text-white"
          >
            ← Back to flight deck
          </button>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <p className="text-xs tracking-[0.25em] text-amber-300">
              FLYTIDE AIR · {landing ? "ARRIVAL" : "IN-FLIGHT"}
            </p>

            <h1 className="mt-5 text-3xl font-semibold md:text-4xl">
              {landing
                ? "Welcome to your destination."
                : "Cruising above the noise."}
            </h1>

            <p className="mt-3 text-slate-400">
              {viewedFlight.origin} → {viewedFlight.destination}
            </p>

            {!landing && (
              <div className="my-10 text-center">
                <p className="text-xs tracking-[0.2em] text-slate-500">
                  TIME UNTIL LANDING
                </p>
                <p className="mt-3 text-5xl font-semibold tabular-nums text-amber-300">
                  {formatTime(remaining)}
                </p>
                <p className="mt-3 text-sm text-slate-400">
                  Keep this tab open for the best experience.
                </p>
              </div>
            )}

            {landing && (
              <div className="my-8 rounded-2xl border border-emerald-400/30 p-4 text-emerald-300">
                ✦ Flight landed successfully. Your miles have been earned.
              </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-amber-300 text-slate-950">
              <div className="flex items-center justify-between border-b border-dashed border-slate-950/30 p-5">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em]">
                    FLYTIDE AIR
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">BOARDING PASS</h2>
                </div>
                <span className="text-4xl">✈</span>
              </div>

              <div className="grid grid-cols-2 gap-5 p-5">
                <div>
                  <p className="text-xs opacity-60">FROM</p>
                  <p className="mt-1 text-2xl font-bold">
                    {viewedFlight.origin}
                  </p>
                </div>

                <div>
                  <p className="text-xs opacity-60">TO</p>
                  <p className="mt-1 text-2xl font-bold">
                    {viewedFlight.destination}
                  </p>
                  <p className="text-sm">{viewedFlight.destinationName}</p>
                </div>

                <div>
                  <p className="text-xs opacity-60">FLIGHT TIME</p>
                  <p className="mt-1 font-semibold">
                    {viewedFlight.duration} MIN
                  </p>
                </div>

                <div>
                  <p className="text-xs opacity-60">
                    {landing ? "MILES EARNED" : "POTENTIAL MILES"}
                  </p>
                  <p className="mt-1 font-semibold">
                    {viewedFlight.distance.toLocaleString("en-IN")} KM
                  </p>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-950/30 p-5">
                <p className="text-xs opacity-60">DEPARTURE</p>
                <p className="mt-1 text-sm font-medium">
                  {formatDate(viewedFlight.startTime)}
                </p>
                <p className="mt-3 text-xs opacity-60">FLIGHT ID</p>
                <p className="mt-1 font-mono text-sm">
                  {viewedFlight.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {landing ? (
              <div className="mt-6">
                <label
                  htmlFor="journal"
                  className="block text-sm text-slate-400"
                >
                  Flight journal (optional)
                </label>

                <textarea
                  id="journal"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="What did you accomplish during this flight?"
                  maxLength={2000}
                  className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-[#101827] p-4 text-white outline-none focus:border-amber-300"
                />

                <button
                  onClick={() => completeFlight(viewedFlight.id)}
                  className="mt-3 w-full rounded-xl bg-amber-300 p-4 font-semibold text-slate-950 hover:bg-amber-200"
                >
                  Save journal & return to flight deck
                </button>
              </div>
            ) : viewedFlight.status === "flying" ? (
              <button
                onClick={() => divertFlight(viewedFlight.id)}
                className="mt-6 w-full rounded-xl border border-red-400/30 p-4 text-red-300 hover:bg-red-400/10"
              >
                Divert flight · End early (no miles)
              </button>
            ) : null}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080d19] px-5 py-8 text-white md:px-12">
      <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-white/10 pb-6">
        <button
          onClick={() => {
            setShowDestinations(false);
            setSelectedCode(null);
          }}
          className="text-2xl font-semibold tracking-tight"
        >
          flytide<span className="text-amber-300">.</span>
        </button>
        <span className="text-xs tracking-[0.2em] text-slate-400">
          YOUR FLIGHT DECK
        </span>
      </header>

      <section className="mx-auto max-w-5xl py-12 md:py-16">
        <p className="text-sm uppercase tracking-[0.25em] text-amber-300">
          Your next destination: deep focus
        </p>

        <h1 className="mt-5 text-5xl font-semibold leading-tight md:text-7xl">
          Leave the noise.
          <br />
          <span className="text-slate-400">Find your altitude.</span>
        </h1>

        <p className="mt-5 max-w-xl leading-7 text-slate-400">
          Every focus session is a flight. Pick your destination, settle into
          the cabin, and earn miles one minute at a time.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-medium">Plan your flight</h2>
              <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-xs text-emerald-300">
                {activeFlight ? "IN FLIGHT" : "READY"}
              </span>
            </div>

            <label
              htmlFor="airport"
              className="mb-2 mt-7 block text-sm text-slate-400"
            >
              Departure airport
            </label>

            <select
              id="airport"
              value={airport}
              disabled={Boolean(activeFlight)}
              onChange={(event) => {
                setAirport(event.target.value);
                setShowDestinations(false);
                setSelectedCode(null);
              }}
              className="w-full rounded-xl border border-white/10 bg-[#101827] px-4 py-3 outline-none focus:border-amber-300 disabled:opacity-60"
            >
              {AIRPORTS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} · {item.name}
                </option>
              ))}
            </select>

            <div className="mb-3 mt-7 flex items-center justify-between">
              <label className="text-sm text-slate-400">Flight duration</label>
              <span className="text-xl text-amber-300">{duration} min</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {DURATIONS.map((minutes) => (
                <button
                  key={minutes}
                  disabled={Boolean(activeFlight)}
                  onClick={() => {
                    setDuration(minutes);
                    setShowDestinations(false);
                    setSelectedCode(null);
                  }}
                  className={`rounded-xl border p-3 text-sm transition disabled:opacity-40 ${
                    duration === minutes
                      ? "border-amber-300 bg-amber-300 text-slate-950"
                      : "border-white/10 text-slate-300 hover:border-white/30"
                  }`}
                >
                  {minutes}m
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-[#0c1423] p-5">
              <p className="text-xs uppercase tracking-widest text-slate-500">
                Maximum flight distance
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {Math.round(maxDistance).toLocaleString("en-IN")} km
              </p>
              <p className="mt-2 text-sm text-slate-400">
                At approximately 830 km/h
              </p>
            </div>

            <button
              disabled={Boolean(activeFlight)}
              onClick={() => {
                setShowDestinations(true);
                setSelectedCode(null);
              }}
              className="mt-6 w-full rounded-xl bg-amber-300 p-4 font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-50"
            >
              Find my destination ↗
            </button>

            {activeFlight && (
              <button
                onClick={() => setSelectedFlightId(activeFlight.id)}
                className="mt-3 w-full rounded-xl border border-white/10 p-4 text-slate-200"
              >
                Return to active flight
              </button>
            )}
          </section>

          <aside className="flex min-h-80 flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-[#172440] to-[#090e19] p-7">
            <div>
              <p className="text-xs tracking-widest text-slate-400">
                YOUR JOURNEY
              </p>
              <div className="mt-12 text-6xl">✈</div>
              <h2 className="mt-5 text-2xl">One flight at a time.</h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Build focus. Collect miles. Reach new horizons.
              </p>
            </div>

            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-xs text-slate-500">TOTAL MILES</p>
              <p className="mt-1 text-3xl font-semibold text-amber-300">
                {miles.toLocaleString("en-IN")} km
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {landedCount} landed · {divertCount} diverted
              </p>
            </div>
          </aside>
        </div>

        {showDestinations && (
          <section className="mt-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.2em] text-amber-300">
                  AVAILABLE ROUTES
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Choose your destination
                </h2>
              </div>
              <span className="text-sm text-slate-400">
                {reachable.length} destinations
              </span>
            </div>

            {reachable.length === 0 ? (
              <p className="rounded-2xl border border-white/10 p-6 text-slate-400">
                No sample routes in range. Try a longer flight.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reachable.map((destination) => (
                  <button
                    key={destination.code}
                    onClick={() => setSelectedCode(destination.code)}
                    className={`rounded-2xl border p-5 text-left transition ${
                      selectedCode === destination.code
                        ? "border-amber-300 bg-amber-300/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/30"
                    }`}
                  >
                    <span className="inline-block rounded-md bg-amber-300 px-2 py-1 text-xs font-bold text-slate-950">
                      {destination.code}
                    </span>
                    <h3 className="mt-4 text-lg font-medium">
                      {destination.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {destination.distance.toLocaleString("en-IN")} km
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Approx. {Math.ceil(destination.distance / 13.9)} min
                      focus
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selectedCode && (
              <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/[0.04] p-5">
                <p className="text-sm text-slate-400">Ready for departure</p>
                <h3 className="mt-1 text-xl font-semibold">
                  {DESTINATIONS.find((item) => item.code === selectedCode)?.name}
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  {duration} minutes of focus ·{" "}
                  {DESTINATIONS.find((item) => item.code === selectedCode)?.distance.toLocaleString("en-IN")} km
                </p>
                <button
                  onClick={bookFlight}
                  disabled={Boolean(activeFlight)}
                  className="mt-5 w-full rounded-xl bg-amber-300 p-4 font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-50"
                >
                  Book flight & start focus
                </button>
              </div>
            )}
          </section>
        )}

        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] text-amber-300">
                FREQUENT FLYER PROGRAM
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Your membership</h2>
            </div>
            <span className="text-sm text-slate-400">
              {miles.toLocaleString("en-IN")} km
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => {
              const unlocked = miles >= tier.threshold;

              return (
                <div
                  key={tier.name}
                  className={`rounded-2xl border p-5 ${
                    unlocked
                      ? "border-amber-300/50 bg-amber-300/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="text-2xl text-amber-300">{tier.symbol}</div>
                  <h3 className="mt-4 font-semibold">{tier.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {tier.threshold.toLocaleString("en-IN")} km
                  </p>
                  <p
                    className={`mt-3 text-xs ${
                      unlocked ? "text-amber-300" : "text-slate-500"
                    }`}
                  >
                    {unlocked ? "UNLOCKED" : "LOCKED"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Flight log</h2>
            <span className="text-sm text-slate-500">
              {flights.length} flights
            </span>
          </div>

          {flights.length === 0 ? (
            <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-500">
              Your journey starts with your first flight.
            </p>
          ) : (
            <div className="space-y-3">
              {flights.map((flight) => (
                <button
                  key={flight.id}
                  onClick={() => {
                    if (flight.status !== "diverted") {
                      setSelectedFlightId(flight.id);
                      setNote(flight.note);
                    }
                  }}
                  className="block w-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-left transition hover:border-white/25"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">
                      {flight.origin} → {flight.destination}
                    </p>
                    <span
                      className={`text-xs ${
                        flight.status === "landed"
                          ? "text-emerald-300"
                          : flight.status === "diverted"
                            ? "text-red-300"
                            : "text-amber-300"
                      }`}
                    >
                      {flight.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {flight.destinationName} · {flight.duration} min
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {flight.status === "landed" ? "Earned" : "Potential"}{" "}
                    {flight.status === "diverted" ? "0" : flight.distance.toLocaleString("en-IN")} km
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatDate(flight.startTime)}
                    {flight.status !== "diverted" ? " · View boarding pass" : ""}
                  </p>
                  {flight.note && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-300">
                      {flight.note}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-16 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500">
          <span>BUILT FOR THE JOURNEY, NOT THE NOISE.</span>
          <span>FLYTIDE © 2026</span>
        </footer>
      </section>
    </main>
  );
}
