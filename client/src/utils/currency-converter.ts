/**
 * Currency Converter Utility
 * 
 * This module handles currency conversion between PLN and other currencies
 * using the latest exchange rates from the NBP API (Polish National Bank)
 */

// Define supported currencies
export type SupportedCurrency = 'PLN' | 'USD' | 'EUR';

// Currency conversion rates cache
interface ConversionRates {
  USD: number;
  EUR: number;
  PLN: number; // Adding PLN for consistency
  lastUpdated: number;
}

// Initialize with some reasonable default conversion rates (will be updated)
let ratesCache: ConversionRates = {
  USD: 3.95, // Default USD to PLN rate (approximately)
  EUR: 4.30, // Default EUR to PLN rate (approximately)
  PLN: 1.0,  // PLN to PLN is always 1
  lastUpdated: 0
};

// Cache validity duration (4 hours in milliseconds)
const CACHE_DURATION = 4 * 60 * 60 * 1000;

/**
 * Fetch the latest currency exchange rates from NBP API
 */
export async function fetchLatestRates(): Promise<void> {
  try {
    // Check if cache is still valid
    const now = Date.now();
    if (now - ratesCache.lastUpdated < CACHE_DURATION) {
      console.log('Using cached exchange rates');
      return;
    }

    // Fetch USD rate
    const usdResponse = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/usd/');
    const usdData = await usdResponse.json();
    
    // Fetch EUR rate
    const eurResponse = await fetch('https://api.nbp.pl/api/exchangerates/rates/a/eur/');
    const eurData = await eurResponse.json();
    
    // Update cache
    ratesCache = {
      USD: usdData.rates[0].mid,
      EUR: eurData.rates[0].mid,
      PLN: 1.0, // PLN to PLN is always 1
      lastUpdated: now
    };
    
    console.log('Updated exchange rates:', ratesCache);
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Keep using the cached/default rates on error
  }
}

/**
 * Convert an amount from a source currency to PLN
 */
export function convertToPLN(amount: number, sourceCurrency: SupportedCurrency): number {
  if (sourceCurrency === 'PLN') {
    return amount;
  }
  
  const rate = ratesCache[sourceCurrency];
  return amount * rate;
}

/**
 * Convert an amount from PLN to a target currency
 */
export function convertFromPLN(amount: number, targetCurrency: SupportedCurrency): number {
  if (targetCurrency === 'PLN') {
    return amount;
  }
  
  const rate = ratesCache[targetCurrency];
  return amount / rate;
}

/**
 * Get the current exchange rate for a currency pair
 */
export function getExchangeRate(from: SupportedCurrency, to: SupportedCurrency): number {
  if (from === to) {
    return 1;
  }
  
  if (to === 'PLN') {
    return ratesCache[from];
  }
  
  if (from === 'PLN') {
    return 1 / ratesCache[to];
  }
  
  // Convert via PLN
  return ratesCache[from] / ratesCache[to];
}

/**
 * Format a currency amount with the appropriate symbol
 */
export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  };
  
  const formatted = amount.toLocaleString('pl-PL', options);
  
  switch (currency) {
    case 'USD':
      return `$${formatted}`;
    case 'EUR':
      return `€${formatted}`;
    case 'PLN':
    default:
      return `${formatted} PLN`;
  }
}

// Initialize by fetching rates on module load
fetchLatestRates();