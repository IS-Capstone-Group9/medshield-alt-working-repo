/** Candidate points for historical weather context; province mappings need owner review. */
export const WEATHER_AREA_COORDINATES = Object.freeze({
  Albay: [13.150937, 123.728605],
  Batangas: [13.7565, 121.0583],
  'Camarines Norte': [14.139, 122.7633],
  'Camarines Sur': [13.6218, 123.1948],
  Catanduanes: [13.576558, 124.209834],
  Cavite: [14.2456, 120.8786],
  Laguna: [14.2691, 121.4113],
  Marinduque: [13.4767, 121.9032],
  Masbate: [12.36632, 123.629218],
  'Metro Manila': [14.5995, 120.9842],
  'Occidental Mindoro': [12.359602, 121.04788],
  'Oriental Mindoro': [13.409775, 121.1896667],
  Palawan: [9.740134, 118.758613],
  Quezon: [13.9414, 121.6234],
  Rizal: [14.6037, 121.3084],
  Romblon: [12.578649, 122.270347],
  Sorsogon: [12.839231, 123.997147],
} satisfies Record<string, readonly [number, number]>)

export type WeatherArea = keyof typeof WEATHER_AREA_COORDINATES
export const WEATHER_POINT_POLICY = 'candidate_representative_point_v1'
export const WEATHER_POINT_BASIS = 'Legacy gateway points retained; added points use PAGASA_ReadMe.txt station coordinates. A point is not a province-wide observation or an approved sales-territory join.'
