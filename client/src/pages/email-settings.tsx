import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const emailConfigSchema = z.object({
  provider: z.enum(['console', 'smtp', 'gmail', 'outlook']),
  fromAddress: z.string().email("Please enter a valid email address"),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  gmailUser: z.string().optional(),
  gmailAppPassword: z.string().optional(),
  outlookUser: z.string().optional(),
  outlookPass: z.string().optional(),
});

type EmailConfigForm = z.infer<typeof emailConfigSchema>;

interface EmailConfig {
  config: {
    provider: string;
    fromAddress: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpSecure?: boolean;
    gmailUser?: string;
    outlookUser?: string;
  };
  validation: {
    isValid: boolean;
    errors: string[];
  };
}

export default function EmailSettings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testEmail, setTestEmail] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const { data: emailConfig, isLoading } = useQuery<EmailConfig>({
    queryKey: ["/api/admin/email-config"],
  });

  const form = useForm<EmailConfigForm>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      provider: 'console',
      fromAddress: 'noreply@waltontrailers.com',
      smtpPort: 587,
      smtpSecure: false,
    },
  });

  const selectedProvider = form.watch('provider');

  useEffect(() => {
    if (emailConfig?.config) {
      form.reset({
        provider: emailConfig.config.provider as any,
        fromAddress: emailConfig.config.fromAddress,
        smtpHost: emailConfig.config.smtpHost || '',
        smtpPort: emailConfig.config.smtpPort || 587,
        smtpSecure: emailConfig.config.smtpSecure || false,
        smtpUser: '',
        smtpPass: '',
        gmailUser: emailConfig.config.gmailUser || '',
        gmailAppPassword: '',
        outlookUser: emailConfig.config.outlookUser || '',
        outlookPass: '',
      });
    }
  }, [emailConfig, form]);

  const updateConfigMutation = useMutation({
    mutationFn: (data: EmailConfigForm) => apiRequest("/api/admin/email-config", {
      method: "POST",
      body: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/email-config"] });
      toast({
        title: "Success",
        description: "Email configuration updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email configuration",
        variant: "destructive",
      });
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: (email: string) => apiRequest("/api/admin/test-email", {
      method: "POST",
      body: { testEmail: email },
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Test email sent successfully!",
      });
      setTestEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send test email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailConfigForm) => {
    updateConfigMutation.mutate(data);
  };

  const handleTestEmail = () => {
    if (testEmail) {
      testEmailMutation.mutate(testEmail);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading email settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3">
            <Mail className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Email Settings</h1>
              <p className="text-gray-600">Configure email delivery for password resets and notifications</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>
                  Choose your email provider and configure the settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {emailConfig?.validation && !emailConfig.validation.isValid && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Configuration Issues:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {emailConfig.validation.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Email Provider</Label>
                      <Select
                        value={form.watch('provider')}
                        onValueChange={(value) => form.setValue('provider', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="console">Console (Development)</SelectItem>
                          <SelectItem value="smtp">SMTP Server</SelectItem>
                          <SelectItem value="gmail">Gmail</SelectItem>
                          <SelectItem value="outlook">Outlook/Hotmail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fromAddress">From Email Address</Label>
                      <Input
                        id="fromAddress"
                        type="email"
                        placeholder="noreply@waltontrailers.com"
                        {...form.register("fromAddress")}
                      />
                      {form.formState.errors.fromAddress && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.fromAddress.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedProvider === 'smtp' && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">SMTP Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="smtpHost">SMTP Host</Label>
                            <Input
                              id="smtpHost"
                              placeholder="smtp.gmail.com"
                              {...form.register("smtpHost")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input
                              id="smtpPort"
                              type="number"
                              placeholder="587"
                              {...form.register("smtpPort", { valueAsNumber: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="smtpUser">SMTP Username</Label>
                            <Input
                              id="smtpUser"
                              placeholder="your-email@domain.com"
                              {...form.register("smtpUser")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="smtpPass">SMTP Password</Label>
                            <Input
                              id="smtpPass"
                              type="password"
                              placeholder="••••••••"
                              {...form.register("smtpPass")}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="smtpSecure"
                              checked={form.watch('smtpSecure')}
                              onCheckedChange={(checked) => form.setValue('smtpSecure', checked)}
                            />
                            <Label htmlFor="smtpSecure">Use TLS/SSL</Label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedProvider === 'gmail' && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Gmail Settings</h3>
                        <Alert>
                          <AlertDescription>
                            You need to generate an App Password in your Google Account settings.
                            Regular passwords won't work.
                          </AlertDescription>
                        </Alert>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="gmailUser">Gmail Address</Label>
                            <Input
                              id="gmailUser"
                              placeholder="your-email@gmail.com"
                              {...form.register("gmailUser")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="gmailAppPassword">App Password</Label>
                            <Input
                              id="gmailAppPassword"
                              type="password"
                              placeholder="••••••••••••••••"
                              {...form.register("gmailAppPassword")}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedProvider === 'outlook' && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Outlook Settings</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="outlookUser">Outlook Email</Label>
                            <Input
                              id="outlookUser"
                              placeholder="your-email@outlook.com"
                              {...form.register("outlookUser")}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="outlookPass">Password</Label>
                            <Input
                              id="outlookPass"
                              type="password"
                              placeholder="••••••••"
                              {...form.register("outlookPass")}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={updateConfigMutation.isPending}
                    >
                      {updateConfigMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Configuration'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Email</CardTitle>
                <CardDescription>
                  Send a test email to verify your configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testEmail">Test Email Address</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleTestEmail}
                  disabled={!testEmail || testEmailMutation.isPending}
                  className="w-full"
                >
                  {testEmailMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Test...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {emailConfig?.validation.isValid ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-600 font-medium">Configuration Valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-600 font-medium">Configuration Invalid</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Current provider: <span className="font-medium">{emailConfig?.config.provider}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}