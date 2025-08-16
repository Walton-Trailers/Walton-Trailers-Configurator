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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Building2 } from "lucide-react";

const loginSchema = z.object({
  dealerId: z.string().min(1, "Dealer ID is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

interface LoginResponse {
  dealer: {
    id: number;
    dealerId: string;
    dealerName: string;
    contactName: string;
    email: string;
    territory: string;
  };
  sessionId: string;
  expiresAt: string;
}

export default function DealerLogin() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const sessionId = localStorage.getItem("dealer_session");
    if (sessionId) {
      setLocation("/dealer/dashboard");
    }
  }, [setLocation]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      dealerId: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      setError(null);

      const response: LoginResponse = await apiRequest("/api/dealer/login", {
        method: "POST",
        body: data,
      });

      // Clear any old sessions first
      localStorage.removeItem("dealer_session");
      localStorage.removeItem("dealer_user");
      
      // Store new session info in localStorage
      localStorage.setItem("dealer_session", response.sessionId);
      localStorage.setItem("dealer_user", JSON.stringify(response.dealer));

      // Clear React Query cache to ensure fresh data
      queryClient.clear();

      // Redirect to dealer dashboard
      setLocation("/dealer/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Dealer Portal
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to access your dealer dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dealer Sign In</CardTitle>
            <CardDescription>
              Enter your dealer credentials to access the portal
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
                <Label htmlFor="dealerId">Dealer ID</Label>
                <Input
                  id="dealerId"
                  type="text"
                  placeholder="Enter your dealer ID"
                  {...form.register("dealerId")}
                  disabled={isLoading}
                />
                {form.formState.errors.dealerId && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.dealerId.message}
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

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need assistance? Contact your regional sales manager.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Configurator
          </Button>
        </div>
      </div>
    </div>
  );
}