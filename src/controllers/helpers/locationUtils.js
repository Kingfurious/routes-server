/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if location update should be throttled based on time and distance
 * @param {Object} lastLocation - Last location object with { lat, lng, updatedAt }
 * @param {number} newLat - New latitude
 * @param {number} newLng - New longitude
 * @param {number} minTimeSeconds - Minimum time between updates in seconds (default: 20)
 * @param {number} minDistanceMeters - Minimum distance moved in meters (default: 30)
 * @returns {Object} { shouldThrottle: boolean, reason?: string }
 */
const shouldThrottleLocationUpdate = (
  lastLocation,
  newLat,
  newLng,
  minTimeSeconds = 20,
  minDistanceMeters = 30
) => {
  if (!lastLocation || !lastLocation.updatedAt) {
    return { shouldThrottle: false };
  }

  const now = Date.now();
  let lastUpdateTime;

  // Handle Firestore Timestamp
  if (lastLocation.updatedAt && typeof lastLocation.updatedAt.toMillis === "function") {
    lastUpdateTime = lastLocation.updatedAt.toMillis();
  } else if (typeof lastLocation.updatedAt === "number") {
    lastUpdateTime = lastLocation.updatedAt;
  } else {
    return { shouldThrottle: false };
  }

  const timeSinceLastUpdate = (now - lastUpdateTime) / 1000; // Convert to seconds

  // If enough time has passed, allow update
  if (timeSinceLastUpdate >= minTimeSeconds) {
    return { shouldThrottle: false };
  }

  // Check distance moved
  if (lastLocation.lat && lastLocation.lng) {
    const distanceMoved = calculateDistance(
      lastLocation.lat,
      lastLocation.lng,
      newLat,
      newLng
    );

    // If moved enough distance, allow update even if time is short
    if (distanceMoved >= minDistanceMeters) {
      return { shouldThrottle: false };
    }

    // Both time and distance thresholds not met
    return {
      shouldThrottle: true,
      reason: `Location update throttled: ${timeSinceLastUpdate.toFixed(1)}s since last update, ${distanceMoved.toFixed(1)}m moved (min: ${minTimeSeconds}s or ${minDistanceMeters}m)`,
    };
  }

  // No previous location data, allow update
  return { shouldThrottle: false };
};

module.exports = {
  calculateDistance,
  shouldThrottleLocationUpdate,
};
