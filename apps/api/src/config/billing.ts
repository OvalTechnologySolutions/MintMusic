/**
 * Centralized MintMusic billing constants (sprint assumptions).
 * 100 Mint minor units = 1 Mint = $1 USD.
 */
import { env } from './env.js';

export const ARTIST_SUBSCRIPTION_PRICE_CENTS = 999;
export const ARTIST_SUBSCRIPTION_INTERVAL = 'month' as const;
export const ARTIST_INTRO_MONTHS = 12;

/** 1 Mint minor unit = 1 USD cent under the sprint exchange rate. */
export const MINT_USD_CENTS_PER_UNIT = 1;
export const MINT_UNITS_PER_DOLLAR = 100;

export const SONG_SAVE_UNITS = 25;

export const MINT_TOPUP_MIN_CENTS = 500;
export const MINT_TOPUP_SUGGESTED_CENTS = [500, 1000, 2500] as const;

export function mintTopUpMaxCents(): number {
  return env.MINT_TOPUP_MAX_CENTS;
}

export function offlineLeaseSeconds(): number {
  return env.OFFLINE_LEASE_SECONDS;
}

export function centsToMintUnits(cents: number): number {
  return Math.floor(cents / MINT_USD_CENTS_PER_UNIT);
}

export function mintUnitsToCents(units: number): number {
  return units * MINT_USD_CENTS_PER_UNIT;
}

export function mintUnitsToDisplay(units: number): number {
  return units / MINT_UNITS_PER_DOLLAR;
}

/** Add N calendar months to a date (intro offer end). */
export function addCalendarMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) {
    d.setUTCDate(0);
  }
  return d;
}

export function artistPriceId(): string | undefined {
  return env.STRIPE_ARTIST_PRICE_ID;
}

export const BILLING_ASSUMPTIONS = {
  artistPriceUsd: 9.99,
  artistInterval: ARTIST_SUBSCRIPTION_INTERVAL,
  introMonths: ARTIST_INTRO_MONTHS,
  mintExchange: '1 Mint = $1 USD',
  songSaveMint: 0.25,
  songSaveUnits: SONG_SAVE_UNITS,
  minTopUpUsd: 5,
  suggestedTopUpsUsd: [5, 10, 25],
} as const;
