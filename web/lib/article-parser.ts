import { ParsedArticle } from "./types";

/**
 * Detects the format of the input text file
 */
function detectFileFormat(text: string): 'embase' | 'pubmed' | 'webofscience' | 'unknown' {
  // Check for Embase format (begins with <1>, <2>, etc.)
  if (text.match(/<\d+>\s*\n/)) {
    return 'embase';
  }
  
  // Check for Web of Science format (contains PT J and ER markers)
  if (text.includes("PT J") && text.includes("ER")) {
    return 'webofscience';
  }
  
  // Check for PubMed format (begins with numbers followed by periods)
  if (text.match(/^\d+\.\s*\n/m)) {
    return 'pubmed';
  }
  
  return 'unknown';
}

/**
 * Parses articles from a text file in Embase format
 */
function parseEmbaseArticles(text: string): ParsedArticle[] {
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
 * Parses articles from a text file in PubMed format
 */
function parsePubmedArticles(text: string): ParsedArticle[] {
  // Split the text into articles (each starting with a number followed by a period)
  const articleMatches = text.split(/\n\s*\d+\.\s*\n/).filter(text => text.trim());
  
  if (!articleMatches || articleMatches.length === 0) {
    // Try to capture the first article if it doesn't follow the exact pattern
    const firstMatch = text.match(/^\s*\d+\.\s*\n([\s\S]+?)(?=\n\s*\d+\.\s*\n|$)/);
    if (firstMatch && firstMatch[1]) {
      const articles = [firstMatch[1]];
      
      // Find the rest of the articles
      const restOfText = text.substring(firstMatch[0].length);
      const restMatches = restOfText.split(/\n\s*\d+\.\s*\n/).filter(text => text.trim());
      
      return [...articles, ...restMatches].map(parseOnePubmedArticle);
    }
    return [];
  }
  
  return articleMatches.map(parseOnePubmedArticle);
}

/**
 * Helper function to parse a single PubMed article
 */
function parseOnePubmedArticle(articleText: string, index: number): ParsedArticle {
  // Parse title
  let title = "";
  const titleMatch = articleText.match(/Title\s*\n([\s\S]+?)(?=\n[A-Za-z]+\s*\n|$)/i);
  if (titleMatch && titleMatch[1]) {
    // Join multiple lines of the title
    title = titleMatch[1].split('\n').map(line => line.trim()).join(' ').trim();
  }
  
  // Parse abstract
  let abstract = "";
  const abstractMatch = articleText.match(/Abstract\s*\n([\s\S]+?)(?=\n[A-Za-z]+\s*\n|$)/i);
  if (abstractMatch && abstractMatch[1]) {
    // Join multiple lines of the abstract
    abstract = abstractMatch[1].split('\n').map(line => line.trim()).join(' ').trim();
  }
  
  return {
    id: index + 1,
    title,
    abstract,
    fullText: articleText.trim()
  };
}

/**
 * Parses articles from a text file in Web of Science format
 */
function parseWebOfScienceArticles(text: string): ParsedArticle[] {
  // Split the text into articles (each ending with "ER")
  const articleMatches = text.split(/\nER\s*\n/).filter(text => text.trim());
  
  if (!articleMatches) {
    return [];
  }
  
  return articleMatches.map((articleText, index) => {
    // Add ER back to each article for consistency
    articleText = articleText.trim() + "\nER";
    
    // Parse title
    let title = "";
    const titleLines: string[] = [];
    let inTitle = false;
    
    // Process the text line by line to extract multi-line titles
    const lines = articleText.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith("TI ")) {
        // Start of title
        inTitle = true;
        titleLines.push(line.substring(3).trim());
      } else if (inTitle && line.match(/^[A-Z]{2} /)) {
        // New field code (like AB, SO, etc.) - end of title
        inTitle = false;
      } else if (inTitle) {
        // Continuation of title
        titleLines.push(line);
      }
    }
    
    title = titleLines.join(' ').trim();
    
    // Parse abstract - similar approach
    let abstract = "";
    const abstractLines: string[] = [];
    let inAbstract = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith("AB ")) {
        // Start of abstract
        inAbstract = true;
        abstractLines.push(line.substring(3).trim());
      } else if (inAbstract && line.match(/^[A-Z]{2} /)) {
        // New field code - end of abstract
        inAbstract = false;
      } else if (inAbstract) {
        // Continuation of abstract
        abstractLines.push(line);
      }
    }
    
    abstract = abstractLines.join(' ').trim();
    
    return {
      id: index + 1,
      title,
      abstract,
      fullText: articleText
    };
  });
}

/**
 * Parses articles from a text file, automatically detecting the format
 */
export function parseArticles(text: string): ParsedArticle[] {
  const format = detectFileFormat(text);
  
  switch (format) {
    case 'embase':
      return parseEmbaseArticles(text);
    case 'pubmed':
      return parsePubmedArticles(text);
    case 'webofscience':
      return parseWebOfScienceArticles(text);
    default:
      // Try all parsers and use the one that returns the most articles
      const embaseResults = parseEmbaseArticles(text);
      const pubmedResults = parsePubmedArticles(text);
      const webOfScienceResults = parseWebOfScienceArticles(text);
      
      // Return the results from the parser that found the most articles
      if (embaseResults.length >= pubmedResults.length && embaseResults.length >= webOfScienceResults.length) {
        return embaseResults;
      } else if (pubmedResults.length >= embaseResults.length && pubmedResults.length >= webOfScienceResults.length) {
        return pubmedResults;
      } else {
        return webOfScienceResults;
      }
  }
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