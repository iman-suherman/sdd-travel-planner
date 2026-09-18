export type FlightOffer = {
  id: string;
  airline: string;
  flightNo: string;
  origin: string;
  destination: string;
  departTime: string;
  arriveTime: string;
  priceIdr: number;
  currency: "IDR";
};

export type HotelOffer = {
  id: string;
  name: string;
  area: string;
  city: string;
  pricePerNightIdr: number;
  currency: "IDR";
};

/** Stub inventory for the teaching demo — Jakarta → Bali + a few hotels. */
export const FLIGHTS: FlightOffer[] = [
  {
    id: "f1",
    airline: "AirAsia",
    flightNo: "QZ-751",
    origin: "CGK",
    destination: "DPS",
    departTime: "06:30",
    arriveTime: "09:25",
    priceIdr: 890_000,
    currency: "IDR",
  },
  {
    id: "f2",
    airline: "Garuda Indonesia",
    flightNo: "GA-404",
    origin: "CGK",
    destination: "DPS",
    departTime: "08:15",
    arriveTime: "11:05",
    priceIdr: 1_250_000,
    currency: "IDR",
  },
  {
    id: "f3",
    airline: "Lion Air",
    flightNo: "JT-39",
    origin: "CGK",
    destination: "DPS",
    departTime: "14:40",
    arriveTime: "17:30",
    priceIdr: 760_000,
    currency: "IDR",
  },
  {
    id: "f4",
    airline: "Citilink",
    flightNo: "QG-680",
    origin: "CGK",
    destination: "DPS",
    departTime: "19:10",
    arriveTime: "22:00",
    priceIdr: 820_000,
    currency: "IDR",
  },
];

export const HOTELS: HotelOffer[] = [
  {
    id: "h1",
    name: "Kuta Beach Inn",
    area: "Kuta",
    city: "Bali",
    pricePerNightIdr: 450_000,
    currency: "IDR",
  },
  {
    id: "h2",
    name: "Seminyak Garden",
    area: "Seminyak",
    city: "Bali",
    pricePerNightIdr: 680_000,
    currency: "IDR",
  },
  {
    id: "h3",
    name: "Ubud Rice Lodge",
    area: "Ubud",
    city: "Bali",
    pricePerNightIdr: 520_000,
    currency: "IDR",
  },
  {
    id: "h4",
    name: "Sanur Coast Hotel",
    area: "Sanur",
    city: "Bali",
    pricePerNightIdr: 590_000,
    currency: "IDR",
  },
];

export function formatIdr(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}
