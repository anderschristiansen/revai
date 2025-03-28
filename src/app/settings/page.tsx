"use client";

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
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

  const getUserInitials = (email: string | undefined) => {
    if (!email) return ''
    return email
      .split('@')[0]
      .split('.')
      .map(n => n[0])
      .join('')
      .toUpperCase()
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
            <Avatar className="size-16">
              <AvatarImage src="https://github.com/shadcn.png" alt={user?.email || ''} />
              <AvatarFallback>{getUserInitials(user?.email)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                View your account information.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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

            <div className="flex justify-end items-center pt-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 