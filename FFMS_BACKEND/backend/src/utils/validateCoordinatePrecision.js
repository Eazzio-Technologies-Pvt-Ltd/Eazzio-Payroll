const { BadRequestError } = require('./errors');

/**
 * Validates that lat/lng have at least 4 decimal places.
 * 4 decimal places = ~11 metre accuracy.
 * Fewer = pincode or street-centre level — insufficient for geofencing.
 */
function validateCoordinatePrecision(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return;

  const latStr = parseFloat(lat).toString();
  const lngStr = parseFloat(lng).toString();

  const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
  const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1].length : 0;

  if (latDecimals < 4 || lngDecimals < 4) {
    throw new BadRequestError(
      `Coordinate precision too low (lat: ${latDecimals} dp, lng: ${lngDecimals} dp). ` +
      `Minimum 4 decimal places required for accurate geofencing.`
    );
  }
}

module.exports = { validateCoordinatePrecision };
