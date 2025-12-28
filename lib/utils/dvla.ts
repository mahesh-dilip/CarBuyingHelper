/**
 * DVLA API Client
 * UK Government Vehicle Enquiry Service
 */

import { DVLAVehicleData } from '@/types';

const DVLA_API_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
const DVLA_API_KEY = process.env.DVLA_API_KEY;

if (!DVLA_API_KEY) {
  console.warn('Warning: DVLA_API_KEY is not set');
}

export interface DVLAError {
  status: string;
  code: string;
  title: string;
  detail: string;
}

export interface DVLAErrorResponse {
  errors: DVLAError[];
}

/**
 * Look up vehicle data by registration number
 */
export async function lookupVehicle(
  registrationNumber: string
): Promise<DVLAVehicleData | null> {
  if (!DVLA_API_KEY) {
    console.error('DVLA API key not configured');
    return null;
  }

  // Remove spaces and convert to uppercase
  const cleanedReg = registrationNumber.replace(/\s+/g, '').toUpperCase();

  try {
    const response = await fetch(DVLA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': DVLA_API_KEY,
      },
      body: JSON.stringify({
        registrationNumber: cleanedReg,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('Vehicle not found in DVLA database');
        return null;
      }

      const errorData: DVLAErrorResponse = await response.json();
      console.error('DVLA API error:', errorData.errors);
      return null;
    }

    const data: DVLAVehicleData = await response.json();
    return data;
  } catch (error) {
    console.error('DVLA API request failed:', error);
    return null;
  }
}

/**
 * Extract annual tax amount from DVLA data
 * Note: DVLA API doesn't directly provide tax amount, so we estimate based on CO2 emissions
 */
export function estimateTaxFromVehicleData(vehicleData: DVLAVehicleData): number {
  const { co2Emissions, fuelType, monthOfFirstRegistration } = vehicleData;

  // For vehicles registered before April 2017, tax is based on CO2 emissions
  // For vehicles registered after April 2017, different rates apply

  const registrationDate = monthOfFirstRegistration
    ? new Date(monthOfFirstRegistration + '-01')
    : null;

  const isPreApril2017 = registrationDate
    ? registrationDate < new Date('2017-04-01')
    : false;

  if (isPreApril2017) {
    // Pre-April 2017 tax bands (simplified)
    if (!co2Emissions) return 200; // Default estimate

    if (co2Emissions === 0) return 0; // Zero emission
    if (co2Emissions <= 100) return 0;
    if (co2Emissions <= 110) return 20;
    if (co2Emissions <= 130) return 35;
    if (co2Emissions <= 150) return 165;
    if (co2Emissions <= 170) return 210;
    if (co2Emissions <= 190) return 270;
    if (co2Emissions <= 225) return 310;
    if (co2Emissions <= 255) return 580;
    return 600; // Over 255 g/km
  } else {
    // Post-April 2017 (simplified - most cars fall into standard rate)
    if (fuelType?.toLowerCase().includes('electric')) return 0;

    // First year rates vary widely, but standard rate is consistent
    // Standard rate (2024/25): £180 for petrol/diesel, £170 for alternative fuels
    if (fuelType?.toLowerCase().includes('hybrid')) return 170;
    return 180;
  }
}

/**
 * Get a user-friendly description of MOT status
 */
export function getMotStatusDescription(vehicleData: DVLAVehicleData): string {
  const { motStatus, motExpiryDate } = vehicleData;

  if (motStatus === 'No details held by DVLA') {
    return 'No MOT history available (may be exempt or very new)';
  }

  if (motStatus === 'Valid' && motExpiryDate) {
    const expiryDate = new Date(motExpiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return `MOT expired ${Math.abs(daysUntilExpiry)} days ago`;
    } else if (daysUntilExpiry < 30) {
      return `MOT valid but expiring soon (${daysUntilExpiry} days)`;
    } else {
      return `MOT valid until ${motExpiryDate}`;
    }
  }

  if (motStatus === 'Not valid') {
    return 'MOT has expired - vehicle not roadworthy';
  }

  return motStatus;
}

/**
 * Get a user-friendly description of tax status
 */
export function getTaxStatusDescription(vehicleData: DVLAVehicleData): string {
  const { taxStatus, taxDueDate } = vehicleData;

  if (taxStatus === 'Taxed') {
    return taxDueDate ? `Taxed until ${taxDueDate}` : 'Currently taxed';
  }

  if (taxStatus === 'SORN') {
    return 'SORN (Statutory Off Road Notification) - not licensed for road use';
  }

  if (taxStatus === 'Untaxed') {
    return 'Not taxed - will need to be taxed before driving';
  }

  return taxStatus;
}

/**
 * Check if a vehicle is roadworthy (taxed and MOT'd)
 */
export function isRoadworthy(vehicleData: DVLAVehicleData): boolean {
  const taxedOK = vehicleData.taxStatus === 'Taxed';
  const motOK = vehicleData.motStatus === 'Valid' || vehicleData.motStatus === 'No details held by DVLA';

  return taxedOK && motOK;
}
