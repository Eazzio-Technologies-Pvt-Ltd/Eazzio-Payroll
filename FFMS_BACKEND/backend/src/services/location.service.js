const prisma = require('../config/prisma');
const { emitToOrgAdmins } = require('../config/socket');
const { NotFoundError } = require('../utils/errors');
const logger = require('../config/logger');
const redis = require('../config/redis');
const { locationWriteQueue } = require('../jobs/locationWrite.job');
const { getLocalDate } = require('../utils/timezone');

/**
 * Calculate distance between two coordinates using the Haversine formula
 */
const calculateHaversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * Bulk insert locations and notify admin room via Socket
 */
const batchInsertLocation = async (userId, locations, organizationId) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Filter out invalid, zero or null coordinates
  const validLocations = locations.filter(loc => {
    const lat = loc.latitude;
    const lng = loc.longitude;
    return lat && lng && lat !== 0 && lng !== 0;
  });

  // Set the last location in Redis and emit socket immediately
  if (validLocations.length > 0) {
    const lastLoc = validLocations[validLocations.length - 1];
    const redisKey = `user:${userId}:location`;
    const redisPayload = {
      lat: lastLoc.latitude,
      lng: lastLoc.longitude,
      latitude: lastLoc.latitude,
      longitude: lastLoc.longitude,
      speed: lastLoc.speed || null,
      timestamp: new Date(lastLoc.recordedAt).getTime(),
      recordedAt: lastLoc.recordedAt,
      batteryLevel: lastLoc.batteryLevel || null,
      accuracy: lastLoc.accuracy,
      isMoving: lastLoc.isMoving,
      userName: user.name,
      role: user.role,
      organizationId,
      online: true
    };

    redis.set(redisKey, JSON.stringify(redisPayload), 'EX', 120).catch(err => {
      logger.error('Error writing to Redis in batchInsertLocation:', err);
    });

    emitToOrgAdmins(organizationId, 'location:update', redisPayload);
  }

  if (validLocations.length === 0) {
    return { inserted: 0 };
  }

  // Bulk insert location logs to PostgreSQL asynchronously using BullMQ
  const dataToInsert = validLocations.map(loc => ({
    userId,
    latitude: loc.latitude,
    longitude: loc.longitude,
    accuracy: loc.accuracy,
    speed: loc.speed || null,
    heading: loc.heading || null,
    altitude: loc.altitude || null,
    batteryLevel: loc.batteryLevel || null,
    isMoving: loc.isMoving,
    recordedAt: new Date(loc.recordedAt)
  }));

  const jobs = dataToInsert.map(loc => ({
    name: 'write',
    data: loc
  }));

  try {
    await locationWriteQueue.addBulk(jobs);
  } catch (err) {
    logger.error('Failed to queue location logs to BullMQ queue:', err);
    // Fallback: direct write if BullMQ queuing fails to prevent complete loss
    prisma.locationLog.createMany({
      data: dataToInsert
    }).catch(dbErr => {
      logger.error('Fallback locationLog write also failed:', dbErr);
    });
  }

  return { inserted: locations.length };
};

/**
 * Get live status of all field staff locations in last 2 hours
 */
const getLiveLocations = async (organizationId, managerId = null) => {
  // 1. Fetch all active field staff users
  const fieldStaff = await prisma.user.findMany({
    where: {
      organizationId,
      role: { in: ['FIELD_STAFF', 'OFFICE_STAFF'] },
      status: 'ACTIVE',
      ...(managerId && { managerId })
    },
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      lastActiveAt: true,
      territory: {
        select: {
          id: true,
          name: true,
          polygon: true
        }
      }
    }
  });

  if (fieldStaff.length === 0) return [];

  // 2. Fetch cached locations from Redis in parallel/pipeline
  const redisKeys = fieldStaff.map(staff => `user:${staff.id}:location`);
  let cachedLocations = [];
  try {
    cachedLocations = await redis.mget(redisKeys);
  } catch (err) {
    logger.error('Redis mget error in getLiveLocations:', err);
  }

  // 3. Identify users who don't have cached location in Redis
  const usersNeedDbFallback = [];
  const liveLocationsMap = new Map();

  fieldStaff.forEach((staff, index) => {
    const cached = cachedLocations[index];
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        liveLocationsMap.set(staff.id, {
          userId: staff.id,
          name: staff.name,
          role: staff.role,
          latitude: parsed.latitude || parsed.lat,
          longitude: parsed.longitude || parsed.lng,
          battery: parsed.batteryLevel,
          isMoving: parsed.isMoving,
          speed: parsed.speed,
          accuracy: parsed.accuracy,
          recordedAt: parsed.recordedAt || new Date(parsed.timestamp),
          territory: staff.territory,
          isOnline: true
        });
      } catch (e) {
        usersNeedDbFallback.push(staff.id);
      }
    } else {
      usersNeedDbFallback.push(staff.id);
    }
  });

  // 4. For users not cached in Redis, query database for their latest location log
  if (usersNeedDbFallback.length > 0) {
    const dbStaff = await prisma.user.findMany({
      where: {
        id: { in: usersNeedDbFallback }
      },
      select: {
        id: true,
        locationLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 1
        },
        attendances: {
          where: {
            date: getLocalDate()
          },
          orderBy: { sessionNumber: 'desc' },
          take: 1
        }
      }
    });

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    dbStaff.forEach(staff => {
      const lastLog = staff.locationLogs[0] || null;
      const todayAttendance = staff.attendances[0] || null;
      const staffInfo = fieldStaff.find(s => s.id === staff.id);

      let latitude = null;
      let longitude = null;
      let recordedAt = null;
      let battery = null;
      let isMoving = false;
      let speed = null;
      let accuracy = null;

      if (lastLog) {
        latitude = lastLog.latitude;
        longitude = lastLog.longitude;
        recordedAt = lastLog.recordedAt;
        battery = lastLog.batteryLevel;
        isMoving = lastLog.isMoving;
        speed = lastLog.speed;
        accuracy = lastLog.accuracy;
      } else if (todayAttendance && todayAttendance.checkInLatitude && todayAttendance.checkInLongitude) {
        latitude = todayAttendance.checkInLatitude;
        longitude = todayAttendance.checkInLongitude;
        recordedAt = todayAttendance.checkInTime || todayAttendance.createdAt;
      }

      // Online if location logged in last 2 hours OR checked in today OR logged in in last 12 hours
      const isOnline = 
        (lastLog && new Date(lastLog.recordedAt) >= twoHoursAgo) ||
        (staffInfo.lastActiveAt && new Date(staffInfo.lastActiveAt) >= twelveHoursAgo) ||
        !!todayAttendance;

      if (latitude && longitude && latitude !== 0 && longitude !== 0) {
        liveLocationsMap.set(staff.id, {
          userId: staff.id,
          name: staffInfo.name,
          role: staffInfo.role,
          latitude,
          longitude,
          battery,
          isMoving,
          speed,
          accuracy,
          recordedAt,
          territory: staffInfo.territory,
          isOnline
        });
      }
    });
  }

  return Array.from(liveLocationsMap.values());
};

/**
 * Get location log history for route playback and compute Haversine distance
 */
const getLocationHistory = async (userId, startDateStr, endDateStr, organizationId) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Parse dates, default to today
  const startOfDay = startDateStr ? new Date(`${startDateStr}T00:00:00.000Z`) : new Date();
  if (!startDateStr) {
    startOfDay.setUTCHours(0, 0, 0, 0);
  }

  const endOfDay = endDateStr ? new Date(`${endDateStr}T23:59:59.999Z`) : new Date();
  if (!endDateStr) {
    endOfDay.setUTCHours(23, 59, 59, 999);
  }

  // Fetch ordered logs
  const logs = await prisma.locationLog.findMany({
    where: {
      userId,
      recordedAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: { recordedAt: 'asc' }
  });

  // Calculate cumulative distance using Haversine
  let totalDistance = 0; // in km
  for (let i = 1; i < logs.length; i++) {
    const prev = logs[i - 1];
    const curr = logs[i];
    const distance = calculateHaversine(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    
    // Ignore spikes/GPS errors (e.g. distance > 50km in 1 min is unlikely)
    if (distance < 50) {
      totalDistance += distance;
    }
  }

  // Calculate active time
  let timeActiveMinutes = 0;
  if (logs.length > 1) {
    const durationMs = logs[logs.length - 1].recordedAt - logs[0].recordedAt;
    timeActiveMinutes = Math.floor(durationMs / 60000);
  }

  // Count unique locations (using 4 decimal places of lat/lng for approx 11m grid resolution)
  const uniqueCoords = new Set();
  logs.forEach(log => {
    const latGrid = log.latitude.toFixed(4);
    const lngGrid = log.longitude.toFixed(4);
    uniqueCoords.add(`${latGrid},${lngGrid}`);
  });

  return {
    userId,
    userName: user.name,
    startDate: startOfDay,
    endDate: endOfDay,
    totalDistanceKm: parseFloat(totalDistance.toFixed(2)),
    timeActiveMinutes,
    totalUniqueLocations: uniqueCoords.size,
    logs
  };
};

/**
 * Get live location of a single field staff (Redis first, fallback to DB)
 */
const getSingleLiveLocation = async (userId, organizationId) => {
  const redisKey = `user:${userId}:location`;
  try {
    const cached = await redis.get(redisKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.organizationId === organizationId) {
        return { ...parsed, online: true };
      }
    }
  } catch (err) {
    logger.error('Redis read error in getSingleLiveLocation:', err);
  }

  // Fallback to PostgreSQL
  const lastLog = await prisma.locationLog.findFirst({
    where: {
      userId,
      user: {
        organizationId
      }
    },
    orderBy: { recordedAt: 'desc' }
  });

  if (!lastLog) {
    return { online: false, lastSeen: null };
  }

  return {
    online: false,
    lastSeen: lastLog.recordedAt,
    latitude: lastLog.latitude,
    longitude: lastLog.longitude,
    lat: lastLog.latitude,
    lng: lastLog.longitude,
    batteryLevel: lastLog.batteryLevel,
    speed: lastLog.speed,
    accuracy: lastLog.accuracy,
    isMoving: lastLog.isMoving
  };
};

module.exports = {
  batchInsertLocation,
  getLiveLocations,
  getLocationHistory,
  getSingleLiveLocation
};
