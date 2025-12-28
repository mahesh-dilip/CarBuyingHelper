/**
 * Insurance Estimation Model
 * Estimates annual car insurance premiums based on multiple factors
 */

import { EstimateInsuranceParams, InsuranceEstimate, Confidence } from '@/types';

// Base premium (national average for 35yo, group 15, 5yr NCB)
const BASE_PREMIUM = 500;

/**
 * Age multipliers based on actuarial data
 * Younger drivers = higher risk = higher premiums
 */
function getAgeMultiplier(age: number): number {
  if (age <= 17) return 4.2;
  if (age === 18) return 3.8;
  if (age === 19) return 3.4;
  if (age === 20) return 3.0;
  if (age === 21) return 2.6;
  if (age === 22) return 2.3;
  if (age === 23) return 2.1;
  if (age === 24) return 1.9;
  if (age === 25) return 1.7;
  if (age >= 26 && age <= 30) return 1.4;
  if (age >= 31 && age <= 40) return 1.0;
  if (age >= 41 && age <= 50) return 0.95;
  if (age >= 51 && age <= 65) return 0.9;
  return 1.0; // 66+
}

/**
 * Insurance group multipliers
 * Groups 1-50, higher groups = more expensive cars to insure
 */
function getGroupMultiplier(group: number): number {
  if (group >= 1 && group <= 10) return 0.85;
  if (group >= 11 && group <= 20) return 1.0;
  if (group >= 21 && group <= 30) return 1.25;
  if (group >= 31 && group <= 40) return 1.55;
  if (group >= 41 && group <= 50) return 1.9;
  return 1.0; // Fallback
}

/**
 * Location multipliers based on UK postcode area
 * Urban areas and high-theft zones = higher premiums
 */
function getLocationMultiplier(postcode: string): number {
  const area = postcode.toUpperCase().replace(/[^A-Z]/g, '');

  // London postcodes
  const londonAreas = ['E', 'N', 'W', 'SW', 'SE', 'NW', 'EC', 'WC'];
  if (londonAreas.some(la => area.startsWith(la))) return 1.5;

  // Major cities
  const majorCities = ['B', 'M', 'L', 'G', 'BS', 'LS', 'S', 'NE'];
  if (majorCities.some(mc => area.startsWith(mc))) return 1.25;

  // Urban areas
  const urbanAreas = ['BD', 'BN', 'CV', 'LE', 'NG', 'OX', 'RG', 'SO'];
  if (urbanAreas.some(ua => area.startsWith(ua))) return 1.1;

  // Rural/low-risk areas
  return 0.9;
}

/**
 * No Claims Bonus (NCB) discount multiplier
 * More years without claims = larger discount
 */
function getNCBMultiplier(years: number): number {
  if (years === 0) return 1.0;
  if (years === 1) return 0.85;
  if (years === 2) return 0.75;
  if (years === 3) return 0.65;
  if (years === 4) return 0.55;
  if (years >= 5) return 0.5;
  return 1.0;
}

/**
 * Mileage adjustment
 * Higher annual mileage = more exposure = higher premium
 */
function getMileageAdjustment(annualMileage: number): number {
  if (annualMileage < 5000) return 0.9;
  if (annualMileage >= 5000 && annualMileage < 8000) return 0.95;
  if (annualMileage >= 8000 && annualMileage < 12000) return 1.0;
  if (annualMileage >= 12000 && annualMileage < 15000) return 1.1;
  if (annualMileage >= 15000 && annualMileage < 20000) return 1.2;
  return 1.35; // 20000+
}

/**
 * Describes the impact of age on insurance cost
 */
function describeAgeImpact(age: number): string {
  if (age < 25) return `Under 25: Significantly increases premium (+${Math.round((getAgeMultiplier(age) - 1) * 100)}%)`;
  if (age >= 25 && age < 30) return `25-30: Moderate impact (+${Math.round((getAgeMultiplier(age) - 1) * 100)}%)`;
  if (age >= 30 && age <= 50) return `${age}: Optimal age range (minimal impact)`;
  return `Over 50: Slight discount (-${Math.round((1 - getAgeMultiplier(age)) * 100)}%)`;
}

/**
 * Describes the impact of insurance group
 */
function describeGroupImpact(group: number): string {
  if (group <= 10) return `Group ${group}: Low risk, discounted premium`;
  if (group <= 20) return `Group ${group}: Average risk, standard premium`;
  if (group <= 30) return `Group ${group}: Above average risk (+25%)`;
  if (group <= 40) return `Group ${group}: High risk (+55%)`;
  return `Group ${group}: Very high risk (+90%)`;
}

/**
 * Describes the impact of location
 */
function describeLocationImpact(postcode: string): string {
  const multiplier = getLocationMultiplier(postcode);
  if (multiplier >= 1.5) return `London area: Very high theft/accident risk (+50%)`;
  if (multiplier >= 1.25) return `Major city: High risk (+25%)`;
  if (multiplier >= 1.1) return `Urban area: Moderate risk (+10%)`;
  return `Rural area: Low risk (-10%)`;
}

/**
 * Describes the impact of NCB
 */
function describeNCBImpact(years: number): string {
  if (years === 0) return `No NCB: No discount`;
  if (years < 3) return `${years} year(s) NCB: ${Math.round((1 - getNCBMultiplier(years)) * 100)}% discount`;
  if (years >= 5) return `${years}+ years NCB: Maximum discount (50%)`;
  return `${years} years NCB: ${Math.round((1 - getNCBMultiplier(years)) * 100)}% discount`;
}

/**
 * Calculate confidence level based on available data
 */
function calculateConfidence(params: EstimateInsuranceParams): Confidence {
  let score = 0;

  // Age is always provided and reliable
  score += 1;

  // Insurance group accuracy
  if (params.insuranceGroup > 0 && params.insuranceGroup <= 50) score += 1;

  // Postcode detail (partial postcode is less accurate)
  if (params.postcode && params.postcode.length >= 2) score += 1;

  // NCB is self-reported and reliable
  if (params.ncbYears >= 0) score += 1;

  // Mileage is self-reported
  if (params.annualMileage > 0) score += 1;

  if (score >= 4) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

/**
 * Main insurance estimation function
 */
export function estimateInsurance(params: EstimateInsuranceParams): InsuranceEstimate {
  const ageMultiplier = getAgeMultiplier(params.driverAge);
  const groupMultiplier = getGroupMultiplier(params.insuranceGroup);
  const locationMultiplier = getLocationMultiplier(params.postcode);
  const ncbMultiplier = getNCBMultiplier(params.ncbYears);
  const mileageAdjustment = getMileageAdjustment(params.annualMileage);

  // Calculate base estimate
  const estimatedPremium = Math.round(
    BASE_PREMIUM *
    ageMultiplier *
    groupMultiplier *
    locationMultiplier *
    ncbMultiplier *
    mileageAdjustment
  );

  // Add variance for range (±20%)
  const variance = 0.2;
  const low = Math.round(estimatedPremium * (1 - variance));
  const mid = estimatedPremium;
  const high = Math.round(estimatedPremium * (1 + variance));

  return {
    low,
    mid,
    high,
    confidence: calculateConfidence(params),
    factors: {
      ageImpact: describeAgeImpact(params.driverAge),
      groupImpact: describeGroupImpact(params.insuranceGroup),
      locationImpact: describeLocationImpact(params.postcode),
      ncbImpact: describeNCBImpact(params.ncbYears),
    },
  };
}

/**
 * Lookup table for common car insurance groups
 * Expand this as needed with more cars
 */
export const INSURANCE_GROUPS: Record<string, number> = {
  // Mazda MX-5
  'mazda_mx5_na': 28,
  'mazda_mx5_nb': 29,
  'mazda_mx5_nc': 30,
  'mazda_mx5_nd': 32,

  // BMW E46
  'bmw_e46_316i': 28,
  'bmw_e46_318i': 30,
  'bmw_e46_320i': 32,
  'bmw_e46_325i': 33,
  'bmw_e46_330i': 35,
  'bmw_e46_m3': 42,

  // Toyota GT86 / Subaru BRZ
  'toyota_gt86': 33,
  'subaru_brz': 33,

  // Ford Fiesta ST
  'ford_fiesta_st_mk6': 28,
  'ford_fiesta_st_mk7': 30,
  'ford_fiesta_st_mk8': 32,

  // Honda Civic Type R
  'honda_civic_type_r_ep3': 33,
  'honda_civic_type_r_fn2': 35,
  'honda_civic_type_r_fk2': 38,
  'honda_civic_type_r_fk8': 40,

  // Porsche
  'porsche_986_boxster': 40,
  'porsche_987_boxster': 42,
  'porsche_996_911': 45,
  'porsche_997_911': 47,

  // Toyota MR2
  'toyota_mr2_mk2': 32,
  'toyota_mr2_mk3': 30,

  // VW Golf GTI
  'vw_golf_gti_mk5': 30,
  'vw_golf_gti_mk6': 32,
  'vw_golf_gti_mk7': 34,

  // Mini Cooper S
  'mini_cooper_s_r53': 28,
  'mini_cooper_s_r56': 30,
  'mini_cooper_s_f56': 32,
};

/**
 * Get insurance group for a car by make and model
 * Returns a default/estimated group if not found
 */
export function getInsuranceGroup(make: string, model: string, generation?: string): number {
  const key = `${make.toLowerCase()}_${model.toLowerCase().replace(/\s+/g, '_')}${generation ? `_${generation.toLowerCase()}` : ''}`;

  return INSURANCE_GROUPS[key] || 30; // Default to group 30 if unknown
}
