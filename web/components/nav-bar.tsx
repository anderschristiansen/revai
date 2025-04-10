"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, FileText, Folders, LogIn, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

const getUserInitials = (email: string | undefined) => {
  if (!email) return '';
  return email
    .split('@')[0]
    .split('.')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const NavLinks = () => (
    <>
      <Link
        href="/"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary flex items-center",
          pathname === "/" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Home className="h-4 w-4 mr-1" />
        <span>Home</span>
      </Link>
      
      {user && (
        <Link
          href="/sessions"
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary flex items-center",
            pathname.startsWith("/sessions") ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Folders className="h-4 w-4 mr-1" />
          <span>Sessions</span>
        </Link>
      )}
      
      <Link
        href="/about"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary flex items-center",
          pathname === "/about" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <FileText className="h-4 w-4 mr-1" />
        <span>About</span>
      </Link>
    </>
  );
  
  return (
    <div className="border-b">
      <div className="container mx-auto px-4 flex h-14 items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="font-bold text-lg flex items-center mr-6">
            <span>RevAI</span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <NavLinks />
          </nav>
        </div>
        
        <div className="flex items-center space-x-2">
          <ThemeToggle showLabel={false} />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="size-8">
                    <AvatarImage src="https://github.com/shadcn.png" alt={user.email} />
                    <AvatarFallback>{getUserInitials(user.email)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4 mr-1" />
                <span>Sign in</span>
              </Button>
            </Link>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            <NavLinks />
          </nav>
        </div>
      )}
    </div>
  );
} 