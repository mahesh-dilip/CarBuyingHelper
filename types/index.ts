// Core Types for CarMind Application

export type ConversationState =
  | 'financial_intake'
  | 'preferences_capture'
  | 'reality_check'
  | 'car_suggestions'
  | 'deep_research'
  | 'compare_view'
  | 'budget_plan'
  | 'complete';

export type DrivingStyle = 'enthusiast' | 'commuter' | 'weekend' | 'allrounder';
export type BodyType = 'coupe' | 'saloon' | 'hatch' | 'suv' | 'convertible' | 'estate' | 'any';
export type Transmission = 'manual' | 'auto' | 'any';
export type DriveType = 'rwd' | 'fwd' | 'awd' | 'any';
export type Era = 'modern' | '2000s' | 'classic' | 'any';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'ev' | 'any';
export type BudgetTier = 'conservative' | 'moderate' | 'aggressive';
export type CarCategory = 'primary' | 'alternative' | 'stretch';
export type Sentiment = 'positive' | 'mixed' | 'negative';
export type Confidence = 'high' | 'medium' | 'low';
export type Frequency = 'common' | 'occasional' | 'rare';
export type EmergencyFundStatus = 'none' | 'partial' | 'complete';
export type PriceTrend = 'rising' | 'stable' | 'falling';

export interface FinancialProfile {
  annualIncome?: number;
  monthlyTakeHome: number;
  rent: number;
  bills: number;
  livingExpenses: number;
  savingsGoal: number;
  investmentGoal: number;
  currentSavings: number;
}

export interface Preferences {
  drivingStyle: DrivingStyle;
  bodyTypes: BodyType[];
  transmission: Transmission;
  driveType: DriveType;
  era: Era;
  reliabilityPriority: 1 | 2 | 3 | 4 | 5;
  appreciationInterest?: 1 | 2 | 3 | 4 | 5;
  seatsNeeded?: number;
  bootSpaceRequired?: boolean;
  fuelType?: FuelType;
  freeTextDesires?: string;
}

export interface InsuranceProfile {
  age: number;
  postcode: string;
  ncbYears: number;
  annualMileage: number;
}

export interface Budget {
  maxPurchasePrice: number;
  recommendedPurchasePrice?: number;
  maxMonthlyRunning: number;
  recommendedMonthlyRunning?: number;
  monthsToReady: number;
  emergencyFundStatus: EmergencyFundStatus;
  budgetTier: BudgetTier;
  monthlyDisposable: number;
  monthlyExpenses: number;
  emergencyFundTarget: number;
}

export interface CarSuggestion {
  id: string;
  make: string;
  model: string;
  generation?: string;
  yearRange: {
    from: number;
    to: number;
  };
  estimatedPriceRange: {
    low: number;
    high: number;
  };
  insuranceGroup: number;
  whyItFits: string;
  concerns: string;
  category: CarCategory;
  validatedPrice?: {
    low: number;
    median: number;
    high: number;
  };
}

export interface PriceSource {
  url: string;
  price: number;
  description: string;
}

export interface PriceAnalysis {
  currentRange: {
    low: number;
    median: number;
    high: number;
  };
  sources: PriceSource[];
  trend?: PriceTrend;
}

export interface CommonProblem {
  issue: string;
  frequency: Frequency;
  estimatedCost: string;
}

export interface MaintenanceItem {
  item: string;
  interval: string;
  cost: string;
}

export interface ResearchSource {
  url: string;
  snippet: string;
}

export interface OwnershipInsights {
  commonProblems: CommonProblem[];
  maintenanceItems: MaintenanceItem[];
  buyingChecklist: string[];
  overallSentiment: Sentiment;
  sentimentSummary: string;
  sources: ResearchSource[];
}

export interface InsuranceEstimate {
  low: number;
  mid: number;
  high: number;
  confidence: Confidence;
  factors?: {
    ageImpact: string;
    groupImpact: string;
    locationImpact: string;
    ncbImpact: string;
  };
}

export interface RunningCosts {
  insurance: InsuranceEstimate;
  fuel: {
    monthly: number;
    annual: number;
    assumptions: string;
  };
  tax: {
    annual: number;
  };
  maintenance: {
    annual: number;
    notes: string;
  };
  tyres: {
    annual: number;
  };
  totalMonthly: number;
  totalAnnual: number;
}

export interface Verdict {
  summary: string;
  confidence: Confidence;
  recommendation: string;
}

export interface CarResearch {
  id: string;
  car: CarSuggestion;
  researchedAt: Date;
  priceAnalysis: PriceAnalysis;
  ownershipInsights: OwnershipInsights;
  runningCosts: RunningCosts;
  verdict: Verdict;
}

export interface BudgetPhase {
  name: string;
  months: number;
  monthlyAllocation: number;
  target: number;
  description: string;
}

export interface BudgetTimeline {
  month: number;
  date: Date;
  action: string;
  savings: number;
  cumulative: number;
  milestone?: string;
}

export interface PostPurchaseItem {
  item: string;
  monthly: number;
}

export interface BudgetPlanSummary {
  purchaseDate: Date;
  totalSavingsRequired: number;
  monthlyRunningCost: number;
  remainingBuffer: number;
}

export interface BudgetPlan {
  id: string;
  createdAt: Date;
  targetCar: CarResearch;
  phases: BudgetPhase[];
  timeline: BudgetTimeline[];
  postPurchase: PostPurchaseItem[];
  summary: BudgetPlanSummary;
}

export interface UserSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  state: ConversationState;
  finances?: FinancialProfile;
  preferences?: Preferences;
  insuranceProfile?: InsuranceProfile;
  budget?: Budget;
  suggestedCars: CarSuggestion[];
  researchedCars: CarResearch[];
  selectedCar?: CarResearch;
  budgetPlan?: BudgetPlan;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ConversationContext {
  session: UserSession;
  messages: Message[];
  currentResearchCar?: string;
}

// Tool parameter types
export interface SearchCarPricesParams {
  make: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
}

export interface SearchOwnerExperiencesParams {
  make: string;
  model: string;
  generation?: string;
}

export interface LookupVehicleDataParams {
  registrationNumber: string;
}

export interface EstimateInsuranceParams {
  driverAge: number;
  insuranceGroup: number;
  postcode: string;
  ncbYears: number;
  annualMileage: number;
}

export interface CalculateBudgetParams {
  monthlyIncome: number;
  rent: number;
  bills: number;
  livingExpenses: number;
  savingsGoal: number;
  investmentGoal: number;
  currentSavings: number;
}

export interface GenerateBudgetPlanParams {
  currentSavings: number;
  monthlySavingsCapacity: number;
  targetCarPrice: number;
  estimatedFirstYearCosts: number;
  emergencyFundTarget: number;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// DVLA API Response
export interface DVLAVehicleData {
  registrationNumber: string;
  taxStatus: string;
  taxDueDate?: string;
  motStatus: string;
  motExpiryDate?: string;
  make: string;
  monthOfFirstDvlaRegistration?: string;
  monthOfFirstRegistration?: string;
  yearOfManufacture: number;
  engineCapacity?: number;
  co2Emissions?: number;
  fuelType: string;
  colour: string;
  euroStatus?: string;
}

// Exa API Response
export interface ExaResult {
  title: string | null;
  url: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  summary?: string;
}

export interface ExaSearchResponse {
  results: ExaResult[];
  requestId: string;
}
