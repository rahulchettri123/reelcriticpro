"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { User } from "@/lib/types"

type AuthContextType = {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  register: (userData: RegisterData) => Promise<{ success: boolean; message: string }>
  logout: () => void
  isAuthenticated: boolean
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; message: string }>
}

type RegisterData = {
  name: string
  email: string
  username: string
  password: string
  role: "critic" | "viewer"
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        console.log("Checking authentication status...");
        const response = await fetch("/api/auth/me");
        console.log("Auth status response:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("User authenticated:", data.user.email);
          setUser(data.user);
        } else {
          console.log("User not authenticated, status:", response.status);
          // Clear user state if not authenticated
          setUser(null);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log(`Attempting to login user: ${email}`);
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      console.log("Login API response status:", response.status);
      const data = await response.json();

      if (!response.ok) {
        console.error("Login failed:", data.error);
        return { success: false, message: data.error || "Login failed" };
      }

      console.log("Login successful, setting user data");
      setUser(data.user);
      
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
      
      return { success: true, message: "Login successful" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: "An unexpected error occurred" };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.error || "Registration failed" }
      }

      // Automatically log in after successful registration
      await login(userData.email, userData.password)
      return { success: true, message: "Registration successful" }
    } catch (error) {
      console.error("Registration error:", error)
      return { success: false, message: "An unexpected error occurred" }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      
      setUser(null)
      
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
        credentials: "include",
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, message: data.error || "Profile update failed" }
      }

      // Update user state with the new profile data
      setUser(data.user)
      return { success: true, message: "Profile updated successfully" }
    } catch (error) {
      console.error("Profile update error:", error)
      return { success: false, message: "An unexpected error occurred" }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

