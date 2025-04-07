"use client"

import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function CookieReset() {
  const router = useRouter()

  const handleClearCookies = async () => {
    try {
      // Call logout endpoint to clear cookies
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })
      
      if (response.ok) {
        toast({
          title: "Cookies cleared",
          description: "Authentication data has been reset. You can now log in again.",
        })
        // Redirect to login page
        setTimeout(() => {
          router.push("/login")
          router.refresh()
        }, 500)
      } else {
        toast({
          title: "Error",
          description: "Failed to clear cookies. Try clearing them manually in your browser.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Button 
      variant="destructive" 
      onClick={handleClearCookies}
      className="mt-2"
    >
      Fix Login Issues (Clear Cookies)
    </Button>
  )
} 