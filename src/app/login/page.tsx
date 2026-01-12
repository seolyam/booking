"use client";

import { useState } from "react";
import { signIn, signUp } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(email, password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // signIn redirects on success, so we don't need to handle that
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signUp(email, password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else if (result?.success) {
      // Show success message and switch to login
      setError("");
      setEmail("");
      setPassword("");
      setActiveTab("login");
      setLoading(false);
      // You might want to show a success toast here
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Branding */}
      <div className="hidden md:flex md:w-1/2 bg-linear-to-br from-[#2F5E3D] to-[#1e3f2a] text-white flex-col justify-center px-8 py-12">
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              Negros Power
            </h1>
            <p className="text-lg text-green-100">
              Budget Submission & Approval Tool
            </p>
          </div>
          <p className="text-green-100 text-lg leading-relaxed">
            Streamline your budget approval workflow. Submit requests, review
            proposals, and make informed decisions with our integrated budgeting
            platform.
          </p>
          <div className="space-y-4 pt-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-300/20 rounded-lg flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-green-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold">Secure Workflow</p>
                <p className="text-sm text-green-100">
                  3-tier approval process with full audit trail
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-300/20 rounded-lg flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-green-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold">Real-time Tracking</p>
                <p className="text-sm text-green-100">
                  Monitor budget status at every stage
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-300/20 rounded-lg flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-green-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold">Department Management</p>
                <p className="text-sm text-green-100">
                  Support for 10 departments with role-based access
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center px-4 py-8 md:py-0 bg-gray-50 md:bg-white">
        <Card className="w-full max-w-md shadow-lg md:shadow-none border-0 md:border">
          {/* Mobile Header */}
          <div className="md:hidden bg-linear-to-r from-[#2F5E3D] to-[#1e3f2a] text-white px-6 py-8 rounded-t-lg">
            <h1 className="text-3xl font-bold mb-1">Negros Power</h1>
            <p className="text-green-100 text-sm">Budget Portal</p>
          </div>

          <CardHeader className="md:space-y-1 pt-6 md:pt-8">
            <CardTitle className="text-2xl md:text-3xl text-[#2F5E3D]">
              {activeTab === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {activeTab === "login"
                ? "Sign in to your budget account"
                : "Register for a new account"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Register</TabsTrigger>
              </TabsList>

              {error && (
                <Alert className="mb-6 border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800 ml-2">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Sign In Tab */}
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="login-email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email Address
                    </label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="login-password"
                      className="text-sm font-medium text-gray-700"
                    >
                      Password
                    </label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="signup-email"
                      className="text-sm font-medium text-gray-700"
                    >
                      Email Address
                    </label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@negrospower.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="signup-password"
                      className="text-sm font-medium text-gray-700"
                    >
                      Password (min. 6 characters)
                    </label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    After registration, an admin will assign your role and
                    department.
                  </p>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                For support, contact{" "}
                <a
                  href="mailto:budget@negrospower.com"
                  className="text-[#2F5E3D] hover:underline font-medium"
                >
                  budget@negrospower.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
