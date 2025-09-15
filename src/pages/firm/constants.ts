export const TRAILER_TYPES = [
  'van',
  'reefer',
  'flatbed',
  'intermodal',
  'tanker',
  'heavy haul',
  'dumps',
  'grain',
  'car hauler',
  'pneumatic',
  'forestry',
  'livestock',
  'lowboy',
  'dropdeck',
  'double drop',
  'cargo vans',
] as const;

export const TRAILER_TYPES_SET = new Set<string>(TRAILER_TYPES.map((t) => t.toUpperCase()));

export const toAllCaps = (s: string) => s.toUpperCase();

// Firm types (keep in sync with Amplify enum in amplify/data/resource.ts)
export const FIRM_TYPES = [
  'Carrier',
  'Shipper',
  'Broker',
  'Other',
] as const;
