/**
 * Car Research API Route
 * Trigger deep research for a specific car
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchCarPrices, searchOwnerExperiences } from '@/lib/utils/exa';
import { estimateInsurance } from '@/lib/models/insurance';
import { getSession } from '@/lib/db/supabase';
import { CarResearch, CarSuggestion } from '@/types';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    const { carId } = await params;
    const { sessionId, insuranceProfile } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Get session to find the car
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Find the car suggestion
    const car = session.suggestedCars.find(c => c.id === carId);
    if (!car) {
      return NextResponse.json(
        { error: 'Car not found in suggestions' },
        { status: 404 }
      );
    }

    // Perform research in parallel
    const [priceResults, ownershipResults] = await Promise.all([
      searchCarPrices(car.make, car.model, car.yearRange.from, car.yearRange.to),
      searchOwnerExperiences(car.make, car.model, car.generation),
    ]);

    // Extract and analyze price data
    const prices: number[] = [];
    const priceSources = priceResults
      .map(r => {
        const priceMatch = r.text?.match(/£([\d,]+)/);
        const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : null;

        if (price && price > 500 && price < 100000) {
          prices.push(price);
          return {
            url: r.url,
            price,
            description: r.title || '',
          };
        }
        return null;
      })
      .filter((s): s is { url: string; price: number; description: string } => s !== null);

    prices.sort((a, b) => a - b);
    const priceAnalysis = {
      currentRange: {
        low: prices.length > 0 ? prices[0] : car.estimatedPriceRange.low,
        median: prices.length > 0 ? prices[Math.floor(prices.length / 2)] :
                (car.estimatedPriceRange.low + car.estimatedPriceRange.high) / 2,
        high: prices.length > 0 ? prices[prices.length - 1] : car.estimatedPriceRange.high,
      },
      sources: priceSources.slice(0, 10), // Top 10 sources
      trend: 'stable' as const, // Could enhance this with historical data
    };

    // Analyze ownership insights
    const ownershipInsights = {
      commonProblems: [
        // This would ideally use LLM to extract from ownershipResults
        // For now, placeholder
      ],
      maintenanceItems: [],
      buyingChecklist: [],
      overallSentiment: 'positive' as const,
      sentimentSummary: 'Analysis pending - implement LLM synthesis',
      sources: ownershipResults.slice(0, 10).map(r => ({
        url: r.url,
        snippet: r.highlights?.join(' ... ') || r.text?.substring(0, 200) || '',
      })),
    };

    // Estimate insurance
    const insurance = estimateInsurance({
      driverAge: insuranceProfile?.age || 28,
      insuranceGroup: car.insuranceGroup,
      postcode: insuranceProfile?.postcode || 'M1',
      ncbYears: insuranceProfile?.ncbYears || 0,
      annualMileage: insuranceProfile?.annualMileage || 8000,
    });

    // Calculate running costs
    const fuelPricePerLitre = 1.37; // Average UK fuel price
    const estimatedMPG = 28; // Would need to lookup per car
    const annualMileage = insuranceProfile?.annualMileage || 8000;

    // MPG to litres per 100km conversion
    const litresPer100Miles = (100 / estimatedMPG) * 4.546; // 4.546 litres per gallon
    const annualLitres = (annualMileage / 100) * litresPer100Miles;
    const annualFuelCost = annualLitres * fuelPricePerLitre;

    const runningCosts = {
      insurance,
      fuel: {
        monthly: Math.round(annualFuelCost / 12),
        annual: Math.round(annualFuelCost),
        assumptions: `${annualMileage} miles/year at ${estimatedMPG}mpg, £${fuelPricePerLitre}/L`,
      },
      tax: {
        annual: 200, // Placeholder - would lookup based on car
      },
      maintenance: {
        annual: 800, // Placeholder - would analyze from owner experiences
        notes: 'Estimated based on similar cars',
      },
      tyres: {
        annual: 200, // Placeholder
      },
      totalMonthly: 0,
      totalAnnual: 0,
    };

    runningCosts.totalAnnual =
      insurance.mid +
      runningCosts.fuel.annual +
      runningCosts.tax.annual +
      runningCosts.maintenance.annual +
      runningCosts.tyres.annual;

    runningCosts.totalMonthly = Math.round(runningCosts.totalAnnual / 12);

    const research: CarResearch = {
      id: `research-${car.id}-${Date.now()}`,
      car,
      researchedAt: new Date(),
      priceAnalysis,
      ownershipInsights,
      runningCosts,
      verdict: {
        summary: `Research complete for ${car.make} ${car.model}`,
        confidence: 'medium',
        recommendation: 'See detailed analysis above',
      },
    };

    return NextResponse.json({
      success: true,
      data: research,
    });
  } catch (error) {
    console.error('Research API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to research car',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
