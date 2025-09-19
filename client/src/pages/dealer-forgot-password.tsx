import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Building2, ArrowLeft, Mail } from "lucide-react";

const forgotPasswordSchema = z.object({
  dealerId: z.string().min(1, "Dealer ID is required"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function DealerForgotPassword() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await apiRequest("/api/dealer/forgot-password", {
        method: "POST",
        body: data,
      });

      setSuccess("If a dealer account with that ID exists, a password reset link has been sent to the registered email address.");
    } catch (err: any) {
      setError(err.message || "Failed to process password reset request. Please try again.");
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
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your Dealer ID to receive a password reset link
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Password Reset Request
            </CardTitle>
            <CardDescription>
              We'll send a secure reset link to your registered email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <Mail className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {success}
                  </AlertDescription>
                </Alert>
                
                <div className="text-center space-y-4">
                  <div className="text-sm text-gray-600">
                    <p>Check your email inbox and spam folder.</p>
                    <p>The reset link will expire in 2 hours.</p>
                  </div>
                  
                  <div className="pt-4">
                    <Link href="/dealer/login">
                      <Button variant="outline" className="w-full">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
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
                    placeholder="Enter your dealer ID (e.g., D001)"
                    {...form.register("dealerId")}
                    disabled={isLoading}
                    data-testid="input-dealer-id"
                  />
                  {form.formState.errors.dealerId && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.dealerId.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-send-reset-link"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reset Link
                    </>
                  )}
                </Button>

                <div className="text-center pt-4">
                  <Link href="/dealer/login">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-gray-600 hover:text-gray-800"
                      data-testid="link-back-to-login"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </Link>
                </div>
              </form>
            )}
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