const fetch = global.fetch || require("node-fetch");

/**
 * Proxy controller to call Google Routes API from the backend.
 *
 * Endpoint: POST /api/v1/route
 * Body: {
 *   origin: { lat: number, lng: number },
 *   destination: { lat: number, lng: number }
 * }
 *
 * This allows the mobile app to keep using an Android‑restricted Maps key
 * while the backend uses a separate server key (no Android app restriction)
 * for Routes API.
 */
const computeRoute = async (req, res) => {
  try {
    const { origin, destination } = req.body || {};

    if (
      !origin ||
      !destination ||
      typeof origin.lat !== "number" ||
      typeof origin.lng !== "number" ||
      typeof destination.lat !== "number" ||
      typeof destination.lng !== "number"
    ) {
      return res.status(400).json({
        error: "Bad Request",
        message:
          "origin and destination must be provided as { lat: number, lng: number }",
      });
    }

    const apiKey = process.env.ROUTES_API_KEY || process.env.GOOGLE_ROUTES_API_KEY;
    if (!apiKey) {
      console.error(
        "Routes API key not configured. Set ROUTES_API_KEY or GOOGLE_ROUTES_API_KEY in environment.",
      );
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Routes API key not configured",
      });
    }

    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const body = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode: "DRIVE",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Routes API error:",
        response.status,
        response.statusText,
        errorText,
      );
      return res.status(502).json({
        error: "Bad Gateway",
        message: "Failed to compute route",
        data: {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        },
      });
    }

    const data = await response.json();
    const routes = data.routes || [];
    if (!routes.length) {
      return res.status(404).json({
        error: "Not Found",
        message: "No route found",
        data,
      });
    }

    const route = routes[0];
    const duration = route.duration || null;
    const distanceMeters = route.distanceMeters || null;
    const encodedPolyline =
      (route.polyline && route.polyline.encodedPolyline) || null;

    return res.json({
      success: true,
      data: {
        duration,
        distanceMeters,
        encodedPolyline,
      },
    });
  } catch (error) {
    console.error("Error computing route:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to compute route",
    });
  }
};

module.exports = {
  computeRoute,
};

