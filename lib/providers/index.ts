import type { Provider } from "./types";
import { apiFootball } from "./apiFootball";

// One provider today. A second source (e.g. SportMonks for market value +
// ratings) implements `Provider` and is chosen here by env — no UI changes.
export function getProvider(): Provider {
  return apiFootball;
}

export type { Provider };
