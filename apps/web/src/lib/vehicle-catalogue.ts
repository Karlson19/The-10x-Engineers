/**
 * Makes and models weighted towards what is actually on the road in Ghana:
 * Japanese and Korean saloons and pickups first, then the European and
 * American marques, then the newer Chinese and Indian imports.
 *
 * This lives in the web app rather than in the shared package on purpose. It
 * is presentation help for one form, and the shared package is compiled to
 * CommonJS, so anything added there lands in every page's bundle whether it is
 * used or not. The server does not validate against this list: someone with an
 * unusual import must still be able to book.
 */

export type VehicleMake = {
  name: string;
  models: readonly string[];
};

export const VEHICLE_MAKES: readonly VehicleMake[] = [
  {
    name: "Toyota",
    models: [
      "Corolla", "Camry", "RAV4", "Hilux", "Land Cruiser", "Land Cruiser Prado", "Yaris",
      "Highlander", "Vitz", "Matrix", "Sienna", "Tacoma", "4Runner", "Avalon", "Avensis",
      "Fortuner", "Hiace", "Rush", "Venza",
    ],
  },
  {
    name: "Nissan",
    models: [
      "X-Trail", "Qashqai", "Sentra", "Altima", "Navara", "Patrol", "Note", "Micra", "Juke",
      "Pathfinder", "Almera", "Rogue", "Murano", "Hardbody",
    ],
  },
  {
    name: "Hyundai",
    models: [
      "Elantra", "Accent", "Tucson", "Santa Fe", "i10", "i20", "i30", "Sonata", "Creta",
      "Grand i10", "H1", "Venue",
    ],
  },
  {
    name: "Kia",
    models: [
      "Sportage", "Rio", "Cerato", "Sorento", "Picanto", "Optima", "Seltos", "Soul", "Carnival",
      "K2700",
    ],
  },
  {
    name: "Honda",
    models: ["Civic", "Accord", "CR-V", "Pilot", "Fit", "City", "HR-V", "Odyssey", "Element"],
  },
  {
    name: "Mitsubishi",
    models: ["Pajero", "L200", "Outlander", "Lancer", "ASX", "Montero", "Canter"],
  },
  {
    name: "Ford",
    models: ["Ranger", "Focus", "Escape", "Explorer", "Fiesta", "EcoSport", "Transit", "F-150"],
  },
  {
    name: "Mercedes-Benz",
    models: ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLK", "ML", "Sprinter", "Vito", "A-Class"],
  },
  {
    name: "BMW",
    models: ["3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X6", "1 Series"],
  },
  {
    name: "Volkswagen",
    models: ["Golf", "Passat", "Polo", "Tiguan", "Touareg", "Jetta", "Amarok", "Caddy"],
  },
  {
    name: "Mazda",
    models: ["Mazda3", "Mazda6", "CX-5", "CX-7", "CX-9", "Demio", "BT-50", "Mazda2"],
  },
  {
    name: "Suzuki",
    models: ["Swift", "Alto", "Vitara", "Jimny", "Ertiga", "Baleno", "Celerio"],
  },
  {
    name: "Peugeot",
    models: ["206", "207", "301", "307", "308", "3008", "508", "Partner", "Boxer"],
  },
  {
    name: "Land Rover",
    models: ["Range Rover", "Range Rover Sport", "Range Rover Evoque", "Discovery", "Defender", "Freelander"],
  },
  {
    name: "Chevrolet",
    models: ["Aveo", "Cruze", "Spark", "Captiva", "Trailblazer", "Silverado", "Malibu"],
  },
  { name: "Isuzu", models: ["D-Max", "MU-X", "NPR", "Trooper", "Rodeo"] },
  { name: "Lexus", models: ["RX", "LX", "GX", "ES", "IS", "NX", "LS"] },
  { name: "Audi", models: ["A3", "A4", "A6", "Q3", "Q5", "Q7", "A5"] },
  { name: "Volvo", models: ["XC60", "XC90", "S60", "S80", "V40", "FH"] },
  { name: "Renault", models: ["Duster", "Logan", "Sandero", "Clio", "Megane", "Kwid"] },
  { name: "Opel", models: ["Astra", "Corsa", "Insignia", "Zafira", "Mokka"] },
  { name: "Jeep", models: ["Grand Cherokee", "Wrangler", "Cherokee", "Compass", "Patriot"] },
  { name: "Subaru", models: ["Forester", "Outback", "Impreza", "Legacy", "XV"] },
  { name: "Acura", models: ["MDX", "RDX", "TL", "TLX", "ZDX"] },
  { name: "Infiniti", models: ["QX56", "QX60", "QX80", "FX35", "G37"] },
  { name: "Daihatsu", models: ["Terios", "Sirion", "Materia", "Gran Max"] },
  { name: "Fiat", models: ["Punto", "Panda", "Doblo", "Ducato", "500"] },
  { name: "Tata", models: ["Indica", "Xenon", "Sumo", "Ace", "Nexon"] },
  { name: "Great Wall", models: ["Wingle", "Haval H6", "Steed", "Poer"] },
  { name: "Chery", models: ["Tiggo 2", "Tiggo 4", "Tiggo 7", "Arrizo 5", "QQ"] },
  { name: "Haval", models: ["H2", "H6", "Jolion", "Dargo"] },
  { name: "Changan", models: ["CS35", "CS55", "CS75", "Alsvin", "Eado"] },
  { name: "BYD", models: ["F3", "Song", "Tang", "Atto 3", "Dolphin"] },
  { name: "MG", models: ["ZS", "HS", "RX5", "MG5", "MG3"] },
  { name: "Geely", models: ["Emgrand", "Coolray", "Azkarra", "GX3"] },
  { name: "Ssangyong", models: ["Rexton", "Korando", "Actyon", "Musso"] },
  { name: "Daewoo", models: ["Matiz", "Lanos", "Nubira", "Cielo"] },
  { name: "Citroen", models: ["C3", "C4", "C5", "Berlingo", "Jumper"] },
  { name: "Porsche", models: ["Cayenne", "Macan", "Panamera", "911"] },
  { name: "Scania", models: ["P Series", "R Series", "G Series"] },
];

const BY_NAME = new Map(VEHICLE_MAKES.map((make) => [make.name.toLowerCase(), make]));

export function modelsForMake(make: string): readonly string[] {
  return BY_NAME.get(make.trim().toLowerCase())?.models ?? [];
}

export function isKnownMake(make: string): boolean {
  return BY_NAME.has(make.trim().toLowerCase());
}

/**
 * Initials for the brand tile. Real manufacturer logos are trademarks and we
 * have no licence to ship them, so the mark is drawn from the name instead.
 */
export function makeInitials(name: string): string {
  const words = name.split(/[\s-]+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }

  return (words[0] ?? name).slice(0, 2).toUpperCase();
}

/**
 * A tint per brand, picked deterministically from a small on-brand set rather
 * than from an open hue range, so the picker never turns into a rainbow.
 */
const TINTS = [
  "bg-primary/10 text-primary dark:bg-primary/25 dark:text-primary-foreground",
  "bg-accent-subtle text-accent-hover dark:bg-accent/20 dark:text-accent",
  "bg-muted text-muted-foreground",
  "bg-success/10 text-success",
  "bg-foreground/8 text-foreground",
] as const;

export function makeTint(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return TINTS[hash % TINTS.length] ?? TINTS[2];
}

/** Newest first, which is the end people pick from most often. */
export function vehicleYears(): number[] {
  const newest = new Date().getFullYear() + 1;
  return Array.from({ length: newest - 1969 }, (_, index) => newest - index);
}
