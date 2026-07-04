const prisma             = require('../config/prisma')
const { geofenceAlertQueue } = require('../jobs/index')
const { getLocalDate } = require('../utils/timezone')
const { validateCoordinatePrecision } = require('../utils/validateCoordinatePrecision')

// ─── Point-in-polygon (Ray casting algorithm) ─────────────────────
// No PostGIS needed — pure JS works for polygon zone checks
const isPointInPolygon = (lat, lng, polygon) => {
  // polygon.coordinates[0] is the outer ring: [[lng, lat], ...]
  const coords = polygon.coordinates[0]
  let inside = false
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i] // [lng, lat]
    const [xj, yj] = coords[j]
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

// ─── Haversine distance between two GPS points (in km) ────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Validate a user's location against their assigned territory.
 * Uses Haversine radius check (preferred) with polygon fallback.
 * 
 * @param {number} lat - User's latitude
 * @param {number} lng - User's longitude
 * @param {object} territory - Territory record with { polygon, centerLat, centerLng, radius }
 * @returns {{ isValid: boolean, distanceMeters: number|null }} 
 */
const validateLocationAgainstTerritory = (lat, lng, territory) => {
  // Strategy 1: Haversine radius check (precise, preferred)
  if (territory.centerLat != null && territory.centerLng != null && territory.radius != null) {
    const distanceKm = haversineKm(lat, lng, territory.centerLat, territory.centerLng)
    const distanceMeters = Math.round(distanceKm * 1000)
    const radiusMeters = territory.radius // already in meters
    return {
      isValid: distanceMeters <= radiusMeters,
      distanceMeters
    }
  }

  // Strategy 2: Polygon-based ray-casting (fallback)
  if (territory.polygon) {
    const inside = isPointInPolygon(lat, lng, territory.polygon)
    return {
      isValid: inside,
      distanceMeters: null // distance not available for polygon checks
    }
  }

  // No geofence configured — allow (no restriction)
  return { isValid: true, distanceMeters: null }
}

// ─── Store GPS ping + check geofence ──────────────────────────────
const storePing = async (userId, pingData) => {
  const { latitude, longitude, accuracy, speed, heading,
          altitude, batteryLevel, isMoving, recordedAt } = pingData

  // 1. Save the ping
  await prisma.locationLog.create({
    data: {
      userId, latitude, longitude, accuracy,
      speed, heading, altitude, batteryLevel,
      isMoving: isMoving ?? true,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    }
  })

  // 2. Get user's assigned territory
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { territoryId: true }
  })

  if (!user?.territoryId) return { stored: true, zoneCheck: 'no_zone_assigned' }

  const territory = await prisma.territory.findUnique({
    where:  { id: user.territoryId },
    select: { id: true, polygon: true, centerLat: true, centerLng: true, radius: true, name: true }
  })

  if (!territory) return { stored: true, zoneCheck: 'no_zone_found' }

  // Skip if no geofence configured (no polygon and no radius)
  if (!territory.polygon && territory.centerLat == null) {
    return { stored: true, zoneCheck: 'no_geofence_defined' }
  }

  // 3. Check if inside zone using unified validation
  const { isValid } = validateLocationAgainstTerritory(latitude, longitude, territory)

  if (!isValid) {
    // 4. Check if alert already fired in last 10 minutes (prevent spam)
    const recentAlert = await prisma.geofenceAlert.findFirst({
      where: {
        userId,
        territoryId: territory.id,
        resolved: false,
        alertedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }
      }
    })

    if (!recentAlert) {
      // Create alert directly instead of queueing since there is no worker
      const newAlert = await prisma.geofenceAlert.create({
        data: {
          userId,
          territoryId: territory.id,
          latitude,
          longitude,
        }
      });
      
      // Also notify the user via notification
      await prisma.notification.create({
        data: {
          userId,
          title: 'Geofence Breach',
          body: `You have exited your assigned territory (${territory.name}). Please return immediately.`,
          type: 'alert',
          referenceId: newAlert.id
        }
      });
    }

    return { stored: true, zoneCheck: 'outside_zone', insideZone: false }
  }

  return { stored: true, zoneCheck: 'inside_zone', insideZone: true }
}

// ─── Get today's route for a user ─────────────────────────────────
const getTodayRoute = async (userId) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const pings = await prisma.locationLog.findMany({
    where: {
      userId,
      recordedAt: { gte: today, lt: tomorrow }
    },
    orderBy: { recordedAt: 'asc' },
    select:  { latitude: true, longitude: true, recordedAt: true, speed: true }
  })

  if (pings.length < 2) return { pings, totalDistanceKm: 0 }

  // Calculate total distance
  let totalDistanceKm = 0
  for (let i = 1; i < pings.length; i++) {
    totalDistanceKm += haversineKm(
      pings[i - 1].latitude, pings[i - 1].longitude,
      pings[i].latitude,     pings[i].longitude
    )
  }

  // Build GeoJSON LineString
  const pathGeoJson = {
    type: 'LineString',
    coordinates: pings.map(p => [p.longitude, p.latitude])
  }

  return {
    pings,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    pathGeoJson,
  }
}

// ─── Save computed travel log on punch-out ─────────────────────────
const saveTravelLog = async (userId, attendanceId) => {
  const route = await getTodayRoute(userId)
  if (route.totalDistanceKm === 0) return null

  const today = getLocalDate()

  const existing = await prisma.travelLog.findFirst({
    where: { userId, date: today }
  })

  if (existing) {
    return prisma.travelLog.update({
      where: { id: existing.id },
      data: {
        totalDistanceKm: route.totalDistanceKm,
        pathGeoJson: route.pathGeoJson,
        ...(attendanceId && { attendanceId })
      }
    })
  } else {
    return prisma.travelLog.create({
      data: {
        userId,
        date: today,
        totalDistanceKm: route.totalDistanceKm,
        pathGeoJson: route.pathGeoJson,
        attendanceId
      }
    })
  }
}

// ─── Zone CRUD ─────────────────────────────────────────────────────
const createZone = async (orgId, data) => {
  if (data.centerLat !== undefined && data.centerLng !== undefined) {
    validateCoordinatePrecision(data.centerLat, data.centerLng);
  }
  if (data.polygon && data.polygon.coordinates && data.polygon.coordinates[0]) {
    data.polygon.coordinates[0].forEach(([lng, lat]) => {
      validateCoordinatePrecision(lat, lng);
    });
  }

  return prisma.territory.create({
    data: { organizationId: orgId, ...data }
  })
}

const getZones = async (orgId) => {
  return prisma.territory.findMany({
    where:   { organizationId: orgId },
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: 'desc' }
  })
}

const updateZone = async (zoneId, orgId, data) => {
  const zone = await prisma.territory.findFirst({
    where: { id: zoneId, organizationId: orgId }
  })
  if (!zone) {
    const err = new Error('Zone not found'); err.statusCode = 404; throw err
  }

  if (data.centerLat !== undefined && data.centerLng !== undefined) {
    validateCoordinatePrecision(data.centerLat, data.centerLng);
  }
  if (data.polygon && data.polygon.coordinates && data.polygon.coordinates[0]) {
    data.polygon.coordinates[0].forEach(([lng, lat]) => {
      validateCoordinatePrecision(lat, lng);
    });
  }

  return prisma.territory.update({ where: { id: zoneId }, data })
}

const deleteZone = async (zoneId, orgId) => {
  const zone = await prisma.territory.findFirst({
    where: { id: zoneId, organizationId: orgId }
  })
  if (!zone) {
    const err = new Error('Zone not found'); err.statusCode = 404; throw err
  }
  return prisma.territory.delete({ where: { id: zoneId } })
}

// ─── Assign zone to user ───────────────────────────────────────────
const assignZoneToUser = async (zoneId, userId, orgId) => {
  const [zone, user] = await Promise.all([
    prisma.territory.findFirst({ where: { id: zoneId, organizationId: orgId } }),
    prisma.user.findFirst({ where: { id: userId, organizationId: orgId } }),
  ])
  if (!zone) { const err = new Error('Zone not found');  err.statusCode = 404; throw err }
  if (!user) { const err = new Error('User not found');  err.statusCode = 404; throw err }

  return prisma.user.update({
    where: { id: userId },
    data:  { territoryId: zoneId },
    select: { id: true, name: true, territoryId: true }
  })
}

// ─── Get alerts ────────────────────────────────────────────────────
const getAlerts = async (orgId, { page = 1, limit = 20, resolved, userId } = {}) => {
  const where = {
    user: { organizationId: orgId },
    ...(resolved !== undefined && { resolved: resolved === 'true' }),
    ...(userId && { userId }),
  }
  const [alerts, total] = await Promise.all([
    prisma.geofenceAlert.findMany({
      where,
      orderBy: { alertedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user:      { select: { id: true, name: true, employeeId: true } },
        territory: { select: { id: true, name: true } },
      }
    }),
    prisma.geofenceAlert.count({ where })
  ])
  return { alerts, total, page, limit }
}

const resolveAlert = async (alertId, orgId) => {
  const alert = await prisma.geofenceAlert.findFirst({
    where: { id: alertId, user: { organizationId: orgId } }
  })
  if (!alert) { const err = new Error('Alert not found'); err.statusCode = 404; throw err }
  return prisma.geofenceAlert.update({
    where: { id: alertId },
    data:  { resolved: true }
  })
}

module.exports = {
  isPointInPolygon,
  haversineKm,
  validateLocationAgainstTerritory,
  storePing,
  getTodayRoute,
  saveTravelLog,
  createZone,
  getZones,
  updateZone,
  deleteZone,
  assignZoneToUser,
  getAlerts,
  resolveAlert,
}