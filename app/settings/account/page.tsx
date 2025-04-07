"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Check, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function AccountSettings() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    
    // Validate passwords
    if (!formData.currentPassword) {
      setError("Current password is required")
      return
    }
    
    if (!formData.newPassword) {
      setError("New password is required")
      return
    }
    
    if (formData.newPassword.length < 8) {
      setError("New password must be at least 8 characters long")
      return
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match")
      return
    }
    
    setIsLoading(true)
    
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        }),
        credentials: "include",
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        setError(data.error || "Password change failed")
      } else {
        setSuccess("Password changed successfully")
        // Clear the form
        setFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        })
      }
    } catch (err) {
      setError("An unexpected error occurred")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and security</p>
      </div>
      
      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Error</AlertTitle>
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            {success}
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>View your basic account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Email Address</Label>
            <div className="p-2 bg-muted rounded-md font-mono text-sm">
              {user?.email}
            </div>
            <p className="text-xs text-muted-foreground">
              This is the email address associated with your account.
            </p>
          </div>
          
          <div className="grid gap-2">
            <Label>Account Type</Label>
            <div className="p-2 bg-muted rounded-md">
              {user?.role && user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label>Account Created</Label>
            <div className="p-2 bg-muted rounded-md">
              {user?.createdAt 
                ? new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : 'Unknown'
              }
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long.
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Account Deletion</CardTitle>
          <CardDescription>Permanently delete your account and all your data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This action cannot be undone. Once you delete your account, all of your data will be permanently removed.
          </p>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you absolutely sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove your data from our servers.
                </DialogDescription>
              </DialogHeader>
              <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <p className="text-sm text-red-800 font-medium">Warning:</p>
                <ul className="text-sm text-red-700 list-disc pl-4 mt-2 space-y-1">
                  <li>All of your reviews will be deleted</li>
                  <li>Your watchlist and favorites will be removed</li>
                  <li>Your profile and all personal information will be erased</li>
                  <li>You will not be able to recover this account</li>
                </ul>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline" className="mt-2 sm:mt-0">Cancel</Button>
                </DialogClose>
                <Button variant="destructive">
                  Delete Permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
} 