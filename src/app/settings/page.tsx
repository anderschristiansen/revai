"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

type TabType = 'profile' | 'ai';

type AiSettings = {
  instructions: string;
  temperature: number;
  max_tokens: number;
  seed: number;
  model: string;
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [aiSettings, setAiSettings] = useState<AiSettings>({
    instructions: '',
    temperature: 0.1,
    max_tokens: 500,
    seed: 12345,
    model: 'gpt-3.5-turbo'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAiSettings();
  }, []);

  const loadAiSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('instructions, temperature, max_tokens, seed, model')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setAiSettings({
          instructions: data.instructions,
          temperature: data.temperature,
          max_tokens: data.max_tokens,
          seed: data.seed,
          model: data.model
        });
      }
    } catch (error) {
      console.error('Error loading AI settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI settings',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAiSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ai_settings')
        .update({
          instructions: aiSettings.instructions,
          temperature: aiSettings.temperature,
          max_tokens: aiSettings.max_tokens,
          seed: aiSettings.seed,
          model: aiSettings.model,
          updated_at: new Date().toISOString()
        })
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      toast({
        title: 'Success',
        description: 'AI settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save AI settings',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof AiSettings, value: string | number) => {
    setAiSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
              Customize the AI evaluation instructions and parameters used when reviewing articles.
            </p>
            {isLoading ? (
              <div className="border rounded-md p-4 mt-4 flex justify-center items-center h-[300px]">
                <p className="text-sm text-muted-foreground">Loading AI settings...</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div>
                  <Label htmlFor="ai-instructions" className="text-base font-medium">AI Review Instructions</Label>
                  <Textarea
                    id="ai-instructions"
                    placeholder="Enter instructions for the AI reviewer..."
                    className="mt-3 h-[350px] font-mono text-sm p-4 leading-relaxed"
                    value={aiSettings.instructions}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    These instructions will be used by the AI when evaluating articles against inclusion criteria.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select 
                      value={aiSettings.model} 
                      onValueChange={(value: string) => handleInputChange('model', value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the OpenAI model to use for evaluations.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-tokens">Max Tokens</Label>
                    <Input
                      id="max-tokens"
                      type="number"
                      min="100"
                      max="4000"
                      value={aiSettings.max_tokens}
                      onChange={(e) => handleInputChange('max_tokens', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum output tokens (100-4000).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seed">Seed</Label>
                    <Input
                      id="seed"
                      type="number"
                      value={aiSettings.seed}
                      onChange={(e) => handleInputChange('seed', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Fixed random seed for reproducible results.
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="temperature">Temperature: {aiSettings.temperature.toFixed(2)}</Label>
                    </div>
                    <Slider
                      id="temperature"
                      min={0}
                      max={1}
                      step={0.01}
                      value={[aiSettings.temperature]}
                      onValueChange={(values: number[]) => handleInputChange('temperature', values[0])}
                      className="py-4"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower values (0-0.3) for more consistent outputs, higher values for more creative results.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end mt-10">
                  <Button 
                    onClick={saveAiSettings} 
                    disabled={isSaving}
                    size="lg"
                    className="px-6"
                  >
                    {/* {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Save
                      </>
                    ) : (
                      'Save'
                    )} */}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container py-8 flex justify-center">
      <Card className="w-full max-w-6xl">
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
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-10">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-56 shrink-0">
              <nav className="flex flex-col rounded-md overflow-hidden">
                <Button
                  variant="link"
                  className={cn(
                    "justify-start h-10 px-6 text-base",
                    activeTab === 'profile' && "bg-muted"
                  )}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile
                </Button>
                <Button
                  variant="link"
                  className={cn(
                    "justify-start h-10 px-6 text-base",
                    activeTab === 'ai' && "bg-muted"
                  )}
                  onClick={() => setActiveTab('ai')}
                >
                  AI
                </Button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4">
              <div>
                <h2 className="text-2xl font-semibold mb-4">
                  {activeTab === 'profile' ? 'Profile' : 'AI Settings'}
                </h2>
                <p className="text-sm text-muted-foreground mb-10">
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