const { successResponse } = require('../utils/response');
const { BadRequestError } = require('../utils/errors');
const logger = require('../config/logger');

// Cache for Mappls access token
let tokenCache = null;
let cacheExpiryTime = 0;

/**
 * Helper: Fetch fresh token from Mappls OAuth API (with fallback).
 * Mappls/MapmyIndia requires a backend server-to-server OAuth exchange to obtain an
 * access token, which is then passed to the frontend to render the maps.
 * This function caches the token in-memory and handles network failovers between 
 * 'outboundapi' and 'outpost' domains (as required by MapmyIndia infra).
 */
async function getFreshToken() {
  const clientId = process.env.MAPPLS_CLIENT_ID;
  const clientSecret = process.env.MAPPLS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new BadRequestError('Mappls API credentials missing in backend .env');
  }

  const currentTime = Date.now();
  if (tokenCache && cacheExpiryTime > currentTime + 60000) {
    return tokenCache;
  }

  let response;
  try {
    logger.info('Fetching fresh Mappls SDK access token from outboundapi...');
    response = await fetch('https://outboundapi.mappls.com/api/security/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
  } catch (fetchErr) {
    logger.warn(`Failed to connect to outboundapi: ${fetchErr.message}. Trying outpost fallback...`);
  }

  if (!response || !response.ok) {
    logger.info('Fetching fresh Mappls SDK access token from outpost...');
    response = await fetch('https://outpost.mappls.com/api/security/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`Mappls OAuth error response (HTTP ${response.status}): ${errorText}`);
    throw new Error(`Failed to fetch token from Mappls: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('Invalid token response from Mappls (no access_token received)');
  }

  tokenCache = data.access_token;
  const expiresIn = data.expires_in || 86400; // default 24h
  cacheExpiryTime = Date.now() + (expiresIn - 300) * 1000; // 5‑min safety margin
  return tokenCache;
}

/**
 * GET /map/token
 * Returns a valid Mappls access token (cached)
 */
const getMapplsToken = async (req, res, next) => {
  try {
    const token = await getFreshToken();
    const remainingSeconds = Math.floor((cacheExpiryTime - Date.now()) / 1000);
    return successResponse(res, {
      token,
      expiresIn: remainingSeconds,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /map/search?query=...
 * Server-side proxy for location autosuggest using MapmyIndia.
 * Proxies the request from the frontend to avoid CORS issues and API Key exposure.
 */
const searchLocation = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 3) {
      return successResponse(res, { suggestions: [] });
    }

    // Fetch fresh Mappls token
    let token;
    try {
      token = await getFreshToken();
    } catch (tokenErr) {
      logger.error('Token fetch failed:', tokenErr.message);
      throw new Error('Failed to fetch Mappls authentication token');
    }

    // Mappls search API (returns highly accurate Indian POIs)
    const mapplsUrl = `https://atlas.mappls.com/api/places/search/json?query=${encodeURIComponent(query)}`;
    const response = await fetch(mapplsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Mappls API responded with ${response.status}`);
    }

    if (response.status === 204) {
      return successResponse(res, { suggestions: [] });
    }

    const text = await response.text();
    if (!text) {
      return successResponse(res, { suggestions: [] });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      logger.warn(`Failed to parse Mappls response: ${e.message}`);
      return successResponse(res, { suggestions: [] });
    }

    const suggestions = (data.suggestedLocations || []).map(loc => ({
      placeName: loc.placeName,
      placeAddress: loc.placeAddress,
      eLoc: loc.eLoc,
      latitude: loc.latitude || loc.lat, // usually missing, but keeping just in case
      longitude: loc.longitude || loc.lng // usually missing
    }));

    return successResponse(res, { suggestions });
  } catch (err) {
    logger.error('searchLocation error:', err);
    next(err); 
  }
};

/**
 * GET /map/reverse-geocode?lat=...&lng=...
 * Server-side proxy for reverse geocoding using Mappls.
 */
const reverseGeocode = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      throw new BadRequestError('Latitude and longitude are required');
    }

    let token;
    try {
      token = await getFreshToken();
    } catch (tokenErr) {
      logger.error('Token fetch failed:', tokenErr.message);
      throw new Error('Failed to fetch Mappls authentication token');
    }

    // Try atlas.mappls.com first (OAuth Bearer token API)
    let mapplsUrl = `https://atlas.mappls.com/api/places/geocode/json?lat=${lat}&lng=${lng}`;
    let response = await fetch(mapplsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      // Fallback to apis.mappls.com (OAuth license key path)
      logger.warn(`atlas reverse-geocode failed (HTTP ${response.status}). Trying apis.mappls.com fallback...`);
      mapplsUrl = `https://apis.mappls.com/advancedmaps/v1/${token}/rev_geocode?lat=${lat}&lng=${lng}`;
      response = await fetch(mapplsUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Mappls API responded with ${response.status}`);
    }

    const data = await response.json();
    const results = data.results || [];
    
    return successResponse(res, { results });
  } catch (err) {
    logger.error('reverseGeocode error:', err);
    next(err);
  }
};

module.exports = {
  getMapplsToken,
  searchLocation,
  reverseGeocode,
};