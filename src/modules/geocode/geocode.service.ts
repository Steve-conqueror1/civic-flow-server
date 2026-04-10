import axios from "axios";
import { env } from "../../config";
import { redisClient } from "../../config/redis";
import { AppError } from "../../shared/errors/AppError";

export interface GeocodeResult {
  placeName: string;
  longitude: number;
  latitude: number;
  placeType: string[];
}

const CACHE_TTL = 86400; // 24 hours

export async function geocodeQuery(
  q: string,
  limit: number,
): Promise<GeocodeResult[]> {
  const cacheKey = `geocode:CA:${q.toLowerCase().trim()}:${limit}`;

  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  let response;
  try {
    response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
      {
        params: {
          country: "CA",
          limit,
          access_token: env.MAPBOX_TOKEN,
        },
        timeout: 5000,
      },
    );
  } catch {
    throw new AppError(502, "Geocoding service unavailable.");
  }

  const features = response.data?.features ?? [];

  const results: GeocodeResult[] = features.map(
    (f: { place_name: string; center: number[]; place_type: string[] }) => ({
      placeName: f.place_name,
      longitude: f.center[0],
      latitude: f.center[1],
      placeType: f.place_type,
    }),
  );

  await redisClient.set(cacheKey, JSON.stringify(results), { EX: CACHE_TTL });

  return results;
}
