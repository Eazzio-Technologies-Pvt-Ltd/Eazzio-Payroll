/**
 * parseCoordinate
 * Parses a coordinate string in any of 5 standard formats.
 * Returns { lat: number, lng: number } or null if parsing fails.
 *
 * Supported formats:
 *   40° 26' 46" N 79° 58' 56" W      (DMS with hemisphere)
 *   48°51'12.28" 2°20'55.68"         (DMS without hemisphere)
 *   40° 26.767' N 79° 58.933' W      (DDM with hemisphere)
 *   40.446° N 79.982° W              (Decimal with hemisphere)
 *   48.85341, 2.3488                 (Plain decimal pair)
 */
function parseCoordinate(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();

  // FORMAT 5: plain decimal pair — "48.85341, 2.3488" or "48.85341 2.3488"
  const decimalPair = s.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (decimalPair) {
    const lat = parseFloat(decimalPair[1]);
    const lng = parseFloat(decimalPair[2]);
    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  // FORMATS 1–4: DMS, DDM, and decimal-with-hemisphere
  // Matches: degrees [minutes [seconds]] [hemisphere] for both lat and lng
  const dmsPattern = new RegExp(
    // Latitude part
    '(\\d+\\.?\\d*)[°\\s]+' +   // degrees (can be decimal)
    '(\\d+\\.?\\d*)?[\'\\s]*' + // optional minutes
    '(\\d+\\.?\\d*)?["\\s]*' +  // optional seconds
    '([NS]?)[,\\s]+' +          // optional hemisphere, separator
    // Longitude part
    '(\\d+\\.?\\d*)[°\\s]+' +
    '(\\d+\\.?\\d*)?[\'\\s]*' +
    '(\\d+\\.?\\d*)?["\\s]*' +
    '([EW]?)',
    'i'
  );

  const m = s.match(dmsPattern);
  if (m) {
    let lat = parseFloat(m[1]);
    if (m[2]) lat += parseFloat(m[2]) / 60;
    if (m[3]) lat += parseFloat(m[3]) / 3600;
    if (m[4] && m[4].toUpperCase() === 'S') lat = -lat;

    let lng = parseFloat(m[5]);
    if (m[6]) lng += parseFloat(m[6]) / 60;
    if (m[7]) lng += parseFloat(m[7]) / 3600;
    if (m[8] && m[8].toUpperCase() === 'W') lng = -lng;

    if (isValidLatLng(lat, lng)) return { lat, lng };
  }

  return null;
}

function isValidLatLng(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

module.exports = { parseCoordinate };
