"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { AlertCircle, Check, Loader2, Twitter, Instagram, Facebook, Globe, Linkedin, Camera } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"

export default function ProfileSettings() {
  const { user, updateProfile } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    location: "",
    website: "",
    avatar: "",
    social: {
      twitter: "",
      instagram: "",
      facebook: "",
      linkedin: "",
      letterboxd: "",
    },
    preferences: {
      favoriteGenres: [],
      notifications: true,
      privacy: {
        showEmail: false,
        showWatchlist: true,
        showFavorites: true,
      }
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [uploadError, setUploadError] = useState("")

  // Load user data when available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        username: user.username || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        avatar: user.avatar || "",
        social: {
          twitter: user.social?.twitter || "",
          instagram: user.social?.instagram || "",
          facebook: user.social?.facebook || "",
          linkedin: user.social?.linkedin || "",
          letterboxd: user.social?.letterboxd || "",
        },
        preferences: {
          favoriteGenres: user.preferences?.favoriteGenres || [],
          notifications: user.preferences?.notifications !== false,
          privacy: {
            showEmail: user.preferences?.privacy?.showEmail || false,
            showWatchlist: user.preferences?.privacy?.showWatchlist !== false,
            showFavorites: user.preferences?.privacy?.showFavorites !== false,
          }
        }
      })
    }
  }, [user])

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Handle nested social properties
    if (name.startsWith('social.')) {
      const socialField = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        social: {
          ...prev.social,
          [socialField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  // Handle switch changes
  const handleSwitchChange = (name: string, checked: boolean) => {
    if (name.startsWith('privacy.')) {
      const privacyField = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          privacy: {
            ...prev.preferences.privacy,
            [privacyField]: checked
          }
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          [name]: checked
        }
      }))
    }
  }

  // Handle file selection for avatar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      setUploadError("")

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Upload failed with status:', response.status, 'Error:', result.error)
        throw new Error(result.error || `Upload failed with status code ${response.status}`)
      }

      // Update form data with new avatar URL
      setFormData(prev => ({
        ...prev,
        avatar: result.imageUrl
      }))

      // Update user in auth context
      await updateProfile({ avatar: result.imageUrl })

      // Show success message
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Upload error:', err)
      setUploadError(err.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  // Trigger file input click
  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccess(false)
    setError("")

    try {
      const result = await updateProfile(formData)
      
      if (result.success) {
        setSuccess(true)
        // Scroll to top to show success message
        window.scrollTo(0, 0)
      } else {
        setError(result.message)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">Update your profile information and preferences</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/profile/${user?._id}`}>View My Profile</Link>
        </Button>
      </div>

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Success</AlertTitle>
          <AlertDescription className="text-green-700">
            Your profile has been updated successfully.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Error</AlertTitle>
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Edit your basic profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-32 relative group">
                <Avatar className="h-32 w-32 border-4 border-muted relative cursor-pointer group-hover:opacity-80 transition-opacity" onClick={handleAvatarClick}>
                  <AvatarImage src={formData.avatar || "/placeholder.svg?height=200&width=200"} alt={formData.name || "User profile"} />
                  <AvatarFallback>{formData.name?.charAt(0) || 'U'}</AvatarFallback>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                </Avatar>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="hidden" 
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileChange}
                />
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
                {uploadError && (
                  <p className="text-xs text-red-500 mt-2">{uploadError}</p>
                )}
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="grid gap-3">
                  <Label htmlFor="avatar">Profile Picture URL</Label>
                  <Input
                    id="avatar"
                    name="avatar"
                    placeholder="https://example.com/avatar.jpg"
                    value={formData.avatar}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    You can click on your avatar to upload a new image, or provide a URL directly.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Your full name" 
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  name="username" 
                  placeholder="username" 
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea 
                id="bio" 
                name="bio" 
                placeholder="Tell us about yourself in a few sentences..." 
                value={formData.bio}
                onChange={handleChange}
                rows={4}
              />
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  name="location" 
                  placeholder="City, Country" 
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="website">Website</Label>
                <Input 
                  id="website" 
                  name="website" 
                  placeholder="https://yourwebsite.com" 
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
            <CardDescription>Connect your social profiles to share with other users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="social.twitter" className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 text-[#1DA1F2]" />
                  Twitter
                </Label>
                <Input 
                  id="social.twitter" 
                  name="social.twitter" 
                  placeholder="@username" 
                  value={formData.social.twitter}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  Add just your username or handle (with or without @).
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="social.instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-[#E1306C]" />
                  Instagram
                </Label>
                <Input 
                  id="social.instagram" 
                  name="social.instagram" 
                  placeholder="@username" 
                  value={formData.social.instagram}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  Add just your username (with or without @).
                </p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="social.facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-[#4267B2]" />
                  Facebook
                </Label>
                <Input 
                  id="social.facebook" 
                  name="social.facebook" 
                  placeholder="username or profile URL" 
                  value={formData.social.facebook}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  Add your username or full profile URL.
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="social.linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-[#0077B5]" />
                  LinkedIn
                </Label>
                <Input 
                  id="social.linkedin" 
                  name="social.linkedin" 
                  placeholder="username or profile URL" 
                  value={formData.social.linkedin}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  Add your LinkedIn username or full profile URL.
                </p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="social.letterboxd" className="flex items-center gap-2">
                  <svg 
                    className="h-4 w-4 text-[#00C030]" 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="currentColor">
                    <path d="M8.541.6c-2.581.017-5.308.442-7.541.971v20.867c2.226.53 4.955.957 7.541.971h.028c2.591-.014 5.336-.455 7.431-.971V1.571C13.863 1.057 11.118.614 8.541.6h-.028m0 16.6c-1.131 0-2.055-.92-2.055-2.055s.924-2.055 2.055-2.055 2.055.924 2.055 2.055-.924 2.055-2.055 2.055m7.431-4.918c-1.131 0-2.055-.924-2.055-2.055s.924-2.055 2.055-2.055S18.027 9.1 18.027 10.227s-.924 2.055-2.055 2.055m6.386-6.386c-1.131 0-2.055-.924-2.055-2.055S21.226 1.786 22.358 1.786s2.055.924 2.055 2.055-.924 2.055-2.055 2.055"/>
                  </svg>
                  Letterboxd
                </Label>
                <Input 
                  id="social.letterboxd" 
                  name="social.letterboxd" 
                  placeholder="username" 
                  value={formData.social.letterboxd}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  Add just your Letterboxd username.
                </p>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Personal Website
              </Label>
              <Input 
                id="website" 
                name="website" 
                placeholder="https://yourwebsite.com" 
                type="url"
                value={formData.website}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">
                Add your personal website or blog URL.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience and privacy settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Notifications</h3>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifications" className="text-base">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email notifications for follows, comments, etc.</p>
                </div>
                <Switch 
                  id="notifications"
                  checked={formData.preferences.notifications}
                  onCheckedChange={(checked) => handleSwitchChange('notifications', checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Privacy</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="privacy.showEmail" className="text-base">Show Email</Label>
                  <p className="text-sm text-muted-foreground">Make your email visible to other users.</p>
                </div>
                <Switch 
                  id="privacy.showEmail"
                  checked={formData.preferences.privacy.showEmail}
                  onCheckedChange={(checked) => handleSwitchChange('privacy.showEmail', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="privacy.showWatchlist" className="text-base">Public Watchlist</Label>
                  <p className="text-sm text-muted-foreground">Allow other users to see what's on your watchlist.</p>
                </div>
                <Switch 
                  id="privacy.showWatchlist"
                  checked={formData.preferences.privacy.showWatchlist}
                  onCheckedChange={(checked) => handleSwitchChange('privacy.showWatchlist', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="privacy.showFavorites" className="text-base">Public Favorites</Label>
                  <p className="text-sm text-muted-foreground">Allow other users to see your favorite movies.</p>
                </div>
                <Switch 
                  id="privacy.showFavorites"
                  checked={formData.preferences.privacy.showFavorites}
                  onCheckedChange={(checked) => handleSwitchChange('privacy.showFavorites', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push(`/profile/${user?._id}`)}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  )
} 