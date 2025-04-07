"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Film, Mail, User, UserPlus } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { CookieReset } from "@/components/cookie-reset"

export default function AuthPage() {
  const router = useRouter()
  const { login, register } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [isLoginLoading, setIsLoginLoading] = useState(false)

  // Register form state
  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerUsername, setRegisterUsername] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")
  const [userRole, setUserRole] = useState<"critic" | "viewer">("viewer")
  const [isRegisterLoading, setIsRegisterLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login form submitted with:", { loginEmail, loginPassword: "***" });
    
    if (!loginEmail || !loginPassword) {
      console.log("Missing email or password");
      toast({
        title: "Login failed",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoginLoading(true);

    try {
      console.log("Attempting login with auth context...");
      const result = await login(loginEmail, loginPassword);
      console.log("Login API response:", result);

      if (result.success) {
        console.log("Login successful, redirecting to home page");
        toast({
          title: "Login successful",
          description: "Welcome back to CineVerse!",
        });
        
        // Add a small delay before navigation to ensure toast is shown
        setTimeout(() => {
          router.push("/");
        }, 500);
      } else {
        console.error("Login failed:", result.message);
        toast({
          title: "Login failed",
          description: result.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoginLoading(false);
    }
  };

  // Add form validation
  const isFormValid = loginEmail && loginPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate passwords match
    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: "Registration failed",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    setIsRegisterLoading(true)

    try {
      const result = await register({
        name: registerName,
        email: registerEmail,
        username: registerUsername,
        password: registerPassword,
        role: userRole,
      })

      if (result.success) {
        toast({
          title: "Registration successful",
          description: "Welcome to CineVerse!",
        })
        router.push("/")
      } else {
        toast({
          title: "Registration failed",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsRegisterLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <div className="grid w-full gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        <div className="flex flex-col justify-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Join the CineVerse Community</h1>
            <p className="text-muted-foreground md:text-xl">
              Connect with fellow movie enthusiasts, share your reviews, and discover new films.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Film className="h-4 w-4" />
              <span>10,000+ Movies</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>5,000+ Critics</span>
            </div>
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>Weekly Updates</span>
            </div>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-xl">
            <Image
              src="/placeholder.svg?height=400&width=600"
              alt="Movie collage"
              width={600}
              height={400}
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "login" | "register")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" className="gap-2">
                <User className="h-4 w-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>Enter your email and password to access your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form 
                    onSubmit={handleLogin} 
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <Label htmlFor="remember" className="text-sm">
                        Remember me
                      </Label>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoginLoading || !isFormValid}
                    >
                      {isLoginLoading ? "Logging in..." : "Login"}
                    </Button>
                    <div className="text-xs text-muted-foreground mt-2">
                      <p>Use these test credentials:</p>
                      <p>Email: test@example.com</p>
                      <p>Password: password123</p>
                    </div>
                  </form>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Having trouble logging in?</p>
                    <CookieReset />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setActiveTab("register")}
                    >
                      Register
                    </button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create an account</CardTitle>
                  <CardDescription>Enter your information to create an account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        placeholder="johndoe"
                        value={registerUsername}
                        onChange={(e) => setRegisterUsername(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="name@example.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account Type</Label>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="role-viewer"
                            checked={userRole === "viewer"}
                            onCheckedChange={() => setUserRole("viewer")}
                          />
                          <Label htmlFor="role-viewer" className="text-sm">
                            Viewer
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="role-critic"
                            checked={userRole === "critic"}
                            onCheckedChange={() => setUserRole("critic")}
                          />
                          <Label htmlFor="role-critic" className="text-sm">
                            Critic
                          </Label>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="terms" required />
                      <Label htmlFor="terms" className="text-sm">
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary hover:underline">
                          terms of service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-primary hover:underline">
                          privacy policy
                        </Link>
                      </Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={isRegisterLoading}>
                      {isRegisterLoading ? "Creating account..." : "Register"}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex flex-col items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setActiveTab("login")}
                    >
                      Login
                    </button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

