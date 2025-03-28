"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type TabType = 'profile' | 'ai';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const getUserInitials = (email: string | undefined) => {
    if (!email) return '';
    return email
      .split('@')[0]
      .split('.')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Could not sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="email">Email</Label>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label>Email Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'ai':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">AI Settings</h3>
            <p className="text-sm text-muted-foreground">
              Customize your AI preferences and configurations here.
            </p>
            <div className="border rounded-md p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                AI configuration options will be added soon.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container py-8 flex justify-center">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="size-16">
                <AvatarImage src="https://github.com/shadcn.png" alt={user?.email || ''} />
                <AvatarFallback>{getUserInitials(user?.email)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                  Manage your account settings and set e-mail preferences.
                </CardDescription>
              </div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleSignOut}
              className="flex items-center text-muted-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-48 shrink-0">
              <nav className="flex flex-col rounded-md overflow-hidden">
                <Button
                  variant="link"
                  className={cn(
                    "justify-start h-10 px-6 text-base text-black",
                    activeTab === 'profile' && "bg-muted"
                  )}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile
                </Button>
                <Button
                  variant="link"
                  className={cn(
                    "justify-start h-10 px-6 text-base text-black",
                    activeTab === 'ai' && "bg-muted"
                  )}
                  onClick={() => setActiveTab('ai')}
                >
                  AI
                </Button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-2">
              <div>
                <h2 className="text-xl font-semibold mb-3">
                  {activeTab === 'profile' ? 'Profile' : 'AI Settings'}
                </h2>
                <p className="text-sm text-muted-foreground mb-8">
                  {activeTab === 'profile' 
                    ? 'This is how others will see you on the site.' 
                    : 'Configure your AI preferences.'}
                </p>
                {renderTabContent()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 