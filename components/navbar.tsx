"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Film, Menu, User, LogOut, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { SearchAutocomplete } from "@/components/search-autocomplete"

export default function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()

  const handleSearchToggle = useCallback(() => {
    setIsSearchOpen(prev => !prev);
  }, []);

  const handleSearchComplete = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const handleMovieSelect = useCallback(() => {
    // Close the search overlay when a movie is selected
    setIsSearchOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    router.push("/");
  }, [logout, router]);

  const handleLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  // Memoize the mobile nav items to avoid recreating on every render
  const mobileNavItems = useMemo(() => (
    <nav className="flex flex-col gap-4 mt-8">
      <Link
        href="/"
        className={`text-lg font-medium ${pathname === "/" ? "text-primary" : "text-muted-foreground"}`}
      >
        Home
      </Link>
      <Link
        href="/search"
        className={`text-lg font-medium ${pathname === "/search" ? "text-primary" : "text-muted-foreground"}`}
      >
        Discover
      </Link>
      <Link
        href="/critics"
        className={`text-lg font-medium ${pathname === "/critics" ? "text-primary" : "text-muted-foreground"}`}
      >
        Critics
      </Link>
      {isAuthenticated ? (
        <>
          <Link
            href={`/profile/${user?._id}`}
            className={`text-lg font-medium ${pathname === `/profile/${user?._id}` ? "text-primary" : "text-muted-foreground"}`}
          >
            Profile
          </Link>
          <button onClick={logout} className="text-lg font-medium text-muted-foreground text-left">
            Logout
          </button>
        </>
      ) : (
        <Link
          href="/login"
          className={`text-lg font-medium ${pathname === "/login" ? "text-primary" : "text-muted-foreground"}`}
        >
          Login / Register
        </Link>
      )}
    </nav>
  ), [pathname, isAuthenticated, user, logout]);
  
  // Memoize desktop nav items
  const desktopNavItems = useMemo(() => (
    <nav className="hidden lg:flex items-center gap-6 text-sm">
      <Link
        href="/"
        className={`font-medium ${pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
      >
        Home
      </Link>
      <Link
        href="/search"
        className={`font-medium ${pathname === "/search" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
      >
        Discover
      </Link>
      <Link
        href="/critics"
        className={`font-medium ${pathname === "/critics" ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
      >
        Critics
      </Link>
    </nav>
  ), [pathname]);

  // Memoize user dropdown menu
  const userDropdown = useMemo(() => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name || "User"} />
            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/profile/${user?._id}`}>Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ), [user, handleLogout]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" className="mr-1">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader className="mb-6 mt-3 ml-2">
              <SheetTitle>
                <span className="font-bold text-2xl">
                  <span className="text-brand-red">Reel</span>Critic
                </span>
              </SheetTitle>
            </SheetHeader>
            {mobileNavItems}
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-0 mr-4 ml-1 lg:ml-4 lg:mr-6">
          <span className="font-bold text-xl md:text-2xl">
            <span className="text-brand-red">Reel</span>Critic
          </span>
        </Link>

        {desktopNavItems}

        <div className="flex items-center ml-auto gap-2">
          {isSearchOpen ? (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-background/95 backdrop-blur pt-16 px-4 lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:backdrop-blur-none lg:pt-0 lg:px-0">
              <div className="w-full max-w-md lg:max-w-sm">
                <SearchAutocomplete 
                  className="w-full" 
                  onSearch={handleSearchComplete}
                  onMovieSelect={handleMovieSelect} 
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-4 right-4 lg:hidden"
                  onClick={handleSearchToggle}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close search</span>
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleSearchToggle}>
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>
          )}

          {isAuthenticated ? (
            userDropdown
          ) : (
            <Button variant="default" size="sm" className="hidden sm:flex" onClick={handleLogin}>
              <User className="h-4 w-4 mr-2" />
              Login
            </Button>
          )}
          {!isAuthenticated && (
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={handleLogin}>
              <User className="h-5 w-5" />
              <span className="sr-only">Login</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

