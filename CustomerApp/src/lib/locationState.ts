// Simple in-memory location preference store (frontend-only — the backend
// doesn't have structured country/state/city data to filter by yet).
import { useSyncExternalStore } from "react";

export type LocationOption = { country: string; state: string; city: string; lat: number; lng: number };
type CityOption = { name: string; lat: number; lng: number };

export const LOCATIONS: { country: string; states: { state: string; cities: CityOption[] }[] }[] = [
  {
    country: "India",
    states: [
      {
        state: "Karnataka",
        cities: [
          { name: "Bengaluru", lat: 12.9716, lng: 77.5946 },
          { name: "Mysuru", lat: 12.2958, lng: 76.6394 },
        ],
      },
      {
        state: "Maharashtra",
        cities: [
          { name: "Mumbai", lat: 19.076, lng: 72.8777 },
          { name: "Pune", lat: 18.5204, lng: 73.8567 },
        ],
      },
      {
        state: "Delhi NCR",
        cities: [
          { name: "New Delhi", lat: 28.6139, lng: 77.209 },
          { name: "Gurugram", lat: 28.4595, lng: 77.0266 },
        ],
      },
      {
        state: "Tamil Nadu",
        cities: [
          { name: "Chennai", lat: 13.0827, lng: 80.2707 },
          { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
        ],
      },
    ],
  },
  {
    country: "United Kingdom",
    states: [
      {
        state: "England",
        cities: [
          { name: "London", lat: 51.5074, lng: -0.1278 },
          { name: "Manchester", lat: 53.4808, lng: -2.2426 },
          { name: "Birmingham", lat: 52.4862, lng: -1.8904 },
        ],
      },
      {
        state: "Scotland",
        cities: [
          { name: "Edinburgh", lat: 55.9533, lng: -3.1883 },
          { name: "Glasgow", lat: 55.8642, lng: -4.2518 },
        ],
      },
    ],
  },
  {
    country: "United Arab Emirates",
    states: [
      {
        state: "Dubai",
        cities: [
          { name: "Dubai Marina", lat: 25.0805, lng: 55.1403 },
          { name: "Downtown Dubai", lat: 25.1972, lng: 55.2744 },
          { name: "Jumeirah", lat: 25.2285, lng: 55.2593 },
        ],
      },
      {
        state: "Abu Dhabi",
        cities: [
          { name: "Abu Dhabi City", lat: 24.4539, lng: 54.3773 },
          { name: "Al Ain", lat: 24.1302, lng: 55.8023 },
        ],
      },
    ],
  },
  {
    country: "United States",
    states: [
      {
        state: "California",
        cities: [
          { name: "Los Angeles", lat: 34.0522, lng: -118.2437 },
          { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
        ],
      },
      {
        state: "New York",
        cities: [{ name: "New York City", lat: 40.7128, lng: -74.006 }],
      },
    ],
  },
];

let current: LocationOption = { country: "United Kingdom", state: "England", city: "Mayfair, London", lat: 51.5074, lng: -0.1278 };
const listeners = new Set<() => void>();

export function getLocation() {
  return current;
}

export function setLocation(next: LocationOption) {
  current = next;
  listeners.forEach((l) => l());
}

export function useLocation(): LocationOption {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
}
