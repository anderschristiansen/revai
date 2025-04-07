/**
 * Coffee-themed loading components
 */

// For direct custom imports
import { CoffeeLoader } from "./coffee-loader";
import { CoffeeProgress } from "./coffee-progress";
import { LottieCoffeeLoader } from "./lottie-coffee-loader";

// Export individual components
export { CoffeeLoader, CoffeeProgress, LottieCoffeeLoader };

// Create a named bundle object
const CoffeeLoaders = {
  CoffeeLoader,
  CoffeeProgress,
  LottieCoffeeLoader
};

// Default export as a bundle
export default CoffeeLoaders; 