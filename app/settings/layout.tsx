"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { User, Settings, Lock, Bell, Palette } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Don't show anything while checking auth
  if (isLoading) {
    return null
  }

  // Nav items configuration
  const navItems = [
    {
      title: "Profile",
      href: "/settings/profile",
      icon: <User className="h-4 w-4" />,
      status: "active",
    },
    {
      title: "Account",
      href: "/settings/account",
      icon: <Settings className="h-4 w-4" />,
      status: "active",
    },
    {
      title: "Privacy & Security",
      href: "#",
      icon: <Lock className="h-4 w-4" />,
      status: "coming-soon",
    },
    {
      title: "Notifications",
      href: "#",
      icon: <Bell className="h-4 w-4" />,
      status: "coming-soon",
    },
    {
      title: "Appearance",
      href: "#",
      icon: <Palette className="h-4 w-4" />,
      status: "coming-soon",
    },
  ]

  return (
    <div className="container py-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="md:border-r pr-6 pb-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const isActive = item.status === "active" && pathname === item.href
                const isDisabled = item.status === "coming-soon"
                
                return (
                  <div key={item.title} className="flex items-center">
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`justify-start w-full ${isActive ? 'bg-secondary' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      asChild={!isDisabled}
                      disabled={isDisabled}
                    >
                      {!isDisabled ? (
                        <Link href={item.href}>
                          {item.icon}
                          <span className="ml-2">{item.title}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center">
                          {item.icon}
                          <span className="ml-2">{item.title}</span>
                        </div>
                      )}
                    </Button>
                    {isDisabled && (
                      <Badge variant="outline" className="ml-2 text-xs bg-muted">Soon</Badge>
                    )}
                  </div>
                )
              })}
            </nav>
          </div>
        </aside>
        
        {/* Main content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
} 