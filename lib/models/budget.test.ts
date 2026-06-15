import { describe, it, expect } from 'vitest';
import { calculateTakeHome, calculateBudget } from './budget';
import type { CalculateBudgetParams } from '@/types';

/**
 * Tests for the pure UK take-home / affordability logic in budget.ts.
 *
 * Expected values are derived by hand from the formulas in the source
 * (2024/25 bands: PA £12,570, basic to £50,270 @20%, higher to £125,140 @40%,
 * additional @45%; NI 12% £12,570-£50,270, 2% above; net rounded /12).
 */
describe('calculateTakeHome', () => {
  it('returns zero for zero income', () => {
    expect(calculateTakeHome(0)).toBe(0);
  });

  it('applies no tax or NI below the personal allowance', () => {
    // 10000 < PA(12570) and < NI threshold(12570) -> full amount /12
    expect(calculateTakeHome(10000)).toBe(833); // 10000/12 = 833.33
  });

  it('returns full net at exactly the personal allowance threshold', () => {
    // 12570: taxable 0, NI 0 -> 12570/12 = 1047.5 -> 1048
    expect(calculateTakeHome(12570)).toBe(1048);
  });

  it('applies only basic-rate tax and NI in the basic band', () => {
    // 30000: tax = (30000-12570)*0.20 = 3486
    //        NI  = (30000-12570)*0.12 = 2091.6
    //        net = 24422.4 /12 = 2035.2 -> 2035
    expect(calculateTakeHome(30000)).toBe(2035);
  });

  it('applies higher-rate tax above £50,270', () => {
    // 60000: basic 37700*0.20=7540; higher 9730*0.40=3892; tax=11432
    //        NI 37700*0.12=4524 + 9730*0.02=194.6 = 4718.6
    //        net = 43849.4 /12 = 3654.12 -> 3654
    expect(calculateTakeHome(60000)).toBe(3654);
  });

  it('applies additional-rate tax above £125,140', () => {
    // 150000: tax 7540 + 29948 + 11187 = 48675
    //         NI 4524 + 99730*0.02(1994.6) = 6518.6
    //         net = 94806.4 /12 = 7900.53 -> 7901
    expect(calculateTakeHome(150000)).toBe(7901);
  });

  it('does NOT taper the personal allowance above £100k (simplified model)', () => {
    // The real 2024/25 rule removes £1 of PA per £2 over £100k.
    // This model does not implement it: PA stays £12,570 at £100k+.
    // Verify the model behaves as written (regression guard, documents the gap).
    // 110000: taxable=97430. basic 37700*0.20=7540.
    //         higher min(97430-37700, 74870)=59730*0.40=23892. tax=31432.
    //         NI 4524 + 59730*0.02(1194.6)=5718.6.
    //         net=110000-31432-5718.6=72849.4 /12=6070.78 -> 6071
    expect(calculateTakeHome(110000)).toBe(6071);
  });

  it('is monotonic: more gross never yields less take-home', () => {
    let prev = -1;
    for (const g of [0, 12570, 30000, 50270, 60000, 100000, 125140, 150000]) {
      const net = calculateTakeHome(g);
      expect(net).toBeGreaterThanOrEqual(prev);
      prev = net;
    }
  });
});

const baseParams: CalculateBudgetParams = {
  monthlyIncome: 3000,
  rent: 800,
  bills: 200,
  livingExpenses: 400,
  savingsGoal: 200,
  investmentGoal: 100,
  currentSavings: 0,
};

describe('calculateBudget', () => {
  it('computes core metrics for a no-emergency-fund starter profile', () => {
    const b = calculateBudget(baseParams);
    // monthlyExpenses = 1400, disposable = 3000-1400-300 = 1300
    expect(b.monthlyExpenses).toBe(1400);
    expect(b.monthlyDisposable).toBe(1300);
    expect(b.emergencyFundTarget).toBe(4200); // 1400 * 3
    expect(b.emergencyFundStatus).toBe('none');
    // monthsForEmergencyFund = ceil(4200 / 650) = 7; no extra car months needed
    expect(b.monthsToReady).toBe(7);
    // maxPurchasePrice = 0 + 1300*7 - 4200 - 500 = 4400
    expect(b.maxPurchasePrice).toBe(4400);
    expect(b.recommendedPurchasePrice).toBe(3740); // round(4400*0.85)
    expect(b.maxMonthlyRunning).toBe(390); // round(1300*0.3)
    expect(b.recommendedMonthlyRunning).toBe(312); // round(390*0.8)
    expect(b.budgetTier).toBe('moderate');
  });

  it('flags a partial emergency fund (1 <= months < 3)', () => {
    // expenses 1400, savings 2800 -> 2 months -> partial
    const b = calculateBudget({ ...baseParams, currentSavings: 2800 });
    expect(b.emergencyFundStatus).toBe('partial');
  });

  it('flags a complete emergency fund and uses savings immediately when ample', () => {
    const params: CalculateBudgetParams = {
      monthlyIncome: 4000,
      rent: 1000,
      bills: 300,
      livingExpenses: 500,
      savingsGoal: 300,
      investmentGoal: 200,
      currentSavings: 20000,
    };
    const b = calculateBudget(params);
    // expenses 1800, disposable 1700, target 5400, 20000/1800=11.1mo -> complete
    expect(b.emergencyFundStatus).toBe('complete');
    expect(b.monthlyDisposable).toBe(1700);
    expect(b.monthsToReady).toBe(0);
    // availableNow = 20000 - 5400 - 1000 = 13600 (>=3000 path)
    expect(b.maxPurchasePrice).toBe(13600);
    expect(b.recommendedPurchasePrice).toBe(11560); // round(13600*0.85)
  });

  it('never reports a max purchase price below the £2000 floor for valid inputs', () => {
    // Sweep a range of realistic profiles; the floor (Math.max(2000, ...)) must hold.
    for (const income of [2000, 2500, 3000, 4000, 6000]) {
      for (const savings of [0, 1000, 5000, 15000]) {
        const b = calculateBudget({ ...baseParams, monthlyIncome: income, currentSavings: savings });
        expect(b.maxPurchasePrice).toBeGreaterThanOrEqual(2000);
      }
    }
  });

  it('caps max monthly running at 30% of disposable income', () => {
    const b = calculateBudget(baseParams);
    expect(b.maxMonthlyRunning).toBe(Math.round(b.monthlyDisposable * 0.3));
  });

  it('produces NaN when income and expenses are all zero (documents division-by-zero edge)', () => {
    // KNOWN GAP: with monthlyExpenses === 0 the emergency-fund month count is
    // ceil(0/0) = NaN, which propagates into maxPurchasePrice. The £2000 floor
    // does NOT rescue this because Math.max(2000, NaN) === NaN.
    const b = calculateBudget({
      monthlyIncome: 0,
      rent: 0,
      bills: 0,
      livingExpenses: 0,
      savingsGoal: 0,
      investmentGoal: 0,
      currentSavings: 0,
    });
    expect(Number.isNaN(b.maxPurchasePrice)).toBe(true);
  });
});
