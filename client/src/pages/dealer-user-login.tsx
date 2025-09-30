import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Users } from "lucide-react";

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
    firstName: string;
    lastName: string;
    title: string | null;
    role: string;
  };
  dealer: {
    id: number;
    dealerId: string;
    companyName: string;
  };
  sessionId: string;
  expiresAt: string;
}

export default function DealerUserLogin() {
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
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setIsLoading(true);
      setError(null);

      const response: LoginResponse = await apiRequest("/api/dealer/user/login", {
        method: "POST",
        body: data,
      });

      // Clear any old sessions first
      localStorage.removeItem("dealer_session");
      localStorage.removeItem("dealer_user");
      
      // Store new session info in localStorage
      localStorage.setItem("dealer_session", response.sessionId);
      localStorage.setItem("dealer_user", JSON.stringify({
        ...response.user,
        dealer: response.dealer,
      }));

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-blue-100 p-3">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Dealer Employee Portal</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your employee credentials
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employee Sign In</CardTitle>
            <CardDescription>
              Enter your username and password to access the portal
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
                  data-testid="input-username"
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
                  data-testid="input-password"
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
                data-testid="button-submit"
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
                Need assistance? Contact your dealer administrator.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-2">
          <Link href="/dealer/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-800"
              data-testid="link-dealer-login"
            >
              Dealer Account? Sign in here
            </Button>
          </Link>
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-800"
              data-testid="button-back"
            >
              ← Back to Configurator
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
