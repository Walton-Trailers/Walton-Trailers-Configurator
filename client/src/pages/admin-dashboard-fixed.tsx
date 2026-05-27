import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, Users, Settings, Plus, DollarSign, Edit, Save, X, CheckCircle, Home, MessageSquare, Building2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminOrderManageDialog } from "@/components/admin-order-manage-dialog";
import { AdminReservationsPanel } from "@/components/admin-reservations-panel";
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
  username?: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

const createUserSchema = z.object({
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
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<any>(null);
  const [showQuoteDetailModal, setShowQuoteDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedConfiguration, setSelectedConfiguration] = useState<any>(null);
  const [showConfigDetailModal, setShowConfigDetailModal] = useState(false);
  // Rep-side order management dialog. Separate from the read-only View
  // modal — opens via the "Manage" button on dealer rows.
  const [managingOrder, setManagingOrder] = useState<any>(null);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [configurationSearchTerm, setConfigurationSearchTerm] = useState("");
  // Filter the configurations table by lifecycle status. 'all' shows
  // everything (including public configurations which carry status='saved'
  // or no status). The other values map to the dealer_orders.status values.
  const [configurationStatusFilter, setConfigurationStatusFilter] = useState<'all' | 'draft' | 'submitted' | 'received' | 'processing' | 'completed'>('all');
  // Dealer dropdown filter. 'all' is the passthrough; otherwise we match
  // against config.dealerName (joined onto the configurations payload).
  const [configurationDealerFilter, setConfigurationDealerFilter] = useState<string>('all');
  const [quoteRequestSearchTerm, setQuoteRequestSearchTerm] = useState("");
  // Default tab depends on role. Standard users no longer see Product
  // Management, so land them on Dealer Configurations (their day-to-day
  // surface). Admins start on Product Management as before.
  const [activeTab, setActiveTab] = useState<string>("products");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Always call useForm hook
  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
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

  const { data: allOptions = [] } = useQuery({
    queryKey: ["/api/options/all"],
    queryFn: () => apiRequest("/api/options/all", {
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

  // User edit / password / deactivate mutations moved to /admin/employees/:id —
  // the User Management table here is read-only and clicks navigate to the
  // detail page.

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

  // Standard users don't see Product Management; if they landed on it
  // (the default initial tab) snap them to Dealer Configurations once
  // we know their role. Admin keeps the existing default.
  useEffect(() => {
    if (user && user.role !== "admin" && activeTab === "products") {
      setActiveTab("configurations");
    }
  }, [user, activeTab]);

  // Handler functions
  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  const onCreateUser = async (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  // Helper function to render selected options in readable format
  const renderSelectedOptions = (selectedOptions: Record<string, any>) => {
    if (!selectedOptions || Object.keys(selectedOptions).length === 0) {
      return <p className="text-sm text-gray-500">No options selected</p>;
    }

    const optionsArray = allOptions as any[];
    
    // If options aren't loaded yet, show a loading message
    if (!optionsArray || optionsArray.length === 0) {
      return (
        <div className="bg-white p-3 rounded border">
          <p className="text-sm text-gray-500">Loading options data...</p>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap mt-2">
            {JSON.stringify(selectedOptions, null, 2)}
          </pre>
        </div>
      );
    }

    const optionsMap = new Map(optionsArray.map((opt: any) => [opt.id, opt]));
    const renderedItems: JSX.Element[] = [];

    Object.entries(selectedOptions).map(([category, value]) => {
      if (category === 'extras' && Array.isArray(value)) {
        // Handle extras (multi-select)
        const extraOptions = value
          .map((id: number) => optionsMap.get(id))
          .filter(Boolean);
        
        if (extraOptions.length > 0) {
          renderedItems.push(
            <div key={category} className="bg-white p-3 rounded border">
              <h4 className="font-semibold text-sm mb-2 text-gray-700">Extras:</h4>
              <ul className="space-y-1">
                {extraOptions.map((option: any) => (
                  <li key={option.id} className="text-sm flex justify-between">
                    <span>• {option.name}</span>
                    <span className="text-gray-600">${option.price.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        }
      } else if (typeof value === 'number') {
        // Handle single-select options (color, tires, ramps, etc.)
        const option = optionsMap.get(value);
        if (option) {
          renderedItems.push(
            <div key={category} className="bg-white p-3 rounded border">
              <h4 className="font-semibold text-sm mb-1 text-gray-700 capitalize">
                {category.replace(/([A-Z])/g, ' $1').trim()}:
              </h4>
              <div className="text-sm flex justify-between">
                <span>{option.name}</span>
                <span className="text-gray-600">${option.price.toLocaleString()}</span>
              </div>
            </div>
          );
        }
      } else if (typeof value === 'string') {
        // Handle string values (like length, pulltype)
        renderedItems.push(
          <div key={category} className="bg-white p-3 rounded border">
            <h4 className="font-semibold text-sm mb-1 text-gray-700 capitalize">
              {category.replace(/([A-Z])/g, ' $1').trim()}:
            </h4>
            <div className="text-sm">{value}</div>
          </div>
        );
      }
    });

    if (renderedItems.length === 0) {
      return (
        <div className="bg-white p-3 rounded border">
          <p className="text-sm text-gray-500 mb-2">Unable to display options (options data not found)</p>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(selectedOptions, null, 2)}
          </pre>
        </div>
      );
    }

    return <div className="space-y-3">{renderedItems}</div>;
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
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* Welcome message - hidden on mobile, shown on desktop */}
              <div className="hidden md:block text-sm text-gray-600">
                Welcome, {user.firstName || user.email}
                <Badge variant={user.role === "admin" ? "default" : "secondary"} className="ml-2">
                  {user.role}
                </Badge>
              </div>
              
              {/* Navigation buttons - icon only on mobile, full text on desktop */}
              <Link href="/">
                <Button variant="ghost" size="sm" title="View Site" className="p-2 md:px-3">
                  <Home className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">View Site</span>
                </Button>
              </Link>
              <Link href="/admin/dealers">
                <Button variant="ghost" size="sm" title="Dealers" className="p-2 md:px-3">
                  <Building2 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Dealers</span>
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/admin/pricing-tiers">
                  <Button variant="ghost" size="sm" title="Pricing Tiers" className="p-2 md:px-3">
                    <DollarSign className="w-4 h-4 md:mr-2" />
                    <span className="hidden md:inline">Pricing Tiers</span>
                  </Button>
                </Link>
              )}
              <Button onClick={handleLogout} variant="outline" size="sm" title="Logout" className="p-2 md:px-3">
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile Dropdown Navigation */}
          <div className="md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {isAdmin && <SelectItem value="products">Product Management</SelectItem>}
                {isAdmin && <SelectItem value="users">User Management</SelectItem>}
                {/* Dealer Configurations and Reservations are visible to
                    standard users too — both endpoints filter rows by the
                    viewer's assigned dealers. */}
                <SelectItem value="configurations">Dealer Configurations</SelectItem>
                <SelectItem value="reservations">Reservations</SelectItem>
                {isAdmin && <SelectItem value="quote-requests">Quote Requests</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Tabs Navigation */}
          <TabsList className="hidden md:inline-flex">
            {isAdmin && <TabsTrigger value="products">Product Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            <TabsTrigger value="configurations">Dealer Configurations</TabsTrigger>
            <TabsTrigger value="reservations">Reservations</TabsTrigger>
            {isAdmin && <TabsTrigger value="quote-requests">Quote Requests</TabsTrigger>}
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Management</CardTitle>
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
                      Update Products Catalog
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
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
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            autoComplete="email"
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
                            {isAdmin && (
                              <SelectItem value="admin">Administrator</SelectItem>
                            )}
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(users as AdminUser[])?.filter((adminUser: AdminUser) => {
                            if (!userSearchTerm) return true;
                            const searchLower = userSearchTerm.toLowerCase();
                            return (
                              adminUser.email.toLowerCase().includes(searchLower) ||
                              (adminUser.firstName && adminUser.firstName.toLowerCase().includes(searchLower)) ||
                              (adminUser.lastName && adminUser.lastName.toLowerCase().includes(searchLower)) ||
                              adminUser.role.toLowerCase().includes(searchLower)
                            );
                          }).map((adminUser: AdminUser) => (
                            // Whole row is a navigation link to the per-employee
                            // detail page where edit / password / activate /
                            // dealer assignments all live now.
                            <tr
                              key={adminUser.id}
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => setLocation(`/admin/employees/${adminUser.id}`)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900 group">
                                  <span className="group-hover:text-blue-600 group-hover:underline">
                                    {adminUser.firstName && adminUser.lastName
                                      ? `${adminUser.firstName} ${adminUser.lastName}`
                                      : "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{adminUser.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant={adminUser.role === "admin" ? "default" : "secondary"}>
                                  {adminUser.role}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant={adminUser.isActive ? "outline" : "destructive"}>
                                  {adminUser.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(adminUser.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="configurations" className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">Saved Configurations</h3>
                  <p className="text-sm text-gray-600">View all trailer configurations from dealers and public users</p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search configurations..."
                      value={configurationSearchTerm}
                      onChange={(e) => setConfigurationSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>

                  <Badge variant="outline" className="px-3 py-1">
                    {(configurations as any[]).length} Total Configurations
                  </Badge>
                </div>
              </div>

              {/* Status filter chips + dealer dropdown. Counts on the chips
                  reflect the unfiltered configuration list so admins see
                  the lifecycle distribution at a glance. The dealer dropdown
                  is independent — it composes with the status filter. */}
              {(() => {
                const allConfigs = configurations as any[];
                const counts = {
                  all: allConfigs.length,
                  draft: allConfigs.filter((c) => c.status === 'draft').length,
                  submitted: allConfigs.filter((c) => c.status === 'submitted').length,
                  received: allConfigs.filter((c) => c.status === 'received').length,
                  processing: allConfigs.filter((c) => c.status === 'processing').length,
                  completed: allConfigs.filter((c) => c.status === 'completed').length,
                };
                const chips: Array<{ key: typeof configurationStatusFilter; label: string }> = [
                  { key: 'all', label: 'All' },
                  { key: 'draft', label: 'Quotes (draft)' },
                  { key: 'submitted', label: 'Submitted' },
                  { key: 'received', label: 'Received' },
                  { key: 'processing', label: 'Processing' },
                  { key: 'completed', label: 'Completed' },
                ];
                // Unique dealers across the configuration list (excludes
                // public configs which carry no dealerName). Sorted A→Z.
                const dealerNames = Array.from(
                  new Set(
                    allConfigs
                      .map((c) => c.dealerName)
                      .filter((n): n is string => !!n && n.trim().length > 0)
                  )
                ).sort((a, b) => a.localeCompare(b));
                return (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap gap-2">
                      {chips.map((chip) => {
                        const active = configurationStatusFilter === chip.key;
                        return (
                          <button
                            key={chip.key}
                            onClick={() => setConfigurationStatusFilter(chip.key)}
                            className={
                              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ' +
                              (active
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400')
                            }
                          >
                            {chip.label}
                            <span
                              className={
                                'inline-flex items-center justify-center min-w-[20px] px-1.5 rounded-full text-[10px] ' +
                                (active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600')
                              }
                            >
                              {counts[chip.key]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <label htmlFor="dealerFilter" className="text-xs text-gray-500 uppercase tracking-wider">
                        Dealer
                      </label>
                      <select
                        id="dealerFilter"
                        value={configurationDealerFilter}
                        onChange={(e) => setConfigurationDealerFilter(e.target.value)}
                        className="h-8 px-2 rounded border border-gray-200 bg-white text-xs"
                      >
                        <option value="all">All dealers</option>
                        {dealerNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })()}

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
                          (configurations as any[])
                            .filter((config: any) => {
                              // Status filter chip — 'all' is a passthrough.
                              if (configurationStatusFilter === 'all') return true;
                              return config.status === configurationStatusFilter;
                            })
                            .filter((config: any) => {
                              // Dealer dropdown filter — 'all' is a passthrough.
                              // Public configurations have no dealerName, so the
                              // moment a specific dealer is picked, public
                              // configs naturally drop out.
                              if (configurationDealerFilter === 'all') return true;
                              return config.dealerName === configurationDealerFilter;
                            })
                            .filter((config: any) => {
                            if (!configurationSearchTerm) return true;
                            const searchLower = configurationSearchTerm.toLowerCase();
                            return (
                              (config.dealerName && config.dealerName.toLowerCase().includes(searchLower)) ||
                              (config.customerName && config.customerName.toLowerCase().includes(searchLower)) ||
                              (config.customerEmail && config.customerEmail.toLowerCase().includes(searchLower)) ||
                              (config.categoryName && config.categoryName.toLowerCase().includes(searchLower)) ||
                              (config.categorySlug && config.categorySlug.toLowerCase().includes(searchLower)) ||
                              (config.modelName && config.modelName.toLowerCase().includes(searchLower)) ||
                              (config.orderNumber && config.orderNumber.toLowerCase().includes(searchLower)) ||
                              (config.status && config.status.toLowerCase().includes(searchLower)) ||
                              config.dealerId?.toString().includes(searchLower)
                            );
                          }).map((config: any) => (
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
                                {/* Show the Walton-assigned order # if the
                                    rep has set one. Internal ref is hidden
                                    from the admin table. */}
                                {config.repOrderNumber && (
                                  <div className="text-xs text-gray-500">
                                    Order #: {config.repOrderNumber}
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
                                <div className="flex gap-2">
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
                                  {/* Rep workflow — assign order #, change status,
                                      upload work-order PDF. Only on dealer-type
                                      rows since public configurations have no
                                      rep state to manage. */}
                                  {config.type === 'dealer' && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => {
                                        setManagingOrder(config);
                                        setShowManageDialog(true);
                                      }}
                                    >
                                      Manage
                                    </Button>
                                  )}
                                </div>
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

          {/* Reservations — inventory holds dealers requested via Reserve
              Now. RBAC-scoped server-side so standard users see only
              their assigned dealers. */}
          <TabsContent value="reservations" className="space-y-6">
            <AdminReservationsPanel />
          </TabsContent>

          {/* Quote Requests Tab */}
          {isAdmin && (
            <TabsContent value="quote-requests" className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">Quote Requests</h3>
                  <p className="text-sm text-gray-600">Manage quote requests from the configurator</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search quote requests..."
                      value={quoteRequestSearchTerm}
                      onChange={(e) => setQuoteRequestSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  
                  <Badge variant="secondary" className="px-3 py-1">
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
                            {configQuoteRequests.filter((request: any) => {
                              if (!quoteRequestSearchTerm) return true;
                              const searchLower = quoteRequestSearchTerm.toLowerCase();
                              return (
                                `${request.firstName} ${request.lastName}`.toLowerCase().includes(searchLower) ||
                                request.email.toLowerCase().includes(searchLower) ||
                                (request.company && request.company.toLowerCase().includes(searchLower)) ||
                                request.mobile.includes(searchLower) ||
                                request.zipCode.includes(searchLower) ||
                                (request.modelName && request.modelName.toLowerCase().includes(searchLower)) ||
                                (request.categoryName && request.categoryName.toLowerCase().includes(searchLower)) ||
                                request.status.toLowerCase().includes(searchLower)
                              );
                            }).map((request: any) => (
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
                    <Label className="font-medium mb-2 block">Selected Options</Label>
                    {renderSelectedOptions(selectedQuoteRequest.selectedOptions)}
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

      {/* Rep order management dialog. Opens from "Manage" on dealer rows.
          Lets the rep assign Walton's order #, change status, upload the
          work-order PDF, and add internal notes. */}
      <AdminOrderManageDialog
        open={showManageDialog}
        onOpenChange={(open) => { if (!open) setManagingOrder(null); setShowManageDialog(open); }}
        order={managingOrder}
      />

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
                  {selectedConfiguration.type === 'dealer' && (
                    <div>
                      <Label className="font-medium">Order Number</Label>
                      <p className="text-sm font-mono">
                        {selectedConfiguration.repOrderNumber || (
                          <span className="text-gray-400 italic">Pending assignment</span>
                        )}
                      </p>
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
                    <Label className="font-medium mb-2 block">Selected Options</Label>
                    <div className="max-h-60 overflow-y-auto">
                      {renderSelectedOptions(selectedConfiguration.selectedOptions)}
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