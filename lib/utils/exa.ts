/**
 * Exa API Client
 * Wrapper for semantic web search functionality
 */

import Exa from 'exa-js';
import { ExaResult, ExaSearchResponse } from '@/types';

if (!process.env.EXA_API_KEY) {
  console.warn('Warning: EXA_API_KEY is not set');
}

// `new Exa('')` throws on an empty key, which breaks `next build` when env
// vars aren't present. Fall back to a placeholder so the module can load; any
// actual search call will fail clearly at runtime if the key is missing.
const exa = new Exa(process.env.EXA_API_KEY || 'placeholder-exa-key');

export interface SearchOptions {
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  type?: 'neural' | 'keyword' | 'auto';
}

/**
 * Search for car prices on UK automotive sites
 */
export async function searchCarPrices(
  make: string,
  model: string,
  yearFrom?: number,
  yearTo?: number
): Promise<ExaResult[]> {
  const yearRange = yearFrom && yearTo ? `${yearFrom}-${yearTo}` : '';
  const query = `${make} ${model} ${yearRange} for sale price UK`.trim();

  try {
    const results = await exa.searchAndContents(query, {
      numResults: 15,
      type: 'auto',
      includeDomains: [
        'autotrader.co.uk',
        'pistonheads.com',
        'ebay.co.uk',
        'cargurus.co.uk',
        'motors.co.uk'
      ],
      text: true,
      highlights: {
        numSentences: 3,
        query: 'price £',
      },
    });

    return results.results.map(r => ({
      title: r.title,
      url: r.url,
      publishedDate: r.publishedDate,
      author: r.author,
      text: r.text,
      highlights: r.highlights,
    }));
  } catch (error) {
    console.error('Exa search error (prices):', error);
    return [];
  }
}

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Search for owner experiences and reliability information
 */
export async function searchOwnerExperiences(
  make: string,
  model: string,
  generation?: string
): Promise<ExaResult[]> {
  const carIdentifier = `${make} ${model}${generation ? ` ${generation}` : ''}`;

  const queries = [
    `${carIdentifier} common problems owners forum`,
    `${carIdentifier} reliability long term ownership`,
  ];

  try {
    const allResults = [];

    // Execute sequentially with delays to avoid rate limiting
    for (const query of queries) {
      const result = await exa.searchAndContents(query, {
        numResults: 8,
        type: 'auto',
        text: {
          maxCharacters: 2000,
        },
        highlights: {
          numSentences: 5,
          query: 'problems issues cost reliability maintenance',
        },
      });
      allResults.push(result);
      await delay(250); // 250ms delay between requests
    }

    // Flatten and deduplicate by URL
    const uniqueResults = new Map<string, ExaResult>();
    allResults.forEach(result => {
      result.results.forEach(r => {
        if (!uniqueResults.has(r.url)) {
          uniqueResults.set(r.url, {
            title: r.title,
            url: r.url,
            publishedDate: r.publishedDate,
            author: r.author,
            text: r.text,
            highlights: r.highlights,
          });
        }
      });
    });

    return Array.from(uniqueResults.values());
  } catch (error) {
    console.error('Exa search error (experiences):', error);
    return [];
  }
}

/**
 * Search for insurance group information
 */
export async function searchInsuranceGroup(
  make: string,
  model: string
): Promise<number | null> {
  const query = `${make} ${model} insurance group UK`;

  try {
    const results = await exa.searchAndContents(query, {
      numResults: 5,
      type: 'auto',
      text: true,
    });

    // Parse results to extract insurance group number
    // This is a simple regex-based extraction
    for (const result of results.results) {
      const text = `${result.title} ${result.text || ''}`;
      const match = text.match(/(?:group|Group)\s*(\d{1,2})/);
      if (match) {
        const group = parseInt(match[1], 10);
        if (group >= 1 && group <= 50) {
          return group;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Exa search error (insurance group):', error);
    return null;
  }
}

/**
 * Search for vehicle tax band information
 */
export async function searchVehicleTax(
  make: string,
  model: string,
  year?: number
): Promise<number | null> {
  const query = `${make} ${model}${year ? ` ${year}` : ''} road tax VED UK`;

  try {
    const results = await exa.searchAndContents(query, {
      numResults: 5,
      type: 'auto',
      text: true,
    });

    // Parse results to extract tax amount
    for (const result of results.results) {
      const text = `${result.title} ${result.text || ''}`;
      // Look for patterns like "£345" or "£20 per year"
      const match = text.match(/£(\d{2,3})(?:\s*(?:per\s*year|annually|\/year|\/yr))?/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return null;
  } catch (error) {
    console.error('Exa search error (tax):', error);
    return null;
  }
}

/**
 * General purpose search
 */
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<ExaResult[]> {
  const {
    numResults = 10,
    includeDomains,
    excludeDomains,
    startPublishedDate,
    type = 'auto',
  } = options;

  try {
    const results = await exa.searchAndContents(query, {
      numResults,
      type,
      includeDomains,
      excludeDomains,
      startPublishedDate,
      text: true,
    });

    return results.results.map(r => ({
      title: r.title,
      url: r.url,
      publishedDate: r.publishedDate,
      author: r.author,
      text: r.text,
    }));
  } catch (error) {
    console.error('Exa search error:', error);
    return [];
  }
}

export default exa;
