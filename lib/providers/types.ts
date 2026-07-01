// Provider-agnostic domain types. The UI only ever sees these shapes, so a
// second data source (SportMonks, FBref, …) can implement `Provider` and slot
// in without touching any component. Nothing here is API-Football specific.

export type Position =
  | "Goalkeeper"
  | "Defender"
  | "Midfielder"
  | "Attacker"
  | "Unknown";

export interface PlayerSummary {
  id: number;
  name: string;
  firstname?: string;
  lastname?: string;
  age?: number | null;
  nationality?: string;
  photo?: string;
  position: Position;
}

/** A single displayable stat: machine key, human label, formatted + raw value. */
export interface StatLine {
  key: string;
  label: string;
  value: string; // formatted for display ("—" when unknown)
  raw: number | null; // numeric form for sorting / computation
}

export interface SeasonStats {
  season?: number;
  team?: string;
  teamLogo?: string;
  league?: string;
  leagueLogo?: string;
  position: Position;
  rating?: string | null; // e.g. "7.4"
  number?: number | null; // jersey number
  primary: StatLine[]; // position-aware headline stats (the scoreboard)
  secondary: StatLine[]; // everything else, de-emphasized
}

export interface Transfer {
  date?: string;
  from?: string;
  fromLogo?: string;
  to?: string;
  toLogo?: string;
  type?: string; // fee ("€ 222M") or kind ("Loan", "Free")
}

export interface PlayerProfile {
  id: number;
  name: string;
  firstname?: string;
  lastname?: string;
  age?: number | null;
  birthDate?: string;
  birthPlace?: string;
  birthCountry?: string;
  nationality?: string;
  height?: string;
  weight?: string;
  photo?: string;
  team?: string;
  teamLogo?: string;
  number?: number | null;
  position: Position;
  stats?: SeasonStats;
  transfers: Transfer[];
  // True market value is not exposed by API-Football. Kept null and labeled in
  // the UI rather than faked. A paid provider (SportMonks) would fill this in.
  marketValue: string | null;
}

export interface Provider {
  /** Search players by name. Returns a short pick-list. */
  search(query: string): Promise<PlayerSummary[]>;
  /** Full profile + season stats + transfers for one player. */
  getProfile(id: number, season?: number): Promise<PlayerProfile>;
}
