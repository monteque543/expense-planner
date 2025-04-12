import type { Transaction } from "@shared/schema";

/**
 * Extracts unique transaction titles from a list of transactions
 */
export function getUniqueTitles(transactions: Transaction[]): string[] {
  // Create a Set to automatically eliminate duplicates
  const titlesSet = new Set<string>();
  
  // Add all non-empty titles to the set
  transactions.forEach(transaction => {
    if (transaction.title && transaction.title.trim()) {
      titlesSet.add(transaction.title.trim());
    }
  });
  
  // Convert back to array and sort alphabetically
  return Array.from(titlesSet).sort();
}

/**
 * Filters titles based on a search query
 */
export function filterTitlesByQuery(titles: string[], query: string): string[] {
  if (!query) return titles;
  
  const lowerQuery = query.toLowerCase();
  
  return titles.filter(title => 
    title.toLowerCase().includes(lowerQuery)
  );
}