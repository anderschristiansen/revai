'use client';

export function VersionBadge() {
  return (
    <div className="fixed bottom-4 right-4 text-xs text-muted-foreground/50">
      v{process.env.NEXT_PUBLIC_APP_VERSION || "0.4.2"}
    </div>
  );
} 