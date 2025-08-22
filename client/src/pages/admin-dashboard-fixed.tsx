import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, Users, Settings, Plus, DollarSign, Edit, Save, X, Plug, Key, Mail, Database, CheckCircle, AlertCircle, Home, MessageSquare, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "standard"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function AdminDashboard() {
  // All hooks must be called in the same order every render
  const { user, logout, isLoading } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editData, setEditData] = useState<Partial<AdminUser>>({});
  const [changingPasswordUser, setChangingPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showAirtableConfig, setShowAirtableConfig] = useState(false);
  const [airtableToken, setAirtableToken] = useState("");
  const [airtableBaseId, setAirtableBaseId] = useState("");
  const [isTestingAirtable, setIsTestingAirtable] = useState(false);
  const [airtableTables, setAirtableTables] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Always call useForm hook
  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "standard",
      password: "",
    },
  });

  // Always get sessionId
  const sessionId = localStorage.getItem("admin_session");

  // Always call useQuery hooks - use enabled to control execution
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () =>
      apiRequest("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    enabled: !!user && user.role === "admin" && !!sessionId,
  });

  const { data: airtableStatus } = useQuery({
    queryKey: ["/api/integrations/airtable/status"],
    queryFn: () =>
      apiRequest("/api/integrations/airtable/status", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    enabled: !!user && user.role === "admin" && !!sessionId,
  });

  const { data: quoteRequests = [] } = useQuery({
    queryKey: ["/api/custom-quotes"],
    queryFn: () =>
      apiRequest("/api/custom-quotes", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    enabled: !!user && !!sessionId,
  });

  const { data: configurations = [] } = useQuery({
    queryKey: ["/api/admin/configurations"],
    queryFn: () =>
      apiRequest("/api/admin/configurations", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    enabled: !!user && user.role === "admin" && !!sessionId,
  });

  // Always call useMutation hooks
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserForm) =>
      apiRequest("/api/admin/users", {
        method: "POST",
        body: userData,
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreateUser(false);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<AdminUser> & { id: number }) =>
      apiRequest(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
        },
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setEditingUser(null);
      setEditData({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) =>
      apiRequest(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: { password },
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setChangingPasswordUser(null);
      setNewPassword("");
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Effect for redirection
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/admin/login");
    }
  }, [isLoading, user, setLocation]);

  // Handler functions
  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  const onCreateUser = async (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  const handleDeactivateUser = (userId: number) => {
    if (confirm("Are you sure you want to deactivate this user?")) {
      deactivateUserMutation.mutate(userId);
    }
  };

  const handleUpdateUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        ...editData,
      });
    }
  };

  const handleImportFromAirtable = async () => {
    if (!selectedTable) {
      toast({
        title: "Error",
        description: "Please select a table to import from",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const response = await apiRequest("/api/integrations/airtable/import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
        },
        body: {
          tableName: selectedTable,
        },
      });

      toast({
        title: "Import Successful",
        description: response.message,
      });
      
      setShowImportDialog(false);
      setSelectedTable("");
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      queryClient.invalidateQueries({ queryKey: ["/api/options"] });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Unable to import data from Airtable",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportToAirtable = async (dataType: 'models' | 'options') => {
    setIsExporting(true);
    try {
      const response = await apiRequest("/api/integrations/airtable/export", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
        },
        body: {
          dataType,
        },
      });

      toast({
        title: "Export Successful",
        description: response.message,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export data to Airtable",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleTestAirtableConnection = async () => {
    if (!airtableToken || !airtableBaseId) {
      toast({
        title: "Error",
        description: "Please provide both Access Token and Base ID",
        variant: "destructive",
      });
      return;
    }

    setIsTestingAirtable(true);
    try {
      const response = await apiRequest("/api/integrations/airtable/test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
        },
        body: {
          accessToken: airtableToken,
          baseId: airtableBaseId,
        },
      });

      if (response.success) {
        toast({
          title: "Success",
          description: `Connected to Airtable! Found ${response.tableCount} tables.`,
        });
        
        // Store the tables for import dialog
        setAirtableTables(response.tables || []);
        
        // Save the configuration
        await apiRequest("/api/integrations/airtable/save", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionId}`,
            "Content-Type": "application/json",
          },
          body: {
            accessToken: airtableToken,
            baseId: airtableBaseId,
          },
        });
        
        setShowAirtableConfig(false);
        queryClient.invalidateQueries({ queryKey: ["/api/integrations/airtable/status"] });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Airtable. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsTestingAirtable(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, return null (redirect happens in useEffect)
  if (!user) {
    return null;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Walton Trailers Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user.firstName || user.username}
                <Badge variant={user.role === "admin" ? "default" : "secondary"} className="ml-2">
                  {user.role}
                </Badge>
              </div>
              <Link href="/">
                <Button variant="ghost" size="sm" title="View Site">
                  <Home className="w-4 h-4 mr-2" />
                  View Site
                </Button>
              </Link>
              <Link href="/admin/account">
                <Button variant="ghost" size="sm" title="Employees">
                  <Users className="w-4 h-4 mr-2" />
                  Employees
                </Button>
              </Link>
              <Link href="/admin/dealers">
                <Button variant="ghost" size="sm" title="Dealers">
                  <Building2 className="w-4 h-4 mr-2" />
                  Dealers
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Manage Walton Trailers administration</p>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">Product Management</TabsTrigger>
            {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="integrations">Integrations</TabsTrigger>}
            <TabsTrigger value="quotes">Custom Requests</TabsTrigger>
            {isAdmin && <TabsTrigger value="configurations">Configurations</TabsTrigger>}
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Product Management
                  </CardTitle>
                  <CardDescription>
                    Update trailer and option pricing & details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-gray-600 mb-4">
                    <p>• Edit trailer categories and descriptions</p>
                    <p>• Manage trailer models and specifications</p>
                    <p>• Upload and manage trailer images</p>
                  </div>
                  <Link href="/admin/pricing">
                    <Button>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Update Products Catalog
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quotes" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">Custom Requests</h3>
                <p className="text-sm text-gray-600">Manage custom trailer requests from customers</p>
              </div>
              <Badge variant="outline" className="px-3 py-1">
                {quoteRequests.length} Total Requests
              </Badge>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requirements</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(quoteRequests as any[]).map((quote: any) => (
                        <tr key={quote.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {quote.firstName} {quote.lastName}
                            </div>
                            {quote.company && (
                              <div className="text-xs text-gray-500">{quote.company}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              <a href={`mailto:${quote.email}`} className="text-blue-600 hover:underline">
                                {quote.email}
                              </a>
                            </div>
                            <div className="text-xs text-gray-500">
                              <a href={`tel:${quote.phone}`} className="hover:underline">
                                {quote.phone}
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {quote.city}, {quote.state} {quote.zipCode}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={quote.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                  await apiRequest(`/api/custom-quotes/${quote.id}`, {
                                    method: "PATCH",
                                    body: { status: newStatus },
                                    headers: {
                                      Authorization: `Bearer ${sessionId}`,
                                    },
                                  });
                                  queryClient.invalidateQueries({ queryKey: ["/api/custom-quotes"] });
                                  toast({
                                    title: "Status Updated",
                                    description: `Quote status changed to ${newStatus}`,
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to update status",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className={`px-2 py-1 text-xs font-medium rounded-md border ${
                                quote.status === "pending" ? "bg-yellow-50 border-yellow-300 text-yellow-700" :
                                quote.status === "contacted" ? "bg-blue-50 border-blue-300 text-blue-700" :
                                quote.status === "quoted" ? "bg-purple-50 border-purple-300 text-purple-700" :
                                "bg-gray-50 border-gray-300 text-gray-700"
                              }`}
                            >
                              <option value="pending">Pending</option>
                              <option value="contacted">Contacted</option>
                              <option value="quoted">Quoted</option>
                              <option value="closed">Closed</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="text-sm text-gray-900 truncate" title={quote.requirements}>
                              {quote.requirements}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const details = `
Custom Quote Request

Name: ${quote.firstName} ${quote.lastName}
Email: ${quote.email}
Phone: ${quote.phone}
Company: ${quote.company || 'N/A'}
Location: ${quote.city}, ${quote.state} ${quote.zipCode}

Requirements:
${quote.requirements}

Submitted: ${new Date(quote.createdAt).toLocaleString()}
Status: ${quote.status}
${quote.notes ? `\nAdmin Notes: ${quote.notes}` : ''}`;
                                alert(details);
                              }}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {quoteRequests.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No quote requests yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">User Management</h3>
                  <p className="text-sm text-gray-600">Create and manage admin users</p>
                </div>
                
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new admin user to the system
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={form.handleSubmit(onCreateUser)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            {...form.register("username")}
                            placeholder="Enter username"
                          />
                          {form.formState.errors.username && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.username.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            {...form.register("email")}
                            placeholder="Enter email"
                          />
                          {form.formState.errors.email && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            {...form.register("firstName")}
                            placeholder="Optional"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            {...form.register("lastName")}
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select 
                          value={form.watch("role")} 
                          onValueChange={(value: "admin" | "standard") => form.setValue("role", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard User</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          {...form.register("password")}
                          placeholder="Enter password"
                        />
                        {form.formState.errors.password && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowCreateUser(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createUserMutation.isPending}
                        >
                          {createUserMutation.isPending ? "Creating..." : "Create User"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  {usersLoading ? (
                    <div className="p-6 text-center">Loading users...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(users as AdminUser[])?.map((adminUser: AdminUser) => (
                            <tr key={adminUser.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingUser?.id === adminUser.id ? (
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="First Name"
                                      value={editData.firstName ?? adminUser.firstName ?? ""}
                                      onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                      className="w-24 h-8 text-sm"
                                    />
                                    <Input
                                      placeholder="Last Name"
                                      value={editData.lastName ?? adminUser.lastName ?? ""}
                                      onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                                      className="w-24 h-8 text-sm"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-sm font-medium text-gray-900">
                                    {adminUser.firstName && adminUser.lastName
                                      ? `${adminUser.firstName} ${adminUser.lastName}`
                                      : "-"
                                    }
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingUser?.id === adminUser.id ? (
                                  <Input
                                    placeholder="Username"
                                    value={editData.username ?? adminUser.username}
                                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                    className="w-32 h-8 text-sm"
                                  />
                                ) : (
                                  <div className="text-sm text-gray-900">{adminUser.username}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingUser?.id === adminUser.id ? (
                                  <Input
                                    placeholder="Email"
                                    type="email"
                                    value={editData.email ?? adminUser.email}
                                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                    className="w-48 h-8 text-sm"
                                  />
                                ) : (
                                  <div className="text-sm text-gray-900">{adminUser.email}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingUser?.id === adminUser.id && adminUser.id !== user.id ? (
                                  <Select
                                    value={editData.role ?? adminUser.role}
                                    onValueChange={(value) => setEditData({ ...editData, role: value })}
                                  >
                                    <SelectTrigger className="w-28 h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant={adminUser.role === "admin" ? "default" : "secondary"}>
                                    {adminUser.role}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant={adminUser.isActive ? "outline" : "destructive"}>
                                  {adminUser.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(adminUser.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {editingUser?.id === adminUser.id ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={handleUpdateUser}
                                        disabled={updateUserMutation.isPending}
                                        className="h-8"
                                      >
                                        <Save className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingUser(null);
                                          setEditData({});
                                        }}
                                        className="h-8"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditingUser(adminUser);
                                          setEditData({});
                                        }}
                                        className="h-8"
                                        title="Edit"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setChangingPasswordUser(adminUser);
                                          setNewPassword("");
                                        }}
                                        className="h-8 text-blue-600 border-blue-300 hover:bg-blue-50"
                                        title="Change Password"
                                      >
                                        <Key className="w-4 h-4" />
                                      </Button>
                                      
                                      {adminUser.isActive && adminUser.id !== user.id && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeactivateUser(adminUser.id)}
                                          disabled={deactivateUserMutation.isPending}
                                          className="h-8"
                                        >
                                          Deactivate
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Password Change Dialog */}
              <Dialog open={!!changingPasswordUser} onOpenChange={(open) => !open && setChangingPasswordUser(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                      Change password for {changingPasswordUser?.firstName} {changingPasswordUser?.lastName} ({changingPasswordUser?.username})
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (minimum 8 characters)"
                      />
                      {newPassword && newPassword.length < 8 && (
                        <p className="text-sm text-red-600">
                          Password must be at least 8 characters
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setChangingPasswordUser(null);
                        setNewPassword("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (changingPasswordUser && newPassword.length >= 8) {
                          changePasswordMutation.mutate({
                            userId: changingPasswordUser.id,
                            password: newPassword
                          });
                        }
                      }}
                      disabled={!newPassword || newPassword.length < 8 || changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="integrations" className="space-y-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium">Integrations</h3>
                <p className="text-sm text-gray-600">Manage API connections and third-party services</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Airtable Integration Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Database className="w-5 h-5 mr-2" />
                      Airtable Integration
                    </CardTitle>
                    <CardDescription>
                      Sync trailer data with Airtable bases
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">Airtable Sync</h4>
                            <p className="text-sm text-gray-600">Connect your Airtable base to sync data</p>
                          </div>
                          <Badge variant={airtableStatus?.connected ? "default" : "outline"}>
                            {airtableStatus?.connected ? (
                              <><CheckCircle className="w-3 h-3 mr-1" /> Connected</>
                            ) : (
                              "Not connected"
                            )}
                          </Badge>
                        </div>
                        
                        <Dialog open={showAirtableConfig} onOpenChange={setShowAirtableConfig}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              Configure Connection
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Configure Airtable Connection</DialogTitle>
                              <DialogDescription>
                                Connect your Airtable base using a Personal Access Token
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="airtable-token">Personal Access Token</Label>
                                <Input
                                  id="airtable-token"
                                  type="password"
                                  placeholder="pat..."
                                  value={airtableToken}
                                  onChange={(e) => setAirtableToken(e.target.value)}
                                />
                                <p className="text-xs text-gray-500">
                                  Get your token from{" "}
                                  <a 
                                    href="https://airtable.com/create/tokens" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Airtable Developer Hub
                                  </a>
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="airtable-base">Base ID</Label>
                                <Input
                                  id="airtable-base"
                                  placeholder="app..."
                                  value={airtableBaseId}
                                  onChange={(e) => setAirtableBaseId(e.target.value)}
                                />
                                <p className="text-xs text-gray-500">
                                  Find your Base ID in Airtable URL or API documentation
                                </p>
                              </div>
                              
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <p className="text-sm text-yellow-800">
                                  <strong>Required Permissions:</strong>
                                  <br />• data.records:read
                                  <br />• data.records:write
                                  <br />• schema.bases:read
                                </p>
                              </div>
                              
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setShowAirtableConfig(false);
                                    setAirtableToken("");
                                    setAirtableBaseId("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleTestAirtableConnection}
                                  disabled={isTestingAirtable || !airtableToken || !airtableBaseId}
                                >
                                  {isTestingAirtable ? "Testing..." : "Test & Save"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                      
                      <div className="border-t pt-4">
                        <h4 className="text-sm font-medium mb-2">Sync Options</h4>
                        <div className="space-y-2">
                          <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                className="w-full" 
                                variant="outline" 
                                disabled={!airtableStatus?.connected}
                              >
                                <Database className="w-4 h-4 mr-2" />
                                Import from Airtable
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Import from Airtable</DialogTitle>
                                <DialogDescription>
                                  Select a table to import data from
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Select Table</Label>
                                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a table..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {airtableTables.map((table) => (
                                        <SelectItem key={table.id} value={table.name}>
                                          {table.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setShowImportDialog(false);
                                      setSelectedTable("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    onClick={handleImportFromAirtable}
                                    disabled={!selectedTable || isImporting}
                                  >
                                    {isImporting ? "Importing..." : "Import"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1" 
                              variant="outline" 
                              disabled={!airtableStatus?.connected || isExporting}
                              onClick={() => handleExportToAirtable('models')}
                            >
                              <Database className="w-4 h-4 mr-2" />
                              Export Models
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1" 
                              variant="outline" 
                              disabled={!airtableStatus?.connected || isExporting}
                              onClick={() => handleExportToAirtable('options')}
                            >
                              <Database className="w-4 h-4 mr-2" />
                              Export Options
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Mail className="w-5 h-5 mr-2" />
                      Email Settings
                    </CardTitle>
                    <CardDescription>
                      Configure email service and templates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>From Email</Label>
                        <Input 
                          placeholder="noreply@waltontrailers.com"
                          defaultValue="admin@waltontrailers.com"
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reply-To Email</Label>
                        <Input 
                          placeholder="sales@waltontrailers.com"
                          defaultValue="sales@waltontrailers.com"
                          disabled
                        />
                      </div>
                      <Button size="sm">Update Settings</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="configurations" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Saved Configurations</h3>
                  <p className="text-sm text-gray-600">View all trailer configurations from dealers and public users</p>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  {(configurations as any[]).length} Total Configurations
                </Badge>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dealer/User</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(configurations as any[]).length > 0 ? (
                          (configurations as any[]).map((config: any) => (
                            <tr key={`${config.type}-${config.id}`} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {new Date(config.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <Badge 
                                  variant={config.type === 'dealer' ? 'default' : 'secondary'}
                                  className={config.type === 'dealer' ? 'bg-blue-100 text-blue-800' : ''}
                                >
                                  {config.source}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                {config.type === 'dealer' ? (
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {config.dealerName || 'N/A'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      ID: {config.dealerId}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500">
                                    Session: {config.sessionId?.substring(0, 8)}...
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {config.customerName ? (
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {config.customerName}
                                    </div>
                                    {config.customerEmail && (
                                      <div className="text-xs text-gray-500">{config.customerEmail}</div>
                                    )}
                                    {config.customerPhone && (
                                      <div className="text-xs text-gray-500">{config.customerPhone}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {config.categoryName || config.categorySlug || 'N/A'}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {config.modelName || `Model ${config.modelId}`}
                                </div>
                                {config.variantId && (
                                  <div className="text-xs text-gray-500">
                                    Variant: {config.variantId}
                                  </div>
                                )}
                                {config.orderNumber && (
                                  <div className="text-xs text-gray-500">
                                    Order: {config.orderNumber}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                ${(config.totalPrice || 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <Badge 
                                  variant={
                                    config.status === 'completed' ? 'default' : 
                                    config.status === 'submitted' ? 'secondary' :
                                    config.status === 'processing' ? 'outline' :
                                    'secondary'
                                  }
                                >
                                  {config.status || 'saved'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // TODO: Implement view details dialog
                                    console.log('View details for:', config);
                                  }}
                                >
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="text-center py-8 text-gray-500">
                              No configurations saved yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}