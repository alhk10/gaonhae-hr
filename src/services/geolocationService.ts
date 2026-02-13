export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationError {
  code: number;
  message: string;
}

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

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

// Check if employee has location exception (with retry for resilience on mobile)
export const hasLocationException = async (employeeId: string, retries: number = 2): Promise<boolean> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logger.debug('Checking location exception for employee', { employeeId, attempt });
      
      const { data, error } = await supabase
        .from('location_exceptions')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('enabled', true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .maybeSingle();

      if (error) {
        logger.error('Error checking location exception', { error, attempt });
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
          continue;
        }
        return false;
      }

      const hasException = !!data;
      logger.debug('Location exception check result', { employeeId, hasException, attempt });
      return hasException;
    } catch (error) {
      logger.error('Error in hasLocationException', { error, attempt });
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return false;
    }
  }
  return false;
};

// Get current user location with better error handling
export const getCurrentLocation = (): Promise<Coordinates> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      logger.error('Geolocation not supported');
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser'
      });
      return;
    }

    logger.debug('Requesting geolocation');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        logger.debug('Geolocation success', coords);
        resolve(coords);
      },
      (error) => {
        logger.error('Geolocation error', error);
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

// Singapore branch coordinates - verified against actual addresses
const BRANCH_COORDINATES: { [key: string]: Coordinates } = {
  'Headquarters': { latitude: 1.3131, longitude: 103.8268 }, // 271 Bukit Timah Road, Balmoral Plaza
  'Balmoral': { latitude: 1.3131, longitude: 103.8268 }, // 271 Bukit Timah Road, Balmoral Plaza
  'Jurong West': { latitude: 1.3494, longitude: 103.6988 }, // Block 960 Jurong West Street 92
  'Kembangan': { latitude: 1.3210, longitude: 103.9130 }, // 18 Jalan Masjid, Kembangan Plaza
  'Yishun': { latitude: 1.4304, longitude: 103.8354 }, // Block 418 Yishun Ave 11
  'Bukit Merah': { latitude: 1.2830, longitude: 103.8200 }, // Block 162 Bukit Merah Central
  'Main Office': { latitude: 1.3131, longitude: 103.8268 }, // Same as Balmoral Plaza
  'Carpe Diem Jurong West': { latitude: 1.3440, longitude: 103.6960 }, // Blk 739 Jurong West Street 73
  'Carpe Diem Stradia': { latitude: 1.3770, longitude: 103.8590 }, // 78 Yio Chu Kang Road
};

// Updated function to check location with admin override support
export const isWithinBranchRange = async (
  maxDistance: number = 3000,
  employeeId?: string
): Promise<{ withinRange: boolean; nearestBranch?: string; distance?: number; hasException?: boolean }> => {
  try {
    logger.debug('Checking branch range', { maxDistance, employeeId });
    
    // First check if employee has location exception
    if (employeeId) {
      const hasException = await hasLocationException(employeeId);
      if (hasException) {
        logger.info('Employee has location exception - bypassing GPS check', { employeeId });
        return {
          withinRange: true,
          nearestBranch: 'Admin Override',
          distance: 0,
          hasException: true
        };
      }
    }
    
    const currentLocation = await getCurrentLocation();
    logger.debug('Current location obtained', currentLocation);
    
    let nearestBranch = '';
    let minDistance = Infinity;

    // Check distance to all branches
    Object.entries(BRANCH_COORDINATES).forEach(([branchName, branchCoords]) => {
      const distance = calculateDistance(currentLocation, branchCoords);
      logger.debug(`Distance to ${branchName}: ${distance.toFixed(2)} meters`);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestBranch = branchName;
      }
    });

    const withinRange = minDistance <= maxDistance;
    logger.info('Location check result', {
      withinRange,
      nearestBranch,
      distance: Math.round(minDistance),
      hasException: false
    });

    return {
      withinRange,
      nearestBranch,
      distance: Math.round(minDistance),
      hasException: false
    };
  } catch (error) {
    logger.error('Location check failed', error);
    throw error;
  }
};

// For testing purposes - allows bypassing location check in development
export const isLocationCheckEnabled = () => {
  // In production, always require location check
  // In development, you can set this to false for testing
  return true;
};
