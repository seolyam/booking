"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn, signUp } from "@/actions/auth";
import { uploadIdDocument } from "@/actions/uploadId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, Check } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn(email, password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!idFile) {
      setError("Please upload a valid ID document");
      return;
    }
    setError("");
    setLoading(true);
    setUploadProgress("Creating account...");

    try {
      const result = await signUp(email, password, {
        fullName,
        idNumber,
        department,
        position,
        requestedRole: position.toLowerCase(),
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        setUploadProgress("");
        return;
      }

      if (!result.userId) {
        setError("Failed to create account");
        setLoading(false);
        setUploadProgress("");
        return;
      }

      // Compress and upload ID document via server action (bypasses RLS)
      setUploadProgress("Compressing ID document...");
      const compressed = await compressImage(idFile, {
        maxDimension: 1600,
        quality: 0.75,
        format: "webp",
      });

      setUploadProgress("Uploading ID document...");

      // Convert blob to base64 for server action
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });

      const base64Data = await base64Promise;

      const uploadResult = await uploadIdDocument(result.userId, base64Data);

      if (uploadResult?.error) {
        setError(uploadResult.error);
        setLoading(false);
        setUploadProgress("");
        return;
      }

      setUploadProgress("");
      setLoading(false);
      alert(
        "Registration successful! Please check your email to verify your account. Your application is pending admin approval."
      );
      setIsLogin(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side - Branding */}
      <div className="hidden md:flex md:w-[45%] bg-linear-to-br from-[#A8C738] via-[#4DA44E] to-[#2F5E3D] items-center justify-center relative overflow-hidden">
        <div className="flex items-center justify-center">
          <Image
            src="/images/"
            alt="Placeholder Logo"
            width={400}
            height={400}
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 bg-white p-8 md:p-12 lg:p-16 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLogin ? (
            // LOGIN FORM
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Login</h1>
                <p className="text-gray-500">Enter your details</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-900">
                    User ID / Email
                  </Label>
                  <Input
                    id="email"
                    placeholder="Enter your ID / Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-900">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm text-gray-500 underline hover:text-[#2F5E3D]"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#358334] hover:bg-[#2F5E3D] h-11 text-base"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>

              <div className="text-center text-sm text-gray-500">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => setIsLogin(false)}
                  className="font-semibold text-[#358334] hover:underline"
                >
                  Sign-up
                </button>
              </div>
            </div>
          ) : (
            // REGISTER FORM
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  Create your account
                </h1>
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <button
                    onClick={() => setIsLogin(true)}
                    className="font-semibold text-[#358334] hover:underline"
                  >
                    Login
                  </button>
                </p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-gray-900">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="idNumber" className="text-gray-900">
                      ID Number
                    </Label>
                    <Input
                      id="idNumber"
                      placeholder="1234"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-gray-900">
                      Email Address
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900">
                    Select your Department
                  </Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="w-full h-11 bg-white text-black border-input">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="Office of the President">
                        Office of the President
                      </SelectItem>
                      <SelectItem value="CESRA">CESRA</SelectItem>
                      <SelectItem value="Customer Care">
                        Customer Care
                      </SelectItem>
                      <SelectItem value="Controllership">
                        Controllership
                      </SelectItem>
                      <SelectItem value="Admin/Gen Services">
                        Admin/Gen Services
                      </SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Procurement">Procurement</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                      <SelectItem value="NDOG">NDOG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900">Select your Position</Label>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger className="w-full h-11 bg-white text-black border-input">
                      <SelectValue placeholder="Select your position" />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-black">
                      <SelectItem value="Requester">Requester</SelectItem>
                      <SelectItem value="Reviewer">Reviewer</SelectItem>
                      <SelectItem value="Approver">Approver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-gray-900">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 focus:outline-none"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm" className="text-gray-900">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-confirm"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 focus:outline-none"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Label htmlFor="id-upload" className="text-gray-900">
                    Upload ID picture
                  </Label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      id="id-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            setError("Image must be smaller than 10MB");
                            return;
                          }
                          setIdFile(file);
                          setError("");
                        }
                      }}
                      className="sr-only"
                      required
                    />

                    <label
                      htmlFor="id-upload"
                      className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-white px-4 text-sm text-gray-900 hover:bg-black/5 cursor-pointer"
                    >
                      Choose file
                    </label>

                    <div className="min-w-0 flex-1 text-sm text-gray-600 truncate">
                      {idFile ? idFile.name : "No file selected"}
                    </div>

                    {idFile && (
                      <Check className="h-5 w-5 text-green-600 shrink-0" />
                    )}
                  </div>

                  {idFile && (
                    <p className="text-sm text-gray-500 mt-1">
                      {(idFile.size / 1024).toFixed(1)} KB
                    </p>
                  )}
                </div>

                {uploadProgress && (
                  <p className="text-sm text-gray-600">{uploadProgress}</p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#358334] hover:bg-[#2F5E3D] h-11 text-base mt-2"
                  disabled={loading}
                >
                  {loading
                    ? uploadProgress || "Processing..."
                    : "Submit application"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
