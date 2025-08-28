import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginResponse {
  user: {
    id: number;
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  sessionId: string;
  expiresAt: string;
}

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const sessionId = localStorage.getItem("admin_session");
    if (sessionId) {
      setLocation("/admin");
    }
  }, [setLocation]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      setError(null);

      const response: LoginResponse = await apiRequest("/api/admin/login", {
        method: "POST",
        body: data,
      });

      // Store session info in localStorage
      localStorage.setItem("admin_session", response.sessionId);
      localStorage.setItem("admin_user", JSON.stringify(response.user));

      // Redirect to admin dashboard
      setLocation("/admin");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Walton Trailers Admin
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your admin account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the admin portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...form.register("username")}
                  disabled={isLoading}
                />
                {form.formState.errors.username && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  {...form.register("password")}
                  disabled={isLoading}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
                onClick={() => setLocation("/admin/forgot-password")}
              >
                Forgot Password?
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <p className="font-medium">Demo Credentials:</p>
              <p>Admin: username <code>admin</code>, password <code>admin123</code></p>
              <p>Employee: username <code>employee</code>, password <code>user123</code></p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/")}
          >
            Return to Configurator
          </Button>
          
          <div className="text-center">
            <button
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              onClick={() => setLocation("/dealer/login")}
            >
              Dealer Portal Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}