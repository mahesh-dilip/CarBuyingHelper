/**
 * AI SDK Compatible Tools
 * Tools formatted for Vercel AI SDK
 */

import { z } from 'zod';
import { tool } from 'ai';
import {
  searchCarPrices,
  searchOwnerExperiences,
  searchInsuranceGroup,
} from './exa';
import { lookupVehicle, estimateTaxFromVehicleData } from './dvla';
import { estimateInsurance } from '../models/insurance';
import { calculateBudget, generateBudgetPlan } from '../models/budget';

export const searchCarPricesTool = tool({
  description: 'Search current market prices for a specific car make/model on UK automotive sites',
  inputSchema: z.object({
    make: z.string().describe('Car manufacturer (e.g., "BMW", "Mazda")'),
    model: z.string().describe('Car model (e.g., "E46 330i", "MX-5")'),
    yearFrom: z.number().optional().describe('Start of year range (e.g., 2001)'),
    yearTo: z.number().optional().describe('End of year range (e.g., 2005)'),
  }),
  execute: async ({ make, model, yearFrom, yearTo }) => {
    console.log('[searchCarPrices] Called with:', { make, model, yearFrom, yearTo });
    const results = await searchCarPrices(make, model, yearFrom, yearTo);

    // Extract prices
    const prices: number[] = [];
    const processedResults = results.map(r => {
      const priceMatch = r.text?.match(/£([\d,]+)/);
      const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : undefined;

      if (price && price > 500 && price < 100000) {
        prices.push(price);
      }

      return {
        url: r.url,
        price,
        description: r.title || r.text?.substring(0, 150) || '',
      };
    });

    prices.sort((a, b) => a - b);
    const priceRange = prices.length >= 3 ? {
      low: prices[0],
      median: prices[Math.floor(prices.length / 2)],
      high: prices[prices.length - 1],
    } : undefined;

    return {
      results: processedResults.filter(r => r.price),
      priceRange,
    };
  },
});

export const searchOwnerExperiencesTool = tool({
  description: 'Search forums and owner communities for real ownership experiences, common problems, and maintenance costs',
  inputSchema: z.object({
    make: z.string().describe('Car manufacturer'),
    model: z.string().describe('Car model'),
    generation: z.string().optional().describe('Generation code (e.g., "E46", "NA")'),
  }),
  execute: async ({ make, model, generation }) => {
    console.log('[searchOwnerExperiences] Called with:', { make, model, generation });
    const results = await searchOwnerExperiences(make, model, generation);

    const insights = results.map(r => ({
      source: r.title || 'Forum Post',
      snippet: r.highlights?.join(' ... ') || r.text?.substring(0, 300) || '',
      url: r.url,
    }));

    return {
      insights,
      summary: insights.length > 0
        ? `Found ${insights.length} owner experiences and reliability reports`
        : 'No detailed owner experiences found',
    };
  },
});

export const estimateInsuranceTool = tool({
  description: 'Estimate annual car insurance premium based on driver age, insurance group, location, NCB, and mileage',
  inputSchema: z.object({
    driverAge: z.number().min(17).max(100).describe('Driver age'),
    insuranceGroup: z.number().min(1).max(50).describe('Insurance group (1-50)'),
    postcode: z.string().describe('UK postcode area (e.g., "SW1", "M1")'),
    ncbYears: z.number().min(0).max(20).describe('No claims bonus years'),
    annualMileage: z.number().min(1000).max(50000).describe('Annual mileage'),
  }),
  execute: async (params) => {
    console.log('[estimateInsurance] Called with:', params);
    return estimateInsurance(params);
  },
});

export const calculateBudgetTool = tool({
  description: 'Calculate car affordability based on user income, expenses, and savings',
  inputSchema: z.object({
    monthlyIncome: z.number().describe('Monthly take-home income'),
    rent: z.number().describe('Monthly rent/mortgage'),
    bills: z.number().describe('Monthly bills (utilities, subscriptions)'),
    livingExpenses: z.number().describe('Monthly living expenses (food, transport, entertainment)'),
    savingsGoal: z.number().describe('Monthly savings goal'),
    investmentGoal: z.number().describe('Monthly investment contributions'),
    currentSavings: z.number().describe('Current savings balance'),
  }),
  execute: async (params) => {
    console.log('[calculateBudget] Called with:', params);
    return calculateBudget(params);
  },
});

export const aiTools = {
  searchCarPrices: searchCarPricesTool,
  searchOwnerExperiences: searchOwnerExperiencesTool,
  estimateInsurance: estimateInsuranceTool,
  calculateBudget: calculateBudgetTool,
};
