import React from "react";

interface CoffeeBeanLoaderProps {
  message?: string;
}

export function CoffeeBeanLoader({
  message = "Our AI is carefully working through your articles. Perfect time for a coffee break!"
}: CoffeeBeanLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6 text-center">
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Coffee bean spinner */}
        <div className="absolute inset-0 animate-spin">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-amber-800 w-7 h-10 rounded-full"
              style={{
                top: '50%',
                left: '50%',
                margin: '-20px 0 0 -14px',
                transform: `rotate(${i * 72}deg) translate(0, -25px)`,
                clipPath: 'ellipse(50% 50% at 50% 50%)',
                borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              }}
            >
              {/* Bean crease */}
              <div
                className="absolute top-1/2 left-1/2 w-[1px] h-9 bg-amber-950"
                style={{
                  transform: 'translate(-50%, -50%)',
                }}
              ></div>
            </div>
          ))}
        </div>
        
        {/* Center circle */}
        <div className="w-10 h-10 bg-background rounded-full z-10 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-amber-800"></div>
        </div>
      </div>
      
      <h3 className="text-xl font-medium">{message}</h3>
      
      <p className="text-muted-foreground max-w-md">
        Vores AI arbejder sig omhyggeligt gennem dine artikler. Perfekt tid til en kaffepause!
      </p>
    </div>
  );
} 