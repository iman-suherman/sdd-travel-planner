import {
  FLIGHTS,
  HOTELS,
  formatIdr,
  type FlightOffer,
  type HotelOffer,
} from "../inventory/mock-data";

export type ToolName = "search_flights" | "search_hotels";

export type ToolCall = {
  name: ToolName;
  arguments: Record<string, unknown>;
};

export type ToolResult = {
  name: ToolName;
  ok: boolean;
  facts: Record<string, unknown>;
  summary: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function matchesRoute(f: FlightOffer, origin?: string, destination?: string): boolean {
  const o = origin ? norm(origin) : "";
  const d = destination ? norm(destination) : "";
  const fo = norm(f.origin);
  const fd = norm(f.destination);
  const originOk =
    !o ||
    fo.includes(o) ||
    o.includes(fo) ||
    (o.includes("jakarta") && fo === "cgk") ||
    (o.includes("cgk") && fo === "cgk");
  const destOk =
    !d ||
    fd.includes(d) ||
    d.includes(fd) ||
    (d.includes("bali") && fd === "dps") ||
    (d.includes("denpasar") && fd === "dps") ||
    (d.includes("dps") && fd === "dps");
  return originOk && destOk;
}

export function searchFlights(args: {
  origin?: string;
  destination?: string;
  limit?: number;
}): ToolResult {
  const limit = args.limit ?? 3;
  const hits = FLIGHTS.filter((f) =>
    matchesRoute(f, args.origin, args.destination),
  ).slice(0, Math.max(limit, 3));

  const flights = hits.map((f) => ({
    ...f,
    priceLabel: formatIdr(f.priceIdr),
  }));

  return {
    name: "search_flights",
    ok: true,
    facts: { flights, count: flights.length },
    summary: flights
      .map(
        (f, i) =>
          `${i + 1}. ${f.flightNo} ${f.departTime} — ${f.priceLabel}`,
      )
      .join("\n"),
  };
}

export function searchHotels(args: {
  city?: string;
  preferCheaper?: boolean;
  limit?: number;
}): ToolResult {
  const limit = args.limit ?? 3;
  let hits: HotelOffer[] = [...HOTELS];
  if (args.city) {
    const c = norm(args.city);
    hits = hits.filter(
      (h) =>
        norm(h.city).includes(c) ||
        c.includes("bali") ||
        norm(h.area).includes(c),
    );
  }
  if (args.preferCheaper) {
    hits.sort((a, b) => a.pricePerNightIdr - b.pricePerNightIdr);
  }
  hits = hits.slice(0, Math.max(limit, 3));

  const hotels = hits.map((h) => ({
    ...h,
    priceLabel: `${formatIdr(h.pricePerNightIdr)}/malam`,
  }));

  return {
    name: "search_hotels",
    ok: true,
    facts: { hotels, count: hotels.length },
    summary: hotels
      .map((h, i) => `${i + 1}. ${h.name} (${h.area}) — ${h.priceLabel}`)
      .join("\n"),
  };
}

export function runTool(call: ToolCall): ToolResult {
  if (call.name === "search_flights") {
    return searchFlights({
      origin: String(call.arguments.origin ?? ""),
      destination: String(call.arguments.destination ?? ""),
      limit: Number(call.arguments.limit ?? 3),
    });
  }
  if (call.name === "search_hotels") {
    return searchHotels({
      city: String(call.arguments.city ?? "Bali"),
      preferCheaper: Boolean(call.arguments.preferCheaper),
      limit: Number(call.arguments.limit ?? 3),
    });
  }
  return {
    name: call.name,
    ok: false,
    facts: {},
    summary: `Unknown tool: ${call.name}`,
  };
}

/** OpenAI-compatible tool schemas for Ollama. */
export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "search_flights",
      description:
        "Search mock flight inventory. Returns grounded flight offers with prices.",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Origin city or airport code" },
          destination: {
            type: "string",
            description: "Destination city or airport code",
          },
          limit: { type: "integer", description: "Max results (default 3)" },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_hotels",
      description:
        "Search mock hotel inventory near destination. Use after flight pick or hotel-only request.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string" },
          preferCheaper: { type: "boolean" },
          limit: { type: "integer" },
        },
      },
    },
  },
];
