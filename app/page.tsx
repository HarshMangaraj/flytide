
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
  { code: "CCU", name: "Kolkata", distance: 364, image: "photo-1571679654681-ba01b9e1e117" },
  { code: "VTZ", name: "Visakhapatnam", distance: 385, image: "photo-1500530855697-b586d89ba3ee" },
  { code: "RPR", name: "Raipur", distance: 450, image: "photo-1519608487953-e999c86e7455" },
  { code: "LKO", name: "Lucknow", distance: 750, image: "photo-1519501025264-65ba15a82390" },
  { code: "HYD", name: "Hyderabad", distance: 840, image: "photo-1517248135467-4c7edcad34c4" },
  { code: "BLR", name: "Bengaluru", distance: 1190, image: "photo-1519608487953-e999c86e7455" },
  { code: "DEL", name: "New Delhi", distance: 1270, image: "photo-1519501025264-65ba15a82390" },
  { code: "BOM", name: "Mumbai", distance: 1370, image: "photo-1519608487953-e999c86e7455" },
];

const TIERS = [
  { name: "First Wings", threshold: 1000, symbol: "✦" },
  { name: "Sky Explorer", threshold: 5000, symbol: "✈" },
  { name: "Cloud Navigator", threshold: 20000, symbol: "♧" },
  { name: "Earth Circler", threshold: 40075, symbol: "◎" },
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
  note: string;
};

function readFlights(): Flight[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed: unknown = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is Flight =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.startTime === "number" &&
        typeof item.endTime === "number" &&
        ["flying", "landed", "diverted"].includes(item.status)
    );
  } catch {
    return [];
  }
}

function formatTime(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function routeImage(code: string) {
  const destination = DESTINATIONS.find((item) => item.code === code);
  return destination
    ? `https://images.unsplash.com/${destination.image}?auto=format&fit=crop&w=700&q=80`
    : "";
}

function Icon({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={className}>
      {children}
    </span>
  );
}

export default function Home() {
  const [duration, setDuration] = useState(45);
  const [airport, setAirport] = useState("BBI");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [showDestinations, setShowDestinations] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(0);
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [page, setPage] = useState("Flight Deck");
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const time = Date.now();
    const saved = readFlights().map((flight) =>
      flight.status === "flying" && time >= flight.endTime
        ? { ...flight, status: "landed" as const }
        : flight
    );

    setFlights(saved);
    setNow(time);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flights));
    } catch {
      // Keep the current session usable if browser storage is unavailable.
    }
  }, [flights, hydrated]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!hydrated || now === 0) return;

    setFlights((previous) => {
      const completed = previous.find(
        (flight) => flight.status === "flying" && now >= flight.endTime
      );

      if (completed) setSelectedFlightId(completed.id);

      return previous.map((flight) =>
        flight.status === "flying" && now >= flight.endTime
          ? { ...flight, status: "landed" as const }
          : flight
      );
    });
  }, [now, hydrated]);

  const activeFlight = flights.find((flight) => flight.status === "flying");
  const viewedFlight =
    flights.find((flight) => flight.id === selectedFlightId) ?? activeFlight;

  const isLanding =
    !!viewedFlight &&
    (viewedFlight.status === "landed" ||
      (viewedFlight.status === "flying" && now >= viewedFlight.endTime));

  const miles = flights
    .filter((flight) => flight.status === "landed")
    .reduce((sum, flight) => sum + flight.distance, 0);

  const landedCount = flights.filter((f) => f.status === "landed").length;
  const divertedCount = flights.filter((f) => f.status === "diverted").length;
  const totalFocus = flights
    .filter((f) => f.status === "landed")
    .reduce((sum, f) => sum + f.duration, 0);

  const maxDistance = duration * 13.9;
  const reachable = DESTINATIONS.filter(
    (item) => item.code !== airport && item.distance <= maxDistance
  );
  const departure = AIRPORTS.find((item) => item.code === airport)!;
  const currentTier = [...TIERS].reverse().find((tier) => miles >= tier.threshold);
  const nextTier = TIERS.find((tier) => miles < tier.threshold);
  const tierProgress = nextTier
    ? Math.min(100, (miles / nextTier.threshold) * 100)
    : 100;

  const bookFlight = useCallback(() => {
    const destination = DESTINATIONS.find((item) => item.code === selectedCode);
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
    setSelectedFlightId(flight.id);
    setNote("");
    setShowDestinations(false);
    setPage("Flight Deck");
    setNow(startTime);
  }, [activeFlight, airport, duration, selectedCode]);

  function divertFlight(id: string) {
    setFlights((previous) =>
      previous.map((flight) =>
        flight.id === id && flight.status === "flying"
          ? { ...flight, status: "diverted" }
          : flight
      )
    );
    setSelectedFlightId(null);
    setNote("");
  }

  function saveJournal(id: string) {
    setFlights((previous) =>
      previous.map((flight) =>
        flight.id === id
          ? { ...flight, status: "landed", note: note.trim() }
          : flight
      )
    );
    setSelectedFlightId(null);
    setNote("");
    setPage("Flight Deck");
  }

  function openFlight(flight: Flight) {
    if (flight.status === "diverted") return;
    setSelectedFlightId(flight.id);
    setNote(flight.note);
    setPage("Flight Deck");
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060b16] text-white">
        Preparing your flight deck...
      </main>
    );
  }

  const navItems = [
    { label: "Flight Deck", icon: "⌂" },
    { label: "Map", icon: "◎" },
    { label: "Journal", icon: "▤" },
    { label: "Flight Log", icon: "☷" },
    { label: "Miles", icon: "★" },
    { label: "Membership", icon: "♛" },
  ];

  return (
    <main className="min-h-screen bg-[#060b16] text-slate-100">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/[0.08] bg-[#080e1b] px-4 py-6 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            onClick={() => setPage("Flight Deck")}
            className="mb-10 px-3 text-left text-3xl font-bold tracking-tight"
          >
            flytide<span className="text-amber-400">.</span>
          </button>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setPage(item.label);
                  setSelectedFlightId(null);
                  setMobileMenu(false);
                  setShowDestinations(false);
                }}
                className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left text-sm transition ${
                  page === item.label
                    ? "border-l-2 border-amber-400 bg-white/[0.08] text-white"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="w-5 text-center text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="text-2xl text-amber-400">✈</div>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
              Focus flies you further
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Small steps.
              <br />
              Big horizons.
            </p>
          </div>
        </aside>

        {mobileMenu && (
          <button
            aria-label="Close menu"
            onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          />
        )}

        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-white/[0.07] px-5 md:px-8">
            <button
              onClick={() => setMobileMenu((value) => !value)}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 lg:hidden"
            >
              ☰
            </button>

            <div className="hidden text-xs tracking-[0.2em] text-slate-500 md:block">
              YOUR PERSONAL FLIGHT DECK
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-amber-300">✧</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-sm font-semibold">
                H
              </div>
              <span className="text-sm text-slate-300">Pilot</span>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
            {page === "Flight Deck" && (
              <>
                <section className="relative mb-7 min-h-[220px] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#101b30]">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-70"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, #07101f 0%, rgba(7,16,31,.95) 35%, rgba(7,16,31,.12) 100%), url('https://images.unsplash.com/photo-1474302770737-173ee21bab63?auto=format&fit=crop&w=1600&q=85')",
                    }}
                  />
                  <div className="relative max-w-2xl px-6 py-10 md:px-10 md:py-12">
                    <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-300">
                      Your next destination
                    </p>
                    <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                      Leave the noise.
                      <br />
                      <span className="text-amber-300">
                        Find your altitude.
                      </span>
                    </h1>
                    <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
                      Every focus session is a flight. Pick your destination,
                      settle into the cabin, and earn miles one minute at a time.
                    </p>
                  </div>
                </section>

                <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.8fr)]">
                  <div className="min-w-0 space-y-5">
                    <section className="rounded-2xl border border-white/[0.09] bg-[#0a1323] p-5 md:p-7">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-xl font-semibold">
                          <Icon className="mr-3 text-amber-300">✈</Icon>
                          Plan your flight
                        </h2>
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs ${
                            activeFlight
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-emerald-400/10 text-emerald-300"
                          }`}
                        >
                          ● {activeFlight ? "IN FLIGHT" : "READY FOR DEPARTURE"}
                        </span>
                      </div>

                      <div className="mt-7 grid gap-5 md:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.5fr)]">
                        <label className="block text-sm text-slate-400">
                          Departure airport
                          <select
                            value={airport}
                            disabled={!!activeFlight}
                            onChange={(event) => {
                              setAirport(event.target.value);
                              setSelectedCode(null);
                            }}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-[#101c30] px-3 py-3 text-sm text-white outline-none focus:border-amber-300 disabled:opacity-50"
                          >
                            {AIRPORTS.map((item) => (
                              <option key={item.code} value={item.code}>
                                {item.code} · {item.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div>
                          <p className="mb-2 text-sm text-slate-400">
                            Focus duration
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {DURATIONS.map((minutes) => (
                              <button
                                key={minutes}
                                disabled={!!activeFlight}
                                onClick={() => {
                                  setDuration(minutes);
                                  setSelectedCode(null);
                                }}
                                className={`rounded-xl border px-2 py-3 text-xs transition md:text-sm ${
                                  duration === minutes
                                    ? "border-amber-300 bg-amber-300 text-slate-950 font-semibold"
                                    : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/30"
                                }`}
                              >
                                {minutes}m
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-400">
                            Available destinations
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            From {departure.name} · Up to{" "}
                            {Math.round(maxDistance).toLocaleString("en-IN")} km
                          </p>
                        </div>
                        <button
                          onClick={() => setShowDestinations((value) => !value)}
                          className="text-xs text-amber-300 underline underline-offset-4"
                        >
                          {showDestinations ? "Hide routes" : "View routes"}
                        </button>
                      </div>

                      {showDestinations && (
                        <>
                          {reachable.length === 0 ? (
                            <p className="mt-4 rounded-xl border border-white/10 p-4 text-sm text-slate-400">
                              No sample routes are available at this duration.
                              Try a longer flight.
                            </p>
                          ) : (
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                              {reachable.map((destination) => (
                                <button
                                  key={destination.code}
                                  onClick={() =>
                                    setSelectedCode(destination.code)
                                  }
                                  className={`overflow-hidden rounded-xl border text-left transition ${
                                    selectedCode === destination.code
                                      ? "border-amber-300 bg-amber-300/[0.08]"
                                      : "border-white/10 bg-[#0c192b] hover:border-white/30"
                                  }`}
                                >
                                  <div
                                    className="h-20 bg-cover bg-center"
                                    style={{
                                      backgroundImage: `linear-gradient(0deg, rgba(5,12,24,.8), transparent), url('${routeImage(destination.code)}')`,
                                    }}
                                  />
                                  <div className="p-3">
                                    <span className="rounded bg-amber-300 px-1.5 py-1 text-[10px] font-bold text-slate-950">
                                      {destination.code}
                                    </span>
                                    <p className="mt-2 truncate text-sm font-medium">
                                      {destination.name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                      {destination.distance} km
                                    </p>
                                    <p className="mt-1 text-[11px] text-slate-500">
                                      {Math.ceil(destination.distance / 13.9)} min
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {selectedCode && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4">
                              <div>
                                <p className="text-xs text-slate-400">
                                  Selected destination
                                </p>
                                <p className="mt-1 font-semibold">
                                  {airport} → {selectedCode}
                                </p>
                              </div>
                              <button
                                onClick={bookFlight}
                                disabled={!!activeFlight}
                                className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-200 disabled:opacity-50"
                              >
                                ✈ Book flight & start
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {!showDestinations && (
                        <button
                          disabled={!!activeFlight}
                          onClick={() => setShowDestinations(true)}
                          className="mt-6 w-full rounded-xl bg-amber-300 px-5 py-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
                        >
                          ✈ Find my destination <span className="ml-2">→</span>
                        </button>
                      )}
                    </section>

                    {activeFlight && (
                      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a1628]">
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-30"
                          style={{
                            backgroundImage:
                              "linear-gradient(90deg, #07101f, transparent), url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80')",
                          }}
                        />
                        <div className="relative p-5 md:p-7">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="font-semibold">Active flight</h2>
                            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                              ● IN FLIGHT
                            </span>
                          </div>

                          <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
                            <div>
                              <p className="text-3xl font-semibold md:text-4xl">
                                {activeFlight.origin}{" "}
                                <span className="text-amber-300">→</span>{" "}
                                {activeFlight.destination}
                              </p>
                              <p className="mt-2 text-sm text-slate-300">
                                {departure.name} → {activeFlight.destinationName}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-[#081221]/80 p-4">
                              <p className="text-xs text-slate-400">
                                TIME REMAINING
                              </p>
                              <p className="mt-1 text-3xl font-semibold tabular-nums text-amber-300">
                                {formatTime(activeFlight.endTime - now)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
                            <div>
                              <p className="text-xs text-slate-500">Duration</p>
                              <p className="mt-1 text-sm">{activeFlight.duration} min</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Distance</p>
                              <p className="mt-1 text-sm">{activeFlight.distance} km</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Arrival</p>
                              <p className="mt-1 text-sm">
                                {new Date(activeFlight.endTime).toLocaleTimeString(
                                  "en-IN",
                                  { hour: "2-digit", minute: "2-digit" }
                                )}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => openFlight(activeFlight)}
                            className="mt-5 w-full rounded-xl border border-amber-300/70 bg-[#0b1422]/70 px-4 py-3 text-sm font-medium text-amber-300 hover:bg-amber-300/10"
                          >
                            View boarding pass →
                          </button>
                        </div>
                      </section>
                    )}

                    <section className="rounded-2xl border border-white/[0.08] bg-[#0a1323] p-5 md:p-6">
                      <div className="mb-5 flex items-center justify-between">
                        <h2 className="font-semibold">Recent flights</h2>
                        <button
                          onClick={() => setPage("Flight Log")}
                          className="text-xs text-amber-300"
                        >
                          View all →
                        </button>
                      </div>

                      {flights.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-500">
                          Your first flight will appear here. Pick a destination
                          and start focusing.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {flights.slice(0, 4).map((flight) => (
                            <button
                              key={flight.id}
                              onClick={() => openFlight(flight)}
                              className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/[0.035]"
                            >
                              <div
                                className="h-12 w-14 shrink-0 rounded-lg bg-cover bg-center"
                                style={{
                                  backgroundImage: `url('${routeImage(flight.destination)}')`,
                                }}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">
                                  {flight.origin} → {flight.destination}
                                </p>
                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {flight.destinationName} · {flight.duration} min ·{" "}
                                  {flight.distance} km
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] ${
                                  flight.status === "landed"
                                    ? "bg-emerald-400/10 text-emerald-300"
                                    : flight.status === "diverted"
                                      ? "bg-red-400/10 text-red-300"
                                      : "bg-amber-400/10 text-amber-300"
                                }`}
                              >
                                {flight.status.toUpperCase()}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  <aside className="space-y-5">
                    <section className="rounded-2xl border border-white/[0.09] bg-[#0a1323] p-5 md:p-6">
                      <h2 className="font-semibold">
                        <Icon className="mr-2 text-amber-300">✈</Icon>
                        Your journey
                      </h2>
                      <div className="mx-auto my-5 flex h-44 w-44 flex-col items-center justify-center rounded-full border-[9px] border-[#23334c] border-t-amber-400 border-r-amber-400/50">
                        <span className="text-3xl text-amber-300">✈</span>
                        <p className="mt-3 text-xs text-slate-400">TOTAL MILES</p>
                        <p className="mt-1 text-2xl font-semibold">
                          {miles.toLocaleString("en-IN")}{" "}
                          <span className="text-sm font-normal text-slate-400">km</span>
                        </p>
                      </div>
                      <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 pt-4">
                        <div className="px-2">
                          <p className="text-xs text-slate-400">
                            <span className="text-emerald-300">●</span> Landed
                          </p>
                          <p className="mt-1 text-xl">{landedCount}</p>
                        </div>
                        <div className="px-4">
                          <p className="text-xs text-slate-400">
                            <span className="text-red-300">●</span> Diverted
                          </p>
                          <p className="mt-1 text-xl">{divertedCount}</p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-white/[0.09] bg-[#0a1323] p-5 md:p-6">
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Your membership</h2>
                        <span className="text-xl text-amber-300">♛</span>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-amber-300">
                            {currentTier?.name ?? "Future Flyer"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {nextTier
                              ? `${(nextTier.threshold - miles).toLocaleString("en-IN")} km to ${nextTier.name}`
                              : "Every horizon unlocked"}
                          </p>
                        </div>
                        <span className="text-2xl text-amber-300">
                          {currentTier?.symbol ?? "✦"}
                        </span>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#23334c]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
                          style={{ width: `${tierProgress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {miles.toLocaleString("en-IN")} /{" "}
                        {(nextTier?.threshold ?? 40075).toLocaleString("en-IN")} km
                      </p>

                      <div className="mt-5 space-y-1">
                        {TIERS.map((tier) => {
                          const unlocked = miles >= tier.threshold;
                          return (
                            <div
                              key={tier.name}
                              className={`flex items-center gap-3 rounded-xl border p-3 ${
                                unlocked
                                  ? "border-amber-300/20 bg-amber-300/[0.04]"
                                  : "border-transparent"
                              }`}
                            >
                              <span
                                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                  unlocked
                                    ? "bg-amber-300 text-slate-950"
                                    : "bg-[#20304a] text-slate-400"
                                }`}
                              >
                                {tier.symbol}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium">{tier.name}</p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {tier.threshold.toLocaleString("en-IN")} km
                                </p>
                              </div>
                              <span className={unlocked ? "text-emerald-300" : "text-slate-600"}>
                                {unlocked ? "✓" : "🔒"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-white/[0.09] bg-[#0a1323] p-5">
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold">Quick stats</h2>
                        <span className="text-amber-300">◷</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">Focus time</p>
                          <p className="mt-2 text-xl font-semibold">
                            {Math.floor(totalFocus / 60)}h {totalFocus % 60}m
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">Flights landed</p>
                          <p className="mt-2 text-xl font-semibold">{landedCount}</p>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">Avg. session</p>
                          <p className="mt-2 text-xl font-semibold">
                            {landedCount
                              ? Math.round(totalFocus / landedCount)
                              : 0}{" "}
                            <span className="text-xs font-normal text-slate-400">min</span>
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">Total flights</p>
                          <p className="mt-2 text-xl font-semibold">{flights.length}</p>
                        </div>
                      </div>
                    </section>

                    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#17243a] p-5">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-35"
                        style={{
                          backgroundImage:
                            "url('https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80')",
                        }}
                      />
                      <div className="relative">
                        <p className="text-sm font-medium">Small steps.</p>
                        <p className="text-sm text-amber-300">Big horizons.</p>
                        <p className="mt-3 text-xs text-slate-300">
                          One flight at a time.
                        </p>
                      </div>
                    </section>
                  </aside>
                </div>
              </>
            )}

            {page === "Map" && (
              <section className="rounded-3xl border border-white/10 bg-[#0a1323] p-6 md:p-10">
                <p className="text-xs tracking-[0.2em] text-amber-300">ROUTE CONTROL</p>
                <h1 className="mt-3 text-3xl font-semibold">Your world awaits.</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                  The interactive globe and real airport coordinates are planned
                  for the next phase. For now, explore the available focus routes
                  from your flight deck.
                </p>
                <button
                  onClick={() => setPage("Flight Deck")}
                  className="mt-6 rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950"
                >
                  Return to flight deck →
                </button>
              </section>
            )}

            {page === "Journal" && (
              <section className="rounded-3xl border border-white/10 bg-[#0a1323] p-6 md:p-10">
                <p className="text-xs tracking-[0.2em] text-amber-300">FLIGHT JOURNAL</p>
                <h1 className="mt-3 text-3xl font-semibold">Thoughts from the journey.</h1>
                <p className="mt-3 text-sm text-slate-400">
                  Your notes from completed flights.
                </p>
                <div className="mt-8 space-y-3">
                  {flights.filter((f) => f.note).length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-500">
                      No journal entries yet. Complete a flight and save a note
                      to see it here.
                    </p>
                  ) : (
                    flights.filter((f) => f.note).map((flight) => (
                      <button
                        key={flight.id}
                        onClick={() => openFlight(flight)}
                        className="w-full rounded-xl border border-white/10 p-5 text-left hover:border-amber-300/40"
                      >
                        <p className="font-medium">
                          {flight.origin} → {flight.destination}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          {flight.note}
                        </p>
                        <p className="mt-3 text-xs text-slate-500">
                          {formatDate(flight.startTime)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </section>
            )}

            {page === "Flight Log" && (
              <section className="rounded-3xl border border-white/10 bg-[#0a1323] p-6 md:p-10">
                <p className="text-xs tracking-[0.2em] text-amber-300">YOUR HISTORY</p>
                <h1 className="mt-3 text-3xl font-semibold">Every flight counts.</h1>
                <div className="mt-8 space-y-3">
                  {flights.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-slate-500">
                      Your flight log is waiting for its first entry.
                    </p>
                  ) : flights.map((flight) => (
                    <button
                      key={flight.id}
                      onClick={() => openFlight(flight)}
                      className="flex w-full items-center gap-4 rounded-xl border border-white/10 p-4 text-left hover:border-white/30"
                    >
                      <div
                        className="h-14 w-16 shrink-0 rounded-lg bg-cover bg-center"
                        style={{ backgroundImage: `url('${routeImage(flight.destination)}')` }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {flight.origin} → {flight.destination}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {flight.destinationName} · {flight.duration} min · {flight.distance} km
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(flight.startTime)}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">{flight.status.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {page === "Miles" && (
              <section className="rounded-3xl border border-white/10 bg-[#0a1323] p-6 md:p-10">
                <p className="text-xs tracking-[0.2em] text-amber-300">YOUR DISTANCE</p>
                <h1 className="mt-3 text-4xl font-semibold">
                  {miles.toLocaleString("en-IN")} km
                </h1>
                <p className="mt-3 text-sm text-slate-400">
                  Every successfully completed flight contributes to your total.
                  Diverted flights earn zero miles.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {flights.filter((f) => f.status === "landed").map((flight) => (
                    <div key={flight.id} className="rounded-xl border border-white/10 p-4">
                      <p className="font-medium">{flight.origin} → {flight.destination}</p>
                      <p className="mt-2 text-sm text-amber-300">+{flight.distance} km</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {page === "Membership" && (
              <section className="rounded-3xl border border-white/10 bg-[#0a1323] p-6 md:p-10">
                <p className="text-xs tracking-[0.2em] text-amber-300">FREQUENT FLYER PROGRAM</p>
                <h1 className="mt-3 text-3xl font-semibold">Earn your next wings.</h1>
                <p className="mt-3 text-sm text-slate-400">
                  Your membership grows with your completed focus distance.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {TIERS.map((tier) => {
                    const unlocked = miles >= tier.threshold;
                    return (
                      <div key={tier.name} className={`rounded-2xl border p-6 ${unlocked ? "border-amber-300/40 bg-amber-300/[0.04]" : "border-white/10"}`}>
                        <span className="text-3xl text-amber-300">{tier.symbol}</span>
                        <h2 className="mt-4 text-xl font-semibold">{tier.name}</h2>
                        <p className="mt-2 text-sm text-slate-400">{tier.threshold.toLocaleString("en-IN")} km</p>
                        <p className={`mt-4 text-xs ${unlocked ? "text-emerald-300" : "text-slate-500"}`}>
                          {unlocked ? "UNLOCKED ✓" : `${(tier.threshold - miles).toLocaleString("en-IN")} km to unlock`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {viewedFlight && page === "Flight Deck" && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-[#050a14]/95 p-4 backdrop-blur-sm md:p-8">
                <div className="mx-auto max-w-xl py-4">
                  <button
                    onClick={() => {
                      setSelectedFlightId(null);
                      setNote("");
                    }}
                    className="mb-5 text-sm text-slate-400 hover:text-white"
                  >
                    ← Back to flight deck
                  </button>

                  <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0b1526]">
                    <div
                      className="bg-cover bg-center p-6 md:p-8"
                      style={{
                        backgroundImage: `linear-gradient(90deg, rgba(6,13,26,.96), rgba(6,13,26,.62)), url('${routeImage(viewedFlight.destination)}')`,
                      }}
                    >
                      <p className="text-xs tracking-[0.25em] text-amber-300">
                        FLYTIDE AIR · {isLanding ? "ARRIVAL" : "IN FLIGHT"}
                      </p>
                      <h1 className="mt-4 text-3xl font-semibold">
                        {isLanding ? "Welcome to your destination." : "Cruising above the noise."}
                      </h1>
                      <p className="mt-2 text-slate-300">
                        {viewedFlight.origin} → {viewedFlight.destination}
                      </p>
                      {!isLanding && (
                        <p className="mt-6 text-4xl font-semibold tabular-nums text-amber-300">
                          {formatTime(viewedFlight.endTime - now)}
                        </p>
                      )}
                    </div>

                    <div className="m-5 overflow-hidden rounded-2xl bg-amber-300 text-slate-950 md:m-7">
                      <div className="flex items-center justify-between border-b border-dashed border-slate-950/30 p-5">
                        <div>
                          <p className="text-xs font-bold tracking-[0.2em]">FLYTIDE AIR</p>
                          <h2 className="mt-2 text-2xl font-bold">BOARDING PASS</h2>
                        </div>
                        <span className="text-4xl">✈</span>
                      </div>
                      <div className="grid grid-cols-2 gap-5 p-5">
                        <div>
                          <p className="text-xs opacity-60">FROM</p>
                          <p className="mt-1 text-2xl font-bold">{viewedFlight.origin}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-60">TO</p>
                          <p className="mt-1 text-2xl font-bold">{viewedFlight.destination}</p>
                          <p className="text-sm">{viewedFlight.destinationName}</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-60">FOCUS TIME</p>
                          <p className="mt-1 font-semibold">{viewedFlight.duration} MIN</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-60">{isLanding ? "MILES EARNED" : "POTENTIAL MILES"}</p>
                          <p className="mt-1 font-semibold">{viewedFlight.distance.toLocaleString("en-IN")} KM</p>
                        </div>
                      </div>
                      <div className="border-t border-dashed border-slate-950/30 p-5">
                        <p className="text-xs opacity-60">DEPARTURE</p>
                        <p className="mt-1 text-sm font-medium">{formatDate(viewedFlight.startTime)}</p>
                        <p className="mt-3 text-xs opacity-60">FLIGHT ID</p>
                        <p className="mt-1 font-mono text-sm">{viewedFlight.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 md:px-7 md:pb-7">
                      {isLanding ? (
                        <>
                          <label htmlFor="journal" className="text-sm text-slate-400">
                            Flight journal (optional)
                          </label>
                          <textarea
                            id="journal"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            maxLength={2000}
                            placeholder="What did you accomplish during this flight?"
                            className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-[#101827] p-4 text-white outline-none focus:border-amber-300"
                          />
                          <button
                            onClick={() => saveJournal(viewedFlight.id)}
                            className="mt-3 w-full rounded-xl bg-amber-300 p-4 font-semibold text-slate-950 hover:bg-amber-200"
                          >
                            Save journal & return to flight deck
                          </button>
                        </>
                      ) : viewedFlight.status === "flying" ? (
                        <button
                          onClick={() => divertFlight(viewedFlight.id)}
                          className="w-full rounded-xl border border-red-400/30 p-4 text-red-300 hover:bg-red-400/10"
                        >
                          Divert flight · End early (no miles)
                        </button>
                      ) : null}
                    </div>
                  </section>
                </div>
              </div>
            )}

            <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t border-white/[0.07] pt-5 text-[10px] tracking-[0.18em] text-slate-600">
              <span>BUILT FOR THE JOURNEY, NOT THE NOISE.</span>
              <span>FLYTIDE © 2026</span>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
