import { describe, it, expect } from 'vitest';
import { estimateInsurance, getInsuranceGroup } from './insurance';
import type { EstimateInsuranceParams } from '@/types';

/**
 * Tests for the pure insurance-premium model in insurance.ts.
 *
 * Premium = round(500 * ageMult * groupMult * locMult * ncbMult * mileageMult)
 * low = round(premium * 0.8), high = round(premium * 1.2).
 * Expected values are computed by hand from the multiplier tables in the source.
 */

function params(overrides: Partial<EstimateInsuranceParams> = {}): EstimateInsuranceParams {
  return {
    driverAge: 35, // ageMult 1.0
    insuranceGroup: 15, // groupMult 1.0
    postcode: 'RG1', // urban -> 1.1
    ncbYears: 5, // ncbMult 0.5
    annualMileage: 10000, // 1.0
    ...overrides,
  };
}

describe('estimateInsurance', () => {
  it('composes multipliers for a representative low-risk profile', () => {
    // 500 * 1.0 * 1.0 * 1.1 * 0.5 * 1.0 = 275
    const r = estimateInsurance(params());
    expect(r.mid).toBe(275);
    expect(r.low).toBe(220); // round(275*0.8)
    expect(r.high).toBe(330); // round(275*1.2)
    expect(r.confidence).toBe('high');
  });

  it('composes multipliers for a high-risk young-driver profile', () => {
    // age 18 -> 3.8, group 35 (31-40) -> 1.55, London 'E1' -> 1.5,
    // ncb 0 -> 1.0, mileage 16000 (15k-20k) -> 1.2
    // 500*3.8*1.55*1.5*1.0*1.2 = 5301
    const r = estimateInsurance(
      params({ driverAge: 18, insuranceGroup: 35, postcode: 'E1', ncbYears: 0, annualMileage: 16000 })
    );
    expect(r.mid).toBe(5301);
    expect(r.low).toBe(4241); // round(5301*0.8)=4240.8
    expect(r.high).toBe(6361); // round(5301*1.2)=6361.2
  });

  it('applies the full 50% NCB discount at 5+ years vs no NCB', () => {
    // Profile: age 40 (1.0), group 5 (0.85), 'AB10' rural (0.9), mileage 7000 (0.95)
    const noNcb = estimateInsurance(
      params({ driverAge: 40, insuranceGroup: 5, postcode: 'AB10', ncbYears: 0, annualMileage: 7000 })
    );
    const fullNcb = estimateInsurance(
      params({ driverAge: 40, insuranceGroup: 5, postcode: 'AB10', ncbYears: 5, annualMileage: 7000 })
    );
    // ncb 0 -> 1.0: 500*1.0*0.85*0.9*1.0*0.95 = 363.375 -> 363
    expect(noNcb.mid).toBe(363);
    // ncb 5 -> 0.5: half of the above -> 181.6875 -> 182
    expect(fullNcb.mid).toBe(182);
    // NCB at 5yr is exactly the 50% multiplier; mid roughly halves
    expect(fullNcb.mid).toBeLessThan(noNcb.mid);
  });

  it('charges London postcodes more than rural postcodes, all else equal', () => {
    const london = estimateInsurance(params({ postcode: 'SW1' })); // 1.5
    const rural = estimateInsurance(params({ postcode: 'AB10' })); // 0.9
    // ratio should be 1.5/0.9
    expect(london.mid / rural.mid).toBeCloseTo(1.5 / 0.9, 5);
  });

  describe('age boundaries', () => {
    // Isolate the age multiplier: keep group 15(1.0), rural(0.9), ncb 0(1.0), mileage 10k(1.0)
    const isolate = (driverAge: number) =>
      estimateInsurance(params({ driverAge, insuranceGroup: 15, postcode: 'AB10', ncbYears: 0, annualMileage: 10000 }));

    it('17 and under share the 4.2 multiplier', () => {
      // 500 * 4.2 * 1.0 * 0.9 * 1.0 * 1.0 = 1890
      expect(isolate(16).mid).toBe(1890);
      expect(isolate(17).mid).toBe(1890);
    });

    it('25 (1.7) costs more than 26 (1.4) at the band edge', () => {
      expect(isolate(25).mid).toBe(765); // 500*1.7*0.9 = 765
      expect(isolate(26).mid).toBe(630); // 500*1.4*0.9 = 630
    });

    it('31 drops to the optimal 1.0 band from 30 (1.4)', () => {
      expect(isolate(30).mid).toBe(630); // 1.4
      expect(isolate(31).mid).toBe(450); // 500*1.0*0.9 = 450
    });

    it('66+ falls back to 1.0', () => {
      expect(isolate(66).mid).toBe(450); // fallback 1.0
      expect(isolate(80).mid).toBe(450);
    });
  });

  it('reports lower confidence when optional data is missing', () => {
    // missing group(0), zero mileage -> score drops below 4
    const r = estimateInsurance(params({ insuranceGroup: 0, annualMileage: 0 }));
    expect(r.confidence).toBe('medium');
  });
});

describe('getInsuranceGroup', () => {
  it('looks up a known car by make/model/generation', () => {
    expect(getInsuranceGroup('Mazda', 'MX5', 'NA')).toBe(28);
    expect(getInsuranceGroup('BMW', 'E46', 'M3')).toBe(42);
  });

  it('normalises spaces and case in the model name', () => {
    // 'Civic Type R' -> 'civic_type_r'; key 'honda_civic_type_r_fk8'
    expect(getInsuranceGroup('Honda', 'Civic Type R', 'FK8')).toBe(40);
  });

  it('falls back to group 30 for an unknown car', () => {
    expect(getInsuranceGroup('Tesla', 'Model 3')).toBe(30);
    expect(getInsuranceGroup('Mazda', 'MX5')).toBe(30); // no generation -> key miss -> fallback
  });
});
