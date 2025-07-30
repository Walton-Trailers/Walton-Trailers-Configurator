import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowLeft, User, Shield, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function AccountManagement() {
  const { toast } = useToast();
  const sessionId = localStorage.getItem("admin_session");

  // Fetch current user profile
  const { data: user, isLoading: authLoading } = useQuery({
    queryKey: ["/api/admin/profile"],
    queryFn: () =>
      apiRequest("/api/admin/profile", {
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
  });

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to access account management.</div>;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
              <p className="text-gray-600">Manage your account settings and profile</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              <CardDescription>
                Your account details and basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={user.username || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <CardTitle>Account Status</CardTitle>
              </div>
              <CardDescription>
                Your current role and access level
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Role</Label>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
                    }`}></div>
                    <span className="font-medium capitalize">{user.role || 'Standard'}</span>
                  </div>
                  <p className="text-xs text-gray-500">Access level</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Account Status</Label>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      user.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="font-medium">
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Current status</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Member Since</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">
                      {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Account creation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last Login Information */}
          {user.lastLogin && (
            <Card>
              <CardHeader>
                <CardTitle>Session Information</CardTitle>
                <CardDescription>
                  Your recent login activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Last Login</Label>
                  <p className="font-medium">{formatDate(user.lastLogin)}</p>
                  <p className="text-xs text-gray-500">Previous session</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}