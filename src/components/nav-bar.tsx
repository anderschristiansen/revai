"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, FileText, Settings, Folders } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function NavBar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };
  
  return (
    <div className="border-b">
      <div className="container mx-auto px-4 flex h-14 items-center">
        <Link href="/" className="font-bold text-lg flex items-center mr-6">
          <span>RevAI</span>
        </Link>
        
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary flex items-center ${
              isActive("/") && !isActive("/sessions")
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Home className="h-4 w-4 mr-1" />
            <span>Hjem</span>
          </Link>
          
          <Link
            href="/sessions"
            className={`text-sm font-medium transition-colors hover:text-primary flex items-center ${
              isActive("/sessions") 
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Folders className="h-4 w-4 mr-1" />
            <span>Sessioner</span>
          </Link>
          
          <Link
            href="/about"
            className={`text-sm font-medium transition-colors hover:text-primary flex items-center ${
              isActive("/about") 
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <FileText className="h-4 w-4 mr-1" />
            <span>Om</span>
          </Link>
        </nav>
        
        <div className="ml-auto flex items-center space-x-2">
          <ThemeToggle size="sm" showLabel={false} />
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1" />
              <span>Indstillinger</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 