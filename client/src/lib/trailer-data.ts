// This file contains the mock trailer data that would normally come from the API
// Based on the 2025 Walton Price Book structure

export const CATEGORY_NAMES = {
  dump: 'Dump Trailers',
  gooseneck: 'Gooseneck Trailers',
  tilt: 'Tilt Equipment Trailers',
  hauler: 'Car/Equipment Haulers',
  landscape: 'Landscape Trailers',
  utility: 'Utility Trailers'
} as const;

export const OPTION_CATEGORY_NAMES = {
  tires: 'Tire Options',
  ramps: 'Ramp Options',
  color: 'Color Options',
  extras: 'Additional Options',
  deck: 'Deck Length',
  walls: 'Wall Height',
  winch: 'Winch Options'
} as const;

export type CategorySlug = keyof typeof CATEGORY_NAMES;
export type OptionCategory = keyof typeof OPTION_CATEGORY_NAMES;
