import {
  FLIGHTS,
  GUIDES,
  HOTELS,
  NOTIFICATION_RULES,
  type DestinationGuide,
  type FlightOffer,
  type HotelOffer,
} from "../inventory/mock-data";
import type { CapabilityPack } from "./compose";

export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolResult = {
  name: string;
  ok: boolean;
  facts: Record<string, unknown>;
  summary: string;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function destCode(text: string): "DPS" | "SIN" | "NRT" | "" {
  const d = norm(text);
  if (!d) return "";
  if (d.includes("bali") || d.includes("denpasar") || d === "dps") return "DPS";
  if (d.includes("singap") || d === "sin") return "SIN";
  if (
    d.includes("tokyo") ||
    d.includes("jepang") ||
    d.includes("japan") ||
    d === "nrt" ||
    d === "hnd"
  ) {
    return "NRT";
  }
  return "";
}

function matchesRoute(f: FlightOffer, origin?: string, destination?: string): boolean {
  const o = origin ? norm(origin) : "";
  const code = destination ? destCode(destination) : "";
  const fo = norm(f.origin);
  const originOk =
    !o ||
    fo.includes(o) ||
    o.includes(fo) ||
    (o.includes("jakarta") && fo === "cgk") ||
    (o.includes("cgk") && fo === "cgk");
  const destOk = !destination || !code || f.destination === code || norm(f.destination).includes(norm(destination));
  return originOk && destOk;
}

function hotelCity(city?: string): string {
  const c = city ? norm(city) : "";
  if (!c) return "";
  if (c.includes("bali") || c.includes("denpasar") || c.includes("kuta") || c.includes("ubud")) {
    return "bali";
  }
  if (c.includes("tokyo") || c.includes("jepang") || c.includes("japan") || c.includes("shinjuku")) {
    return "tokyo";
  }
  if (c.includes("singap")) return "singapore";
  return c;
}

export function findGuide(query?: string): DestinationGuide | undefined {
  const q = query ? norm(query) : "";
  if (!q) return undefined;
  return GUIDES.find((g) => {
    const blob = `${g.id} ${g.city} ${g.country}`.toLowerCase();
    return (
      blob.includes(q) ||
      q.includes(g.id) ||
      q.includes(g.city.toLowerCase()) ||
      (q.includes("jepang") && g.id === "tokyo") ||
      (q.includes("japan") && g.id === "tokyo") ||
      (q.includes("singapura") && g.id === "singapore")
    );
  });
}

export function getDestinationGuide(args: { query?: string }): ToolResult {
  const guide = findGuide(args.query);
  if (!guide) {
    return {
      name: "get_destination_guide",
      ok: false,
      facts: { guide: null },
      summary: "Belum ada panduan untuk destinasi itu.",
    };
  }
  return {
    name: "get_destination_guide",
    ok: true,
    facts: { guide },
    summary: [
      `${guide.city}, ${guide.country}: ${guide.summary}`,
      `Area: ${guide.areas.join(", ")}`,
      ...guide.days.map((d) => `Hari ${d.day}: ${d.title} — ${d.detail}`),
      guide.visaNote,
    ].join("\n"),
  };
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
    airline: f.airline,
    flightNo: f.flightNo,
    origin: f.origin,
    destination: f.destination,
    departTime: f.departTime,
    arriveTime: f.arriveTime,
  }));

  return {
    name: "search_flights",
    ok: true,
    facts: { flights, count: flights.length },
    summary: flights
      .map(
        (f, i) =>
          `${i + 1}. ${f.airline} ${f.flightNo} ${f.departTime}–${f.arriveTime}`,
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
  const city = hotelCity(args.city);
  let hits: HotelOffer[] = [...HOTELS];
  if (city) {
    hits = hits.filter((h) => norm(h.city) === city || norm(h.area).includes(city));
  }
  if (args.preferCheaper) {
    hits.sort((a, b) => a.pricePerNightIdr - b.pricePerNightIdr);
  }
  hits = hits.slice(0, Math.max(limit, 3));

  const hotels = hits.map((h) => ({
    name: h.name,
    area: h.area,
    city: h.city,
  }));

  return {
    name: "search_hotels",
    ok: true,
    facts: { hotels, count: hotels.length },
    summary: hotels.map((h, i) => `${i + 1}. ${h.name} (${h.area})`).join("\n"),
  };
}

export function planNotifications(args: {
  departDate?: string;
  destination?: string;
}): ToolResult {
  const when = args.departDate?.trim();
  const notifications = NOTIFICATION_RULES.map((n) => ({
    ...n,
    when: when ? `${n.offsetLabel} (berangkat ${when})` : n.offsetLabel,
  }));
  return {
    name: "plan_notifications",
    ok: true,
    facts: { notifications, channel: "in-app", departDate: when ?? null },
    summary: notifications
      .map((n) => `${n.when} · ${n.channel} · ${n.title}`)
      .join("\n"),
  };
}

export function runTool(call: ToolCall): ToolResult {
  if (call.name === "get_destination_guide") {
    return getDestinationGuide({
      query: String(call.arguments.query ?? call.arguments.destination ?? ""),
    });
  }
  if (call.name === "search_flights") {
    return searchFlights({
      origin: String(call.arguments.origin ?? ""),
      destination: String(call.arguments.destination ?? ""),
      limit: Number(call.arguments.limit ?? 3),
    });
  }
  if (call.name === "search_hotels") {
    return searchHotels({
      city: String(call.arguments.city ?? ""),
      preferCheaper: Boolean(call.arguments.preferCheaper),
      limit: Number(call.arguments.limit ?? 3),
    });
  }
  if (call.name === "plan_notifications") {
    return planNotifications({
      departDate: String(call.arguments.departDate ?? ""),
      destination: String(call.arguments.destination ?? ""),
    });
  }
  return {
    name: call.name,
    ok: false,
    facts: {},
    summary: `Unknown tool: ${call.name}`,
  };
}

export function toolDefinitions(pack: CapabilityPack) {
  return (pack.modules.tools?.catalog ?? []).map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          (tool.parameters ?? []).map((param) => [
            param.name,
            {
              type: param.type,
              ...(param.description ? { description: param.description } : {}),
            },
          ]),
        ),
      },
    },
  }));
}
