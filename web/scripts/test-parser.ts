import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseArticles } from '../lib/article-parser';
import { ParsedArticle } from '../lib/types';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read files
const embaseContent = fs.readFileSync(path.join(__dirname, '../resources/min/embase-min.txt'), 'utf8');
const webOfScienceContent = fs.readFileSync(path.join(__dirname, '../resources/min/webofsciences_1_min.txt'), 'utf8');
const pubmedContent = fs.readFileSync(path.join(__dirname, '../resources/min/pubmed-min.txt'), 'utf8');

// Helper function for display
function displayArticleInfo(article: ParsedArticle): void {
  const titlePreview = article.title.length > 100 ? `${article.title.substring(0, 100)}...` : article.title;
  const abstractPreview = article.abstract.length > 100 ? `${article.abstract.substring(0, 100)}...` : article.abstract;
  
  console.log(`Title: ${titlePreview}`);
  console.log(`Abstract: ${abstractPreview}`);
}

// Test the parser on different formats
console.log('Testing Embase format:');
const embaseResults = parseArticles(embaseContent);
console.log(`Found ${embaseResults.length} articles`);
if (embaseResults.length > 0) {
  console.log('First article:');
  displayArticleInfo(embaseResults[0]);
}

console.log('\nTesting Web of Science format:');
const webOfScienceResults = parseArticles(webOfScienceContent);
console.log(`Found ${webOfScienceResults.length} articles`);
if (webOfScienceResults.length > 0) {
  console.log('First article:');
  displayArticleInfo(webOfScienceResults[0]);
}

console.log('\nTesting PubMed format:');
const pubmedResults = parseArticles(pubmedContent);
console.log(`Found ${pubmedResults.length} articles`);
if (pubmedResults.length > 0) {
  console.log('First article:');
  displayArticleInfo(pubmedResults[0]);
}

// Try to detect format automatically
console.log('\nAutomatic format detection:');
console.log(`Embase format detected: ${embaseResults.length > 0 ? 'Yes' : 'No'}`);
console.log(`Web of Science format detected: ${webOfScienceResults.length > 0 ? 'Yes' : 'No'}`);
console.log(`PubMed format detected: ${pubmedResults.length > 0 ? 'Yes' : 'No'}`); 