# Using Your Own Lottie Animation

This folder contains a placeholder Lottie animation file (`coffee-animation.json`). To use your own Lottie animation:

1. Replace the `coffee-animation.json` file with your own Lottie animation JSON file.
   - Make sure to keep the same filename, or update all import references in the code.
   - You can export Lottie animations from tools like Adobe After Effects with the Bodymovin plugin, or use websites like LottieFiles.com.

2. Adjust the size and styling of the animation if needed in the `LottieCoffeeLoader` component at `src/components/ui/lottie-coffee-loader.tsx`.

## Example Lottie Coffee Animations

If you're looking for coffee-themed Lottie animations, check out these resources:

- [LottieFiles Coffee Animations](https://lottiefiles.com/search?q=coffee)
- [IconScout Coffee Animations](https://iconscout.com/lotties/coffee)

Many animations on these sites can be downloaded for free in JSON format, which is what you need for the Lottie React player.

## Current Implementation

The current implementation:

- Uses the Lottie React library to play animations
- Shows the animation with a message underneath
- Allows for different messages based on the randomly selected loader variant
- Displays the animation in a semi-transparent overlay with a blurred background 