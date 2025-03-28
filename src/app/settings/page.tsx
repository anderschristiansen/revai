"use client";

import { useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function Settings() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const getUserInitials = (email: string | undefined) => {
    if (!email) return ''
    return email
      .split('@')[0]
      .split('.')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)

    // Add your form submission logic here

    setIsLoading(false)
    toast({
      title: "Success",
      description: "Your settings have been updated.",
    })
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: "Could not sign out. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="container py-8 flex justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`https://avatar.vercel.sh/${user?.email}`} alt={user?.email || ''} />
              <AvatarFallback>{getUserInitials(user?.email)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account settings and preferences.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  defaultValue={user?.email?.split('@')[0] || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  placeholder="Select your preferred language"
                  defaultValue="English"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save changes'}
              </Button>
              
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
          </form>
        </CardContent>
      </Card>
    </div>
  )
} 