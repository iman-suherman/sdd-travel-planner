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

export type DayBlock = {
  day: number;
  title: string;
  detail: string;
};

export type DestinationGuide = {
  id: string;
  country: string;
  city: string;
  summary: string;
  seasonNote: string;
  areas: string[];
  bookOrder: string[];
  visaNote: string;
  days: DayBlock[];
};

export type NotificationItem = {
  id: string;
  offsetLabel: string;
  channel: "in-app";
  title: string;
  body: string;
};

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
    id: "f5",
    airline: "Scoot",
    flightNo: "TR-278",
    origin: "CGK",
    destination: "SIN",
    departTime: "09:10",
    arriveTime: "12:05",
    priceIdr: 1_450_000,
    currency: "IDR",
  },
  {
    id: "f6",
    airline: "Garuda Indonesia",
    flightNo: "GA-838",
    origin: "CGK",
    destination: "SIN",
    departTime: "13:20",
    arriveTime: "16:15",
    priceIdr: 2_100_000,
    currency: "IDR",
  },
  {
    id: "f7",
    airline: "Citilink",
    flightNo: "QG-860",
    origin: "CGK",
    destination: "SIN",
    departTime: "19:40",
    arriveTime: "22:35",
    priceIdr: 1_280_000,
    currency: "IDR",
  },
  {
    id: "f8",
    airline: "Japan Airlines",
    flightNo: "JL-720",
    origin: "CGK",
    destination: "NRT",
    departTime: "22:30",
    arriveTime: "07:40",
    priceIdr: 6_400_000,
    currency: "IDR",
  },
  {
    id: "f9",
    airline: "Garuda Indonesia",
    flightNo: "GA-880",
    origin: "CGK",
    destination: "NRT",
    departTime: "23:55",
    arriveTime: "09:10",
    priceIdr: 7_150_000,
    currency: "IDR",
  },
  {
    id: "f10",
    airline: "AirAsia",
    flightNo: "QZ-202",
    origin: "CGK",
    destination: "NRT",
    departTime: "21:15",
    arriveTime: "06:50",
    priceIdr: 5_200_000,
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
  {
    id: "h5",
    name: "Shinjuku Base Hotel",
    area: "Shinjuku",
    city: "Tokyo",
    pricePerNightIdr: 1_800_000,
    currency: "IDR",
  },
  {
    id: "h6",
    name: "Asakusa Lane Inn",
    area: "Asakusa",
    city: "Tokyo",
    pricePerNightIdr: 1_450_000,
    currency: "IDR",
  },
  {
    id: "h7",
    name: "Shibuya Cross Hotel",
    area: "Shibuya",
    city: "Tokyo",
    pricePerNightIdr: 2_100_000,
    currency: "IDR",
  },
  {
    id: "h8",
    name: "Marina Bay Corner",
    area: "Marina Bay",
    city: "Singapore",
    pricePerNightIdr: 1_600_000,
    currency: "IDR",
  },
  {
    id: "h9",
    name: "Kampong Glam House",
    area: "Kampong Glam",
    city: "Singapore",
    pricePerNightIdr: 980_000,
    currency: "IDR",
  },
  {
    id: "h10",
    name: "Chinatown Stay",
    area: "Chinatown",
    city: "Singapore",
    pricePerNightIdr: 1_100_000,
    currency: "IDR",
  },
];

export const GUIDES: DestinationGuide[] = [
  {
    id: "bali",
    country: "Indonesia",
    city: "Bali",
    summary:
      "Liburan pantai di selatan dan sawah di tengah. Cocok 3–4 hari kalau origin Jakarta.",
    seasonNote:
      "Panduan lokal: musim kemarau umumnya April–Oktober. Ini bukan cuaca live.",
    areas: ["Kuta", "Seminyak", "Ubud", "Sanur"],
    bookOrder: ["penerbangan", "hotel", "pengingat berangkat"],
    visaNote: "Untuk warga Indonesia, Bali tidak butuh visa.",
    days: [
      {
        day: 1,
        title: "Tiba dan pantai selatan",
        detail: "Mendarat di DPS, check-in Kuta atau Seminyak, sore di pantai. Jangan padatkan Ubud di hari yang sama.",
      },
      {
        day: 2,
        title: "Ubud",
        detail: "Sehari di Ubud (sawah dan pasar), pulang ke hotel sebelum malam supaya tidak kejar-kejaran.",
      },
      {
        day: 3,
        title: "Sanur lalu pulang",
        detail: "Pagi Santai di Sanur, checkout, kembali ke DPS. Sisakan 3 jam sebelum terbang.",
      },
    ],
  },
  {
    id: "tokyo",
    country: "Jepang",
    city: "Tokyo",
    summary:
      "Kalau kamu bilang Jepang tanpa kota, panduan ini memakai Tokyo sebagai kota utama. Area yang ada di data: Shinjuku, Asakusa, Shibuya.",
    seasonNote:
      "Panduan lokal: musim semi dan gugur ramai. Ini bukan prakiraan cuaca.",
    areas: ["Shinjuku", "Asakusa", "Shibuya"],
    bookOrder: ["penerbangan", "hotel", "pengingat dokumen"],
    visaNote:
      "Panduan ini tidak menerbitkan visa. Cek aturan masuk Jepang di sumber resmi sebelum bayar.",
    days: [
      {
        day: 1,
        title: "Tiba di NRT, Shinjuku",
        detail: "Bandara NRT ke hotel Shinjuku. Malam pertama jangan isi dengan Asakusa.",
      },
      {
        day: 2,
        title: "Asakusa lalu Shibuya",
        detail: "Pagi Asakusa, sore Shibuya. Satu area per setengah hari.",
      },
      {
        day: 3,
        title: "Longgar lalu pulang",
        detail: "Pagi di sekitar hotel, checkout, ke NRT. Penerbangan malam butuh berangkat hotel lebih awal.",
      },
    ],
  },
  {
    id: "singapore",
    country: "Singapura",
    city: "Singapore",
    summary:
      "Kota kompak. Tiga area di data: Marina Bay, Kampong Glam, Chinatown. Cocok 3 hari dari Jakarta.",
    seasonNote: "Panduan lokal: hujan singkat sepanjang tahun. Ini bukan cuaca live.",
    areas: ["Marina Bay", "Kampong Glam", "Chinatown"],
    bookOrder: ["penerbangan", "hotel", "pengingat berangkat"],
    visaNote: "Untuk warga Indonesia, cek aturan masuk terbaru di sumber resmi. Panduan ini tidak menerbitkan visa.",
    days: [
      {
        day: 1,
        title: "Tiba dan Marina Bay",
        detail: "Mendarat di SIN, hotel, sore di Marina Bay saja.",
      },
      {
        day: 2,
        title: "Kampong Glam dan Chinatown",
        detail: "Dua kawasan dalam satu hari, jalan kaki atau MRT. Jangan tambah pulau di luar data.",
      },
      {
        day: 3,
        title: "Pulang",
        detail: "Checkout dan ke bandara. Sisakan waktu antre imigrasi.",
      },
    ],
  },
];

export const NOTIFICATION_RULES: NotificationItem[] = [
  {
    id: "n1",
    offsetLabel: "14 hari sebelum berangkat",
    channel: "in-app",
    title: "Cek dokumen perjalanan",
    body: "Paspor masih berlaku dan visa (kalau panduan minta cek sumber resmi) belum kamu anggap beres sebelum dicek.",
  },
  {
    id: "n2",
    offsetLabel: "7 hari sebelum berangkat",
    channel: "in-app",
    title: "Kunci penerbangan dan hotel",
    body: "Bandingkan lagi opsi yang kamu pilih dengan harga di data. Jangan ganti ke harga yang tidak ada di inventori.",
  },
  {
    id: "n3",
    offsetLabel: "1 hari sebelum berangkat",
    channel: "in-app",
    title: "Pengingat berangkat",
    body: "Cek jam terbang dari data, isi tas kabin, dan berangkat ke bandara sesuai buffer di rencana hari terakhir.",
  },
];

export function formatIdr(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}
