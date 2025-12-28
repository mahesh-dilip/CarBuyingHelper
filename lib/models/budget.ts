/**
 * Budget Calculation Model
 * Calculates affordability and creates savings plans
 */

import {
  CalculateBudgetParams,
  Budget,
  BudgetTier,
  EmergencyFundStatus,
  GenerateBudgetPlanParams,
  BudgetPlan,
  BudgetPhase,
  BudgetTimeline,
  PostPurchaseItem,
  CarResearch,
} from '@/types';
import { addMonths } from 'date-fns';

/**
 * UK Tax calculation (simplified)
 * Returns monthly take-home from annual gross income
 */
export function calculateTakeHome(annualGross: number): number {
  // UK Tax Bands 2024/25
  const personalAllowance = 12570;
  const basicRateThreshold = 50270;
  const higherRateThreshold = 125140;

  let taxableIncome = Math.max(0, annualGross - personalAllowance);
  let tax = 0;

  // Basic rate (20%)
  if (taxableIncome > 0) {
    const basicRateTax = Math.min(taxableIncome, basicRateThreshold - personalAllowance) * 0.20;
    tax += basicRateTax;
  }

  // Higher rate (40%)
  if (taxableIncome > (basicRateThreshold - personalAllowance)) {
    const higherRateTaxable = Math.min(
      taxableIncome - (basicRateThreshold - personalAllowance),
      higherRateThreshold - basicRateThreshold
    );
    tax += higherRateTaxable * 0.40;
  }

  // Additional rate (45%)
  if (taxableIncome > (higherRateThreshold - personalAllowance)) {
    const additionalRateTaxable = taxableIncome - (higherRateThreshold - personalAllowance);
    tax += additionalRateTaxable * 0.45;
  }

  // National Insurance (simplified - Class 1 employee)
  let ni = 0;
  const niThreshold = 12570;
  const niUpperLimit = 50270;

  if (annualGross > niThreshold) {
    const niablePrimary = Math.min(annualGross - niThreshold, niUpperLimit - niThreshold);
    ni += niablePrimary * 0.12; // 12% on earnings between threshold and upper limit
  }

  if (annualGross > niUpperLimit) {
    ni += (annualGross - niUpperLimit) * 0.02; // 2% on earnings above upper limit
  }

  const annualNet = annualGross - tax - ni;
  return Math.round(annualNet / 12);
}

/**
 * Calculate budget and affordability
 */
export function calculateBudget(params: CalculateBudgetParams): Budget {
  const {
    monthlyIncome,
    rent,
    bills,
    livingExpenses,
    savingsGoal,
    investmentGoal,
    currentSavings,
  } = params;

  // Calculate key metrics
  const monthlyExpenses = rent + bills + livingExpenses;
  const monthlyCommitments = savingsGoal + investmentGoal;
  const monthlyDisposable = monthlyIncome - monthlyExpenses - monthlyCommitments;

  // Emergency fund calculation
  const emergencyFundTarget = monthlyExpenses * 3; // 3 months of essential expenses
  const emergencyFundMonths = currentSavings / monthlyExpenses;

  let emergencyFundStatus: EmergencyFundStatus = 'none';
  if (emergencyFundMonths >= 3) {
    emergencyFundStatus = 'complete';
  } else if (emergencyFundMonths >= 1) {
    emergencyFundStatus = 'partial';
  }

  // Calculate how much can be allocated to car
  // Conservative: Build full emergency fund first
  // Moderate: Split between emergency fund and car fund
  // Aggressive: Minimal emergency fund, max car budget

  const needsEmergencyFund = emergencyFundStatus !== 'complete';
  const emergencyFundShortfall = Math.max(0, emergencyFundTarget - currentSavings);

  // Available for car purchase (after maintaining emergency fund)
  let maxPurchasePrice = 0;
  let monthsToReady = 0;
  let budgetTier: BudgetTier = 'moderate';

  // Moderate tier: Split savings 50/50 between emergency fund and car fund
  if (needsEmergencyFund) {
    const monthlySavingsForCar = monthlyDisposable * 0.5;
    const monthlySavingsForEmergency = monthlyDisposable * 0.5;

    // Months to build emergency fund
    const monthsForEmergencyFund = Math.ceil(emergencyFundShortfall / monthlySavingsForEmergency);

    // At that point, we'll have saved for car too
    const carSavingsAtEmergencyComplete = monthlySavingsForCar * monthsForEmergencyFund;

    // Then continue saving for car with full disposable income
    const targetCarBudget = 4000; // Minimum sensible budget for enthusiast car
    const additionalMonthsNeeded = Math.max(
      0,
      Math.ceil((targetCarBudget - carSavingsAtEmergencyComplete) / monthlyDisposable)
    );

    monthsToReady = monthsForEmergencyFund + additionalMonthsNeeded;
    maxPurchasePrice = Math.round(
      currentSavings +
      (monthlyDisposable * monthsToReady) -
      emergencyFundTarget -
      500 // Keep £500 buffer
    );
  } else {
    // Already have emergency fund, can use savings minus buffer
    const availableNow = Math.max(0, currentSavings - emergencyFundTarget - 1000);
    const monthlySavings = monthlyDisposable * 0.7; // 70% to car, 30% buffer

    if (availableNow >= 3000) {
      maxPurchasePrice = Math.round(availableNow);
      monthsToReady = 0;
    } else {
      const targetCarBudget = 4000;
      monthsToReady = Math.ceil((targetCarBudget - availableNow) / monthlySavings);
      maxPurchasePrice = Math.round(availableNow + (monthlySavings * monthsToReady));
    }
  }

  // Max monthly running cost (30% of disposable income)
  const maxMonthlyRunning = Math.round(monthlyDisposable * 0.3);

  return {
    maxPurchasePrice: Math.max(2000, maxPurchasePrice), // Minimum £2000
    recommendedPurchasePrice: Math.round(maxPurchasePrice * 0.85), // Conservative recommendation
    maxMonthlyRunning,
    recommendedMonthlyRunning: Math.round(maxMonthlyRunning * 0.8),
    monthsToReady,
    emergencyFundStatus,
    budgetTier,
    monthlyDisposable,
    monthlyExpenses,
    emergencyFundTarget,
  };
}

/**
 * Generate a detailed month-by-month budget plan
 */
export function generateBudgetPlan(
  params: GenerateBudgetPlanParams,
  targetCar: CarResearch,
  userFinances: CalculateBudgetParams
): BudgetPlan {
  const {
    currentSavings,
    monthlySavingsCapacity,
    targetCarPrice,
    estimatedFirstYearCosts,
    emergencyFundTarget,
  } = params;

  const emergencyFundShortfall = Math.max(0, emergencyFundTarget - currentSavings);
  const needsEmergencyFund = emergencyFundShortfall > 0;

  const phases: BudgetPhase[] = [];
  const timeline: BudgetTimeline[] = [];

  let currentMonth = 0;
  let cumulativeSavings = currentSavings;

  // Phase 1: Build Emergency Fund (if needed)
  if (needsEmergencyFund) {
    const monthlyToEmergency = monthlySavingsCapacity * 0.5;
    const monthlyToCar = monthlySavingsCapacity * 0.5;
    const monthsForEmergencyFund = Math.ceil(emergencyFundShortfall / monthlyToEmergency);

    phases.push({
      name: 'Build Emergency Fund',
      months: monthsForEmergencyFund,
      monthlyAllocation: monthlyToEmergency,
      target: emergencyFundTarget,
      description: 'Build 3-month safety net while starting car fund',
    });

    // Add timeline entries for Phase 1
    for (let i = 1; i <= monthsForEmergencyFund; i++) {
      currentMonth++;
      cumulativeSavings += monthlySavingsCapacity;

      timeline.push({
        month: currentMonth,
        date: addMonths(new Date(), currentMonth),
        action: `Save £${monthlyToEmergency} to emergency fund, £${monthlyToCar} to car fund`,
        savings: monthlySavingsCapacity,
        cumulative: Math.round(cumulativeSavings),
        milestone: i === monthsForEmergencyFund ? 'Emergency fund complete!' : undefined,
      });
    }
  }

  // Phase 2: Build Car Purchase Fund
  const carFundTarget = targetCarPrice + 1000; // Target price + £1000 repair reserve
  const currentCarSavings = needsEmergencyFund
    ? (phases[0]?.months || 0) * monthlySavingsCapacity * 0.5
    : currentSavings - emergencyFundTarget;

  const carFundShortfall = Math.max(0, carFundTarget - currentCarSavings);
  const monthsForCarFund = Math.ceil(carFundShortfall / monthlySavingsCapacity);

  if (monthsForCarFund > 0) {
    phases.push({
      name: 'Build Car Purchase Fund',
      months: monthsForCarFund,
      monthlyAllocation: monthlySavingsCapacity,
      target: carFundTarget,
      description: 'Save for car purchase plus £1,000 first-year repair reserve',
    });

    // Add timeline entries for Phase 2
    for (let i = 1; i <= monthsForCarFund; i++) {
      currentMonth++;
      cumulativeSavings += monthlySavingsCapacity;

      timeline.push({
        month: currentMonth,
        date: addMonths(new Date(), currentMonth),
        action: `Save £${monthlySavingsCapacity} to car fund`,
        savings: monthlySavingsCapacity,
        cumulative: Math.round(cumulativeSavings),
        milestone: i === monthsForCarFund ? 'Ready to buy!' : undefined,
      });
    }
  }

  // Post-purchase budget breakdown
  const postPurchase: PostPurchaseItem[] = [
    { item: 'Take-home pay', monthly: userFinances.monthlyIncome },
    { item: 'Rent/mortgage', monthly: -userFinances.rent },
    { item: 'Bills', monthly: -userFinances.bills },
    { item: 'Living expenses', monthly: -userFinances.livingExpenses },
    { item: 'Insurance', monthly: -Math.round(targetCar.runningCosts.insurance.mid / 12) },
    { item: 'Fuel', monthly: -targetCar.runningCosts.fuel.monthly },
    { item: 'Tax', monthly: -Math.round(targetCar.runningCosts.tax.annual / 12) },
    { item: 'Maintenance', monthly: -Math.round(targetCar.runningCosts.maintenance.annual / 12) },
    { item: 'Tyres', monthly: -Math.round(targetCar.runningCosts.tyres.annual / 12) },
    { item: 'Savings', monthly: -userFinances.savingsGoal },
    { item: 'Investments', monthly: -userFinances.investmentGoal },
  ];

  const totalPostPurchaseExpenses = postPurchase
    .filter(item => item.monthly < 0)
    .reduce((sum, item) => sum + Math.abs(item.monthly), 0);

  const remainingBuffer = userFinances.monthlyIncome - totalPostPurchaseExpenses;

  postPurchase.push({ item: 'Remaining buffer', monthly: remainingBuffer });

  // Summary
  const summary = {
    purchaseDate: addMonths(new Date(), currentMonth),
    totalSavingsRequired: carFundTarget,
    monthlyRunningCost: targetCar.runningCosts.totalMonthly,
    remainingBuffer,
  };

  return {
    id: `plan-${Date.now()}`,
    createdAt: new Date(),
    targetCar,
    phases,
    timeline,
    postPurchase,
    summary,
  };
}

/**
 * Calculate what-if scenarios
 */
export interface WhatIfScenario {
  scenario: string;
  monthsToReady: number;
  maxBudget: number;
  tradeoff: string;
}

export function calculateWhatIfScenarios(
  currentBudget: Budget,
  params: CalculateBudgetParams
): WhatIfScenario[] {
  const scenarios: WhatIfScenario[] = [];

  // Scenario 1: More aggressive saving
  const aggressiveSaving = params.monthlyIncome - params.rent - params.bills - params.livingExpenses;
  const aggressiveMonths = Math.ceil(
    (currentBudget.emergencyFundTarget + 4000 - params.currentSavings) / aggressiveSaving
  );

  scenarios.push({
    scenario: 'Save more aggressively (reduce savings/investments to £200/mo)',
    monthsToReady: aggressiveMonths,
    maxBudget: Math.round(params.currentSavings + (aggressiveSaving * aggressiveMonths) - currentBudget.emergencyFundTarget),
    tradeoff: 'Less wealth building, but faster to car purchase',
  });

  // Scenario 2: Cheaper car
  const cheaperCarMonths = Math.ceil(
    (currentBudget.emergencyFundTarget + 2500 - params.currentSavings) / currentBudget.monthlyDisposable
  );

  scenarios.push({
    scenario: 'Buy a cheaper car (£2,500-3,000)',
    monthsToReady: cheaperCarMonths,
    maxBudget: 3000,
    tradeoff: 'Fewer options, potentially higher maintenance costs',
  });

  // Scenario 3: Finance
  scenarios.push({
    scenario: 'Use car finance (PCP/HP)',
    monthsToReady: currentBudget.emergencyFundStatus === 'complete' ? 0 : 3,
    maxBudget: Math.round(currentBudget.maxMonthlyRunning * 48), // 48-month term
    tradeoff: 'Pay interest, no ownership until paid off, but can get car sooner',
  });

  return scenarios;
}
