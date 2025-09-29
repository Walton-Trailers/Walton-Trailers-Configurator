import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, Users, Settings, Plus, DollarSign, Edit, Save, X, Plug, Key, Mail, Database, CheckCircle, AlertCircle, Home, MessageSquare, Building2, Search } from "lucide-react";
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
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<any>(null);
  const [showQuoteDetailModal, setShowQuoteDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedConfiguration, setSelectedConfiguration] = useState<any>(null);
  const [showConfigDetailModal, setShowConfigDetailModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
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

  const { data: configQuoteRequests = [] } = useQuery({
    queryKey: ["/api/quotes"],
    queryFn: () =>
      apiRequest("/api/quotes", {
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

  const deleteQuoteRequestMutation = useMutation({
    mutationFn: (quoteId: number) =>
      apiRequest(`/api/quotes/${quoteId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      setShowQuoteDetailModal(false);
      setShowDeleteConfirm(false);
      setSelectedQuoteRequest(null);
      toast({
        title: "Success",
        description: "Quote request deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete quote request",
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
              <Link href="/admin/email-settings">
                <Button variant="ghost" size="sm" title="Email Settings">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Settings
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
            <TabsTrigger value="custom-quotes">Custom Requests</TabsTrigger>
            {isAdmin && <TabsTrigger value="configurations">Dealer Configurations</TabsTrigger>}
            {isAdmin && <TabsTrigger value="quote-requests">Quote Requests</TabsTrigger>}
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

          <TabsContent value="custom-quotes" className="space-y-6">
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
                <div className="flex-1">
                  <h3 className="text-lg font-medium">User Management</h3>
                  <p className="text-sm text-gray-600">Create and manage admin users</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
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
                          {(users as AdminUser[])?.filter((adminUser: AdminUser) => {
                            if (!userSearchTerm) return true;
                            const searchLower = userSearchTerm.toLowerCase();
                            return (
                              adminUser.username.toLowerCase().includes(searchLower) ||
                              adminUser.email.toLowerCase().includes(searchLower) ||
                              (adminUser.firstName && adminUser.firstName.toLowerCase().includes(searchLower)) ||
                              (adminUser.lastName && adminUser.lastName.toLowerCase().includes(searchLower)) ||
                              adminUser.role.toLowerCase().includes(searchLower)
                            );
                          }).map((adminUser: AdminUser) => (
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

              <div className="flex items-center justify-center py-16">
                <div className="text-center max-w-md">
                  <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <Database className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
                  <p className="text-gray-600">
                    Integration features are currently under development and will be available in a future update.
                  </p>
                </div>
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
                                    setSelectedConfiguration(config);
                                    setShowConfigDetailModal(true);
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

          {/* Quote Requests Tab */}
          {isAdmin && (
            <TabsContent value="quote-requests" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">Quote Requests</h3>
                  <p className="text-sm text-gray-600">Manage quote requests from the configurator</p>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant="secondary">
                    {configQuoteRequests.length} Total Requests
                  </Badge>
                </div>
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {configQuoteRequests.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Customer</th>
                              <th className="text-left p-2">Contact</th>
                              <th className="text-left p-2">Configuration</th>
                              <th className="text-left p-2">Price</th>
                              <th className="text-left p-2">Status</th>
                              <th className="text-left p-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {configQuoteRequests.map((request: any) => (
                              <tr key={request.id} className="border-b hover:bg-gray-50">
                                <td className="p-2">
                                  {new Date(request.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-2">
                                  <div>
                                    <div className="font-medium">
                                      {request.firstName} {request.lastName}
                                    </div>
                                    {request.company && (
                                      <div className="text-xs text-gray-500">{request.company}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-xs">
                                    <div>{request.email}</div>
                                    <div>{request.mobile}</div>
                                    <div>{request.zipCode}</div>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <div className="text-xs">
                                    <div className="font-medium">{request.modelName}</div>
                                    <div className="text-gray-500">{request.categoryName}</div>
                                    {request.trailerSpecs && (
                                      <div className="text-gray-400 text-xs">
                                        GVWR: {request.trailerSpecs.gvwr} | {request.trailerSpecs.deckSize}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2">
                                  {request.totalPrice ? (
                                    <div className="font-medium">
                                      ${request.totalPrice.toLocaleString()}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </td>
                                <td className="p-2">
                                  <Badge
                                    variant={
                                      request.status === "pending"
                                        ? "secondary"
                                        : request.status === "contacted"
                                        ? "default"
                                        : request.status === "quoted"
                                        ? "outline"
                                        : "destructive"
                                    }
                                  >
                                    {request.status}
                                  </Badge>
                                </td>
                                <td className="p-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedQuoteRequest(request);
                                      setShowQuoteDetailModal(true);
                                    }}
                                  >
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No quote requests yet</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Quote requests from the configurator will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Quote Request Detail Modal */}
      <Dialog open={showQuoteDetailModal} onOpenChange={setShowQuoteDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Quote Request Details</DialogTitle>
                <DialogDescription>
                  Complete information for quote request #{selectedQuoteRequest?.id}
                </DialogDescription>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="ml-4"
              >
                Delete Quote
              </Button>
            </div>
          </DialogHeader>
          
          {selectedQuoteRequest && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Name</Label>
                    <p className="text-sm">
                      {selectedQuoteRequest.firstName} {selectedQuoteRequest.lastName}
                    </p>
                  </div>
                  {selectedQuoteRequest.company && (
                    <div>
                      <Label className="font-medium">Company</Label>
                      <p className="text-sm">{selectedQuoteRequest.company}</p>
                    </div>
                  )}
                  <div>
                    <Label className="font-medium">Email</Label>
                    <p className="text-sm">
                      <a href={`mailto:${selectedQuoteRequest.email}`} className="text-blue-600 hover:underline">
                        {selectedQuoteRequest.email}
                      </a>
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Mobile</Label>
                    <p className="text-sm">
                      <a href={`tel:${selectedQuoteRequest.mobile}`} className="text-blue-600 hover:underline">
                        {selectedQuoteRequest.mobile}
                      </a>
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Zip Code</Label>
                    <p className="text-sm">{selectedQuoteRequest.zipCode}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Request Date</Label>
                    <p className="text-sm">
                      {new Date(selectedQuoteRequest.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Configuration Details */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Configuration Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedQuoteRequest.categoryName && (
                    <div>
                      <Label className="font-medium">Category</Label>
                      <p className="text-sm">{selectedQuoteRequest.categoryName}</p>
                    </div>
                  )}
                  {selectedQuoteRequest.modelName && (
                    <div>
                      <Label className="font-medium">Model</Label>
                      <p className="text-sm">{selectedQuoteRequest.modelName}</p>
                    </div>
                  )}
                  {selectedQuoteRequest.totalPrice && (
                    <div>
                      <Label className="font-medium">Total Price</Label>
                      <p className="text-sm font-semibold text-green-600">
                        ${selectedQuoteRequest.totalPrice.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Trailer Specifications */}
                {selectedQuoteRequest.trailerSpecs && (
                  <div className="mt-4">
                    <Label className="font-medium">Trailer Specifications</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {selectedQuoteRequest.trailerSpecs.gvwr && (
                        <div className="bg-white p-2 rounded border">
                          <div className="text-xs text-gray-500">GVWR</div>
                          <div className="text-sm font-medium">{selectedQuoteRequest.trailerSpecs.gvwr}</div>
                        </div>
                      )}
                      {selectedQuoteRequest.trailerSpecs.payload && (
                        <div className="bg-white p-2 rounded border">
                          <div className="text-xs text-gray-500">Payload</div>
                          <div className="text-sm font-medium">{selectedQuoteRequest.trailerSpecs.payload}</div>
                        </div>
                      )}
                      {selectedQuoteRequest.trailerSpecs.deckSize && (
                        <div className="bg-white p-2 rounded border">
                          <div className="text-xs text-gray-500">Deck Size</div>
                          <div className="text-sm font-medium">{selectedQuoteRequest.trailerSpecs.deckSize}</div>
                        </div>
                      )}
                      {selectedQuoteRequest.trailerSpecs.axles && (
                        <div className="bg-white p-2 rounded border">
                          <div className="text-xs text-gray-500">Axles</div>
                          <div className="text-sm font-medium">{selectedQuoteRequest.trailerSpecs.axles}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Selected Options */}
                {selectedQuoteRequest.selectedOptions && Object.keys(selectedQuoteRequest.selectedOptions).length > 0 && (
                  <div className="mt-4">
                    <Label className="font-medium">Selected Options</Label>
                    <div className="bg-white p-3 rounded border mt-2">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedQuoteRequest.selectedOptions, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
                <div className="space-y-3">
                  {selectedQuoteRequest.comments && (
                    <div>
                      <Label className="font-medium">Customer Comments</Label>
                      <p className="text-sm bg-white p-3 rounded border mt-1">
                        {selectedQuoteRequest.comments}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Email Marketing Opt-in</Label>
                      <p className="text-sm">
                        <Badge variant={selectedQuoteRequest.optIn ? "default" : "secondary"}>
                          {selectedQuoteRequest.optIn ? "Yes" : "No"}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <Label className="font-medium">Age Verification</Label>
                      <p className="text-sm">
                        <Badge variant={selectedQuoteRequest.ageVerification ? "default" : "destructive"}>
                          {selectedQuoteRequest.ageVerification ? "Verified" : "Not Verified"}
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Information */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Admin Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Status</Label>
                    <p className="text-sm">
                      <Badge
                        variant={
                          selectedQuoteRequest.status === "pending"
                            ? "secondary"
                            : selectedQuoteRequest.status === "contacted"
                            ? "default"
                            : selectedQuoteRequest.status === "quoted"
                            ? "outline"
                            : "destructive"
                        }
                      >
                        {selectedQuoteRequest.status}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Last Updated</Label>
                    <p className="text-sm">
                      {selectedQuoteRequest.updatedAt ? 
                        new Date(selectedQuoteRequest.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'
                      }
                    </p>
                  </div>
                </div>
                {selectedQuoteRequest.notes && (
                  <div className="mt-3">
                    <Label className="font-medium">Admin Notes</Label>
                    <p className="text-sm bg-white p-3 rounded border mt-1">
                      {selectedQuoteRequest.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Configuration Detail Modal */}
      <Dialog open={showConfigDetailModal} onOpenChange={setShowConfigDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedConfiguration?.type === 'dealer' ? 'dealer' : 'public'} configuration #{selectedConfiguration?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedConfiguration && (
            <div className="space-y-6">
              {/* Configuration Source Information */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Configuration Source</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Source Type</Label>
                    <p className="text-sm">
                      <Badge variant={selectedConfiguration.type === 'dealer' ? 'default' : 'secondary'}>
                        {selectedConfiguration.source}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Configuration ID</Label>
                    <p className="text-sm">{selectedConfiguration.id}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Created Date</Label>
                    <p className="text-sm">
                      {new Date(selectedConfiguration.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {selectedConfiguration.type === 'dealer' && selectedConfiguration.orderNumber && (
                    <div>
                      <Label className="font-medium">Order Number</Label>
                      <p className="text-sm font-mono">{selectedConfiguration.orderNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer/User Information */}
              {selectedConfiguration.type === 'dealer' ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Dealer & Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Dealer</Label>
                      <p className="text-sm">{selectedConfiguration.dealerName || 'N/A'}</p>
                      <p className="text-xs text-gray-500">ID: {selectedConfiguration.dealerId}</p>
                    </div>
                    {selectedConfiguration.customerName && (
                      <div>
                        <Label className="font-medium">Customer Name</Label>
                        <p className="text-sm">{selectedConfiguration.customerName}</p>
                      </div>
                    )}
                    {selectedConfiguration.customerEmail && (
                      <div>
                        <Label className="font-medium">Customer Email</Label>
                        <p className="text-sm">
                          <a href={`mailto:${selectedConfiguration.customerEmail}`} className="text-blue-600 hover:underline">
                            {selectedConfiguration.customerEmail}
                          </a>
                        </p>
                      </div>
                    )}
                    {selectedConfiguration.customerPhone && (
                      <div>
                        <Label className="font-medium">Customer Phone</Label>
                        <p className="text-sm">
                          <a href={`tel:${selectedConfiguration.customerPhone}`} className="text-blue-600 hover:underline">
                            {selectedConfiguration.customerPhone}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Public User Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Session ID</Label>
                      <p className="text-sm font-mono">{selectedConfiguration.sessionId}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Trailer Configuration Details */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Trailer Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Category</Label>
                    <p className="text-sm">{selectedConfiguration.categoryName || selectedConfiguration.categorySlug || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Model</Label>
                    <p className="text-sm">{selectedConfiguration.modelName || `Model ${selectedConfiguration.modelId}`}</p>
                  </div>
                  {selectedConfiguration.variantId && (
                    <div>
                      <Label className="font-medium">Variant ID</Label>
                      <p className="text-sm">{selectedConfiguration.variantId}</p>
                    </div>
                  )}
                  <div>
                    <Label className="font-medium">Total Price</Label>
                    <p className="text-sm font-semibold text-green-600">
                      ${(selectedConfiguration.totalPrice || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Selected Options */}
                {selectedConfiguration.selectedOptions && Object.keys(selectedConfiguration.selectedOptions).length > 0 && (
                  <div className="mt-4">
                    <Label className="font-medium">Selected Options</Label>
                    <div className="bg-white p-3 rounded border mt-2 max-h-40 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedConfiguration.selectedOptions, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Status and Notes (for dealer configurations) */}
              {selectedConfiguration.type === 'dealer' && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3">Status & Notes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Status</Label>
                      <p className="text-sm">
                        <Badge
                          variant={
                            selectedConfiguration.status === 'completed' ? 'default' : 
                            selectedConfiguration.status === 'submitted' ? 'secondary' :
                            selectedConfiguration.status === 'processing' ? 'outline' :
                            'secondary'
                          }
                        >
                          {selectedConfiguration.status || 'saved'}
                        </Badge>
                      </p>
                    </div>
                  </div>
                  {selectedConfiguration.notes && (
                    <div className="mt-3">
                      <Label className="font-medium">Notes</Label>
                      <p className="text-sm bg-white p-3 rounded border mt-1">
                        {selectedConfiguration.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Quote Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this quote request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleteQuoteRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedQuoteRequest) {
                  deleteQuoteRequestMutation.mutate(selectedQuoteRequest.id);
                }
              }}
              disabled={deleteQuoteRequestMutation.isPending}
            >
              {deleteQuoteRequestMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}