import { ParsedArticle } from "./types";

/**
 * Parses articles from a text file with the format:
 * <1>
 * Accession Number
 *   XXXX
 * Title
 *   XXXX
 * ...
 * Abstract
 *   XXXX
 */
export function parseArticles(text: string): ParsedArticle[] {
  // Split the text by article markers <1>, <2>, etc.
  const articleMatches = text.match(/<\d+>[\s\S]+?(?=<\d+>|$)/g);
  
  if (!articleMatches) {
    return [];
  }
  
  return articleMatches.map((articleText, index) => {
    // Parse article ID
    const idMatch = articleText.match(/<(\d+)>/);
    const id = idMatch ? parseInt(idMatch[1]) : index + 1;
    
    // Parse title
    let title = "";
    const titleMatch = articleText.match(/Title\s+([\s\S]+?)(?=Source|Author|Institution|Publisher|$)/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
    
    // Parse abstract
    let abstract = "";
    const abstractMatch = articleText.match(/Abstract\s+([\s\S]+?)(?=Link to|Copyright|$)/i);
    if (abstractMatch && abstractMatch[1]) {
      abstract = abstractMatch[1].trim();
    }
    
    return {
      id,
      title,
      abstract,
      fullText: articleText.trim()
    };
  });
}

/**
 * Extract specific sections from an article
 */
export function extractArticleSections(article: ParsedArticle) {
  // Extract accession number
  const accessionMatch = article.fullText.match(/Accession Number\s+([\s\S]+?)(?=Title|$)/i);
  const accessionNumber = accessionMatch ? accessionMatch[1].trim() : "";
  
  // Extract source
  const sourceMatch = article.fullText.match(/Source\s+([\s\S]+?)(?=Author|$)/i);
  const source = sourceMatch ? sourceMatch[1].trim() : "";
  
  // Extract authors
  const authorMatch = article.fullText.match(/Author\s+([\s\S]+?)(?=Institution|$)/i);
  const authors = authorMatch ? authorMatch[1].trim() : "";
  
  return {
    accessionNumber,
    source,
    authors
  };
} 