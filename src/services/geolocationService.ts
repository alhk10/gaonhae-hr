
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationError {
  code: number;
  message: string;
}

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  coord1: Coordinates,
  coord2: Coordinates
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.latitude * Math.PI) / 180;
  const φ2 = (coord2.latitude * Math.PI) / 180;
  const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
  const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Get current user location with better error handling
export const getCurrentLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser'
      });
      return;
    }

    console.log('Requesting geolocation...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        console.log('Geolocation success:', coords);
        resolve(coords);
      },
      (error) => {
        console.error('Geolocation error:', error);
        let message = 'Unable to retrieve location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable. Please check your device settings.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out. Please try again.';
            break;
        }
        reject({
          code: error.code,
          message
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 60000
      }
    );
  });
};

// Updated Singapore branch coordinates with more accurate locations
const BRANCH_COORDINATES: { [key: string]: Coordinates } = {
  'Headquarters': { latitude: 1.2786, longitude: 103.8480 }, // CBD area
  'Balmoral': { latitude: 1.3200, longitude: 103.8450 }, // Balmoral area
  'Jurong West': { latitude: 1.3404, longitude: 103.7090 }, // Jurong West
  'Kembangan': { latitude: 1.3210, longitude: 103.9130 }, // Kembangan
  'Yishun': { latitude: 1.4304, longitude: 103.8354 }, // Yishun
  'Bukit Merah': { latitude: 1.2830, longitude: 103.8200 }, // Bukit Merah
  'Main Office': { latitude: 1.2786, longitude: 103.8480 }, // Default to CBD
};

// Check if user is within range of any branch with better logging
export const isWithinBranchRange = async (
  maxDistance: number = 100
): Promise<{ withinRange: boolean; nearestBranch?: string; distance?: number }> => {
  try {
    console.log('Checking branch range with max distance:', maxDistance);
    
    const currentLocation = await getCurrentLocation();
    console.log('Current location obtained:', currentLocation);
    
    let nearestBranch = '';
    let minDistance = Infinity;

    // Check distance to all branches
    Object.entries(BRANCH_COORDINATES).forEach(([branchName, branchCoords]) => {
      const distance = calculateDistance(currentLocation, branchCoords);
      console.log(`Distance to ${branchName}:`, distance.toFixed(2), 'meters');
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestBranch = branchName;
      }
    });

    const withinRange = minDistance <= maxDistance;
    console.log('Location check result:', {
      withinRange,
      nearestBranch,
      distance: Math.round(minDistance)
    });

    return {
      withinRange,
      nearestBranch,
      distance: Math.round(minDistance)
    };
  } catch (error) {
    console.error('Location check failed:', error);
    throw error;
  }
};

// For testing purposes - allows bypassing location check in development
export const isLocationCheckEnabled = () => {
  // In production, always require location check
  // In development, you can set this to false for testing
  return true;
};
