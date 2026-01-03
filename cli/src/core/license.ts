/**
 * License Validation
 * Checks with cloud API for valid subscription
 */

import * as os from 'os';
import * as crypto from 'crypto';
import { readConfig, getApiUrl, isAuthenticated } from './config.js';

export interface LicenseStatus {
  valid: boolean;
  tier: string | null;
  seats: number;
  seatsUsed: number;
  features: string[];
  message?: string;
}

export interface ActivationResult {
  activated: boolean;
  machineId: string;
  seatsUsed?: number;
  seats?: number;
  message?: string;
  error?: string;
}

/**
 * Generate a unique machine ID based on hostname and MAC address
 */
function getMachineId(): string {
  const hostname = os.hostname();
  const networkInterfaces = os.networkInterfaces();

  // Get first non-internal MAC address
  let mac = '';
  for (const iface of Object.values(networkInterfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (!info.internal && info.mac !== '00:00:00:00:00:00') {
        mac = info.mac;
        break;
      }
    }
    if (mac) break;
  }

  // Create a hash of hostname + MAC
  const data = `${hostname}:${mac}`;
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
}

/**
 * Check license status with cloud API
 */
export async function checkLicense(): Promise<LicenseStatus> {
  if (!isAuthenticated()) {
    return {
      valid: false,
      tier: null,
      seats: 0,
      seatsUsed: 0,
      features: [],
      message: 'Not authenticated. Run `recall auth` to authenticate.',
    };
  }

  const config = readConfig();
  const apiUrl = getApiUrl();

  try {
    const response = await fetch(`${apiUrl}/license/check`, {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          valid: false,
          tier: null,
          seats: 0,
          seatsUsed: 0,
          features: [],
          message: 'Session expired. Run `recall auth` to re-authenticate.',
        };
      }

      const data = await response.json() as { error?: string; message?: string };
      return {
        valid: false,
        tier: null,
        seats: 0,
        seatsUsed: 0,
        features: [],
        message: data.message || data.error || 'License check failed',
      };
    }

    return await response.json() as LicenseStatus;
  } catch (error) {
    // Network error - allow offline operation with degraded features
    return {
      valid: true, // Allow offline use
      tier: 'offline',
      seats: 0,
      seatsUsed: 0,
      features: ['basic_context'], // Only basic features offline
      message: 'Offline mode - limited features available',
    };
  }
}

/**
 * Activate a license seat for this machine
 */
export async function activateLicense(): Promise<ActivationResult> {
  if (!isAuthenticated()) {
    return {
      activated: false,
      machineId: '',
      error: 'Not authenticated',
    };
  }

  const config = readConfig();
  const apiUrl = getApiUrl();
  const machineId = getMachineId();
  const hostname = os.hostname();

  try {
    const response = await fetch(`${apiUrl}/license/activate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ machineId, hostname }),
    });

    if (!response.ok) {
      const data = await response.json() as { error?: string };
      return {
        activated: false,
        machineId,
        error: data.error || 'Activation failed',
      };
    }

    return await response.json() as ActivationResult;
  } catch {
    return {
      activated: false,
      machineId,
      error: 'Network error during activation',
    };
  }
}

/**
 * Check if a specific feature is available
 */
export function hasFeature(license: LicenseStatus, feature: string): boolean {
  return license.valid && license.features.includes(feature);
}

/**
 * Get machine ID for debugging
 */
export function getLocalMachineId(): string {
  return getMachineId();
}
