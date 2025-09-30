import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Plus, FileText, Edit, Trash2, LogOut, Package, User, Users, Phone, Mail, DollarSign, Calendar, StickyNote, RefreshCw, Key, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

interface DealerOrder {
  id: number;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  categoryName: string;
  modelName: string;
  modelSpecs: any;
  selectedOptions: Record<string, any>;
  basePrice: number;
  optionsPrice: number;
  totalPrice: number;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DealerProfile {
  id: number;
  dealerId: string;
  companyName: string;
  website: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactTitle: string;
  // Legacy fields
  dealerName?: string;
  contactName?: string;
  email?: string;
  territory?: string;
  // User info for dealer employees
  user?: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    title: string | null;
    role: 'admin' | 'user';
  };
}

interface DealerUser {
  id: number;
  dealerId: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DealerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<DealerOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<DealerOrder | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<DealerOrder | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState<Partial<DealerProfile>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isChangingUserPassword, setIsChangingUserPassword] = useState(false);
  const [userPasswordFormData, setUserPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showUserPasswords, setShowUserPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<DealerUser | null>(null);
  const [newUserData, setNewUserData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    title: "",
    password: "",
    role: "user" as 'admin' | 'user',
  });

  // Check authentication
  useEffect(() => {
    const sessionId = localStorage.getItem("dealer_session");
    if (!sessionId) {
      setLocation("/dealer/login");
    }
  }, [setLocation]);

  // Get dealer profile
  const { data: profile, refetch: refetchProfile, error: profileError } = useQuery<DealerProfile>({
    queryKey: ["/api/dealer/profile"],
    enabled: !!localStorage.getItem("dealer_session"),
    retry: false,
  });
  
  // Initialize profile form data when profile loads
  useEffect(() => {
    if (profile && !isEditingProfile) {
      setProfileFormData(profile);
    }
  }, [profile, isEditingProfile]);

  // Get dealer orders - refetch on mount and focus
  const { data: orders = [], isLoading, refetch, error: ordersError } = useQuery<DealerOrder[]>({
    queryKey: ["/api/dealer/orders"],
    enabled: !!localStorage.getItem("dealer_session"),
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    retry: false,
  });
  
  // Check if current user has admin role (for dealer employees)
  const isUserAdmin = profile?.user?.role === 'admin' || !profile?.user;
  
  // Get dealer users (only if user is admin or main dealer account)
  const { data: users = [], refetch: refetchUsers } = useQuery<DealerUser[]>({
    queryKey: ["/api/dealer/users"],
    enabled: !!localStorage.getItem("dealer_session") && activeTab === "users" && isUserAdmin,
    retry: false,
  });
  
  // Handle session expiration
  useEffect(() => {
    if (profileError?.message?.includes('401') || ordersError?.message?.includes('401')) {
      toast({
        title: "Session Expired",
        description: "Your session has expired. Please log in again.",
        variant: "destructive",
      });
      // Clear the expired session
      localStorage.removeItem("dealer_session");
      sessionStorage.clear();
      queryClient.clear();
      // Redirect to login
      setTimeout(() => {
        setLocation("/dealer/login");
      }, 2000);
    }
  }, [profileError, ordersError, toast, setLocation]);

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<DealerOrder> }) => {
      return apiRequest(`/api/dealer/orders/${data.id}`, {
        method: "PATCH",
        body: data.updates,
      });
    },
    onSuccess: () => {
      toast({
        title: "Order updated",
        description: "The order has been successfully updated.",
      });
      setIsEditDialogOpen(false);
      setEditingOrder(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update order",
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<DealerProfile>) => {
      return apiRequest("/api/dealer/profile", {
        method: "PATCH",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditingProfile(false);
      refetchProfile();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest("/api/dealer/change-password", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });
      // Reset both dealer and user password forms
      setIsChangingPassword(false);
      setPasswordFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      });
      setIsChangingUserPassword(false);
      setUserPasswordFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowUserPasswords({
        current: false,
        new: false,
        confirm: false,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest(`/api/dealer/orders/${orderId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Order deleted",
        description: "The order has been successfully deleted.",
      });
      setDeleteConfirmOrder(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete order",
        variant: "destructive",
      });
    },
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      return apiRequest("/api/dealer/users", {
        method: "POST",
        body: userData,
      });
    },
    onSuccess: () => {
      toast({
        title: "User created",
        description: "The user has been successfully created.",
      });
      setIsAddingUser(false);
      setNewUserData({
        username: "",
        email: "",
        firstName: "",
        lastName: "",
        title: "",
        password: "",
        role: "user",
      });
      refetchUsers();
    },
    onError: (error: any) => {
      toast({
        title: "Create failed",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<DealerUser> }) => {
      return apiRequest(`/api/dealer/users/${data.id}`, {
        method: "PATCH",
        body: data.updates,
      });
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user has been successfully updated.",
      });
      setEditingUser(null);
      refetchUsers();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/dealer/users/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
      refetchUsers();
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    // Clear everything
    localStorage.clear();
    sessionStorage.clear();
    queryClient.clear();
    queryClient.resetQueries();
    // Force page reload to clear all state
    window.location.href = "/dealer/login";
  };

  const handleEditOrder = (order: DealerOrder) => {
    setEditingOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleUpdateOrder = () => {
    if (!editingOrder) return;

    updateOrderMutation.mutate({
      id: editingOrder.id,
      updates: {
        customerName: editingOrder.customerName,
        customerEmail: editingOrder.customerEmail,
        customerPhone: editingOrder.customerPhone,
        status: editingOrder.status,
        notes: editingOrder.notes,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      submitted: "default",
      processing: "outline",
      completed: "default",
    };
    
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      submitted: "bg-blue-100 text-blue-800",
      processing: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
    };

    return (
      <Badge variant={variants[status] || "default"} className={colors[status] || ""}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Calculate statistics
  const stats = {
    totalOrders: orders.length,
    draftOrders: orders.filter(o => o.status === "draft").length,
    submittedOrders: orders.filter(o => o.status === "submitted").length,
    totalValue: orders.reduce((sum, o) => sum + o.totalPrice, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dealer Portal</h1>
                {profile && (
                  <p className="text-sm text-gray-600">{profile.dealerName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setLocation("/")}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Configuration
              </Button>
              <Button
                onClick={handleLogout}
                variant="ghost"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Draft Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.draftOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Submitted Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.submittedOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatPrice(stats.totalValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${isUserAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {isUserAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Your Orders</CardTitle>
                    <CardDescription>
                      Manage your saved trailer configurations and customer orders
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => refetch()}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 text-gray-500">Loading orders...</p>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No orders yet</p>
                    <Button onClick={() => setLocation("/")} variant="outline">
                      Create Your First Order
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Total Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell>
                              {order.customerName || <span className="text-gray-400">N/A</span>}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.modelName}</p>
                                <p className="text-sm text-gray-500">{order.categoryName}</p>
                              </div>
                            </TableCell>
                            <TableCell>{formatPrice(order.totalPrice)}</TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                            <TableCell>
                              {format(new Date(order.createdAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedOrder(order)}
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditOrder(order)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteConfirmOrder(order)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="mt-6">
            {/* User Profile Section - Only for dealer employees */}
            {profile?.user && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>User Profile</CardTitle>
                  <CardDescription>
                    Your personal account information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* User Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm text-gray-600">Username</Label>
                          <p className="font-medium">{profile.user.username}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Email</Label>
                          <p className="font-medium">{profile.user.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">First Name</Label>
                          <p className="font-medium">{profile.user.firstName}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Last Name</Label>
                          <p className="font-medium">{profile.user.lastName}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Title</Label>
                          <p className="font-medium">{profile.user.title || "Not provided"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Role</Label>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            profile.user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {profile.user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* User Password Section */}
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Password</h3>
                        {!isChangingUserPassword ? (
                          <Button
                            onClick={() => setIsChangingUserPassword(true)}
                            variant="outline"
                            size="sm"
                          >
                            <Key className="w-4 h-4 mr-2" />
                            Change Password
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setIsChangingUserPassword(false);
                                setUserPasswordFormData({
                                  currentPassword: "",
                                  newPassword: "",
                                  confirmPassword: "",
                                });
                                setShowUserPasswords({
                                  current: false,
                                  new: false,
                                  confirm: false,
                                });
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                if (userPasswordFormData.newPassword !== userPasswordFormData.confirmPassword) {
                                  toast({
                                    title: "Password mismatch",
                                    description: "New passwords don't match",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                if (userPasswordFormData.newPassword.length < 8) {
                                  toast({
                                    title: "Password too short",
                                    description: "Password must be at least 8 characters long",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                changePasswordMutation.mutate({
                                  currentPassword: userPasswordFormData.currentPassword,
                                  newPassword: userPasswordFormData.newPassword,
                                });
                              }}
                              size="sm"
                              disabled={changePasswordMutation.isPending || !userPasswordFormData.currentPassword || !userPasswordFormData.newPassword || !userPasswordFormData.confirmPassword}
                            >
                              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {isChangingUserPassword ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="userCurrentPassword" className="text-sm text-gray-600">Current Password</Label>
                            <div className="relative">
                              <Input
                                id="userCurrentPassword"
                                type={showUserPasswords.current ? "text" : "password"}
                                value={userPasswordFormData.currentPassword}
                                onChange={(e) => setUserPasswordFormData({ ...userPasswordFormData, currentPassword: e.target.value })}
                                placeholder="Enter your current password"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowUserPasswords({ ...showUserPasswords, current: !showUserPasswords.current })}
                              >
                                {showUserPasswords.current ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="userNewPassword" className="text-sm text-gray-600">New Password</Label>
                            <div className="relative">
                              <Input
                                id="userNewPassword"
                                type={showUserPasswords.new ? "text" : "password"}
                                value={userPasswordFormData.newPassword}
                                onChange={(e) => setUserPasswordFormData({ ...userPasswordFormData, newPassword: e.target.value })}
                                placeholder="Enter your new password (min 8 characters)"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowUserPasswords({ ...showUserPasswords, new: !showUserPasswords.new })}
                              >
                                {showUserPasswords.new ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="userConfirmPassword" className="text-sm text-gray-600">Confirm New Password</Label>
                            <div className="relative">
                              <Input
                                id="userConfirmPassword"
                                type={showUserPasswords.confirm ? "text" : "password"}
                                value={userPasswordFormData.confirmPassword}
                                onChange={(e) => setUserPasswordFormData({ ...userPasswordFormData, confirmPassword: e.target.value })}
                                placeholder="Confirm your new password"
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowUserPasswords({ ...showUserPasswords, confirm: !showUserPasswords.confirm })}
                              >
                                {showUserPasswords.confirm ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500">••••••••</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Dealer Profile</CardTitle>
                    <CardDescription>
                      Your dealer account information
                    </CardDescription>
                  </div>
                  {!isEditingProfile ? (
                    <Button
                      onClick={() => {
                        setIsEditingProfile(true);
                        setProfileFormData(profile || {});
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileFormData(profile || {});
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          const { dealerId, id, ...updates } = profileFormData;
                          updateProfileMutation.mutate(updates);
                        }}
                        size="sm"
                      >
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!profile ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center space-y-3">
                      <RefreshCw className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                      <p className="text-gray-500">Loading profile information...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Company Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Company Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm text-gray-600">Dealer ID</Label>
                          <p className="font-medium">{profile.dealerId}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Company Name</Label>
                          {isEditingProfile ? (
                            <Input
                              value={profileFormData.companyName || ""}
                              onChange={(e) => setProfileFormData({ ...profileFormData, companyName: e.target.value })}
                            />
                          ) : (
                            <p className="font-medium">{profile.companyName || profile.dealerName}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Website</Label>
                          {isEditingProfile ? (
                            <Input
                              value={profileFormData.website || ""}
                              placeholder="https://example.com"
                              onChange={(e) => setProfileFormData({ ...profileFormData, website: e.target.value })}
                            />
                          ) : (
                            <p className="font-medium">{profile.website || "Not provided"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Phone</Label>
                          {isEditingProfile ? (
                            <Input
                              value={profileFormData.phone || ""}
                              onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                            />
                          ) : (
                            <p className="font-medium">{profile.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Primary Contact */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Primary Point of Contact</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm text-gray-600">First Name</Label>
                          {isEditingProfile ? (
                            <Input
                              value={profileFormData.contactFirstName || ""}
                              onChange={(e) => setProfileFormData({ ...profileFormData, contactFirstName: e.target.value })}
                            />
                          ) : (
                            <p className="font-medium">{profile.contactFirstName || "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Last Name</Label>
                          {isEditingProfile ? (
                            <Input
                              value={profileFormData.contactLastName || ""}
                              onChange={(e) => setProfileFormData({ ...profileFormData, contactLastName: e.target.value })}
                            />
                          ) : (
                            <p className="font-medium">{profile.contactLastName || "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Email</Label>
                          {isEditingProfile ? (
                            <Input
                              type="email"
                              value={profileFormData.contactEmail || ""}
                              onChange={(e) => setProfileFormData({ ...profileFormData, contactEmail: e.target.value })}
                            />
                          ) : (
                            <p className="font-medium">{profile.contactEmail || profile.email}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">Title</Label>
                          {isEditingProfile ? (
                            <Input
                              value={profileFormData.contactTitle || ""}
                              placeholder="e.g. Sales Manager"
                              onChange={(e) => setProfileFormData({ ...profileFormData, contactTitle: e.target.value })}
                            />
                          ) : (
                            <p className="font-medium">{profile.contactTitle || "Not provided"}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Address */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Full Address</h3>
                      <div className="md:col-span-2">
                        <Label className="text-sm text-gray-600">Address</Label>
                        {isEditingProfile ? (
                          <div className="space-y-2">
                            <Input
                              placeholder="Street Address"
                              value={profileFormData.address || ""}
                              onChange={(e) => setProfileFormData({ ...profileFormData, address: e.target.value })}
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <Input
                                placeholder="City"
                                value={profileFormData.city || ""}
                                onChange={(e) => setProfileFormData({ ...profileFormData, city: e.target.value })}
                              />
                              <Input
                                placeholder="State"
                                maxLength={2}
                                value={profileFormData.state || ""}
                                onChange={(e) => setProfileFormData({ ...profileFormData, state: e.target.value.toUpperCase() })}
                              />
                              <Input
                                placeholder="ZIP Code"
                                value={profileFormData.zipCode || ""}
                                onChange={(e) => setProfileFormData({ ...profileFormData, zipCode: e.target.value })}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="font-medium">
                            {profile.address}<br />
                            {profile.city}, {profile.state} {profile.zipCode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Password Section - Only for main dealer account */}
                    {!profile.user && (
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Password</h3>
                          {!isChangingPassword ? (
                            <Button
                              onClick={() => setIsChangingPassword(true)}
                              variant="outline"
                              size="sm"
                            >
                              <Key className="w-4 h-4 mr-2" />
                              Change Password
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setIsChangingPassword(false);
                                  setPasswordFormData({
                                    currentPassword: "",
                                    newPassword: "",
                                    confirmPassword: "",
                                  });
                                  setShowPasswords({
                                    current: false,
                                    new: false,
                                    confirm: false,
                                  });
                                }}
                                variant="outline"
                                size="sm"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => {
                                  if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
                                    toast({
                                      title: "Password mismatch",
                                      description: "New passwords don't match",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  if (passwordFormData.newPassword.length < 8) {
                                    toast({
                                      title: "Password too short",
                                      description: "Password must be at least 8 characters long",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  changePasswordMutation.mutate({
                                    currentPassword: passwordFormData.currentPassword,
                                    newPassword: passwordFormData.newPassword,
                                  });
                                }}
                                size="sm"
                                disabled={changePasswordMutation.isPending || !passwordFormData.currentPassword || !passwordFormData.newPassword || !passwordFormData.confirmPassword}
                              >
                                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {isChangingPassword ? (
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="currentPassword" className="text-sm text-gray-600">Current Password</Label>
                              <div className="relative">
                                <Input
                                  id="currentPassword"
                                  type={showPasswords.current ? "text" : "password"}
                                  value={passwordFormData.currentPassword}
                                  onChange={(e) => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })}
                                  placeholder="Enter your current password"
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                >
                                  {showPasswords.current ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="newPassword" className="text-sm text-gray-600">New Password</Label>
                              <div className="relative">
                                <Input
                                  id="newPassword"
                                  type={showPasswords.new ? "text" : "password"}
                                  value={passwordFormData.newPassword}
                                  onChange={(e) => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                                  placeholder="Enter your new password (min 8 characters)"
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                >
                                  {showPasswords.new ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="confirmPassword" className="text-sm text-gray-600">Confirm New Password</Label>
                              <div className="relative">
                                <Input
                                  id="confirmPassword"
                                  type={showPasswords.confirm ? "text" : "password"}
                                  value={passwordFormData.confirmPassword}
                                  onChange={(e) => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })}
                                  placeholder="Confirm your new password"
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                >
                                  {showPasswords.confirm ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500">••••••••</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage users who can access the dealer portal
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setIsAddingUser(true)}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No users found. Add your first user to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.firstName} {user.lastName}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.title || "-"}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : 'User'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingUser(user)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="font-semibold mb-3">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Name</Label>
                    <p className="font-medium">{selectedOrder.customerName || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Email</Label>
                    <p className="font-medium">{selectedOrder.customerEmail || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Phone</Label>
                    <p className="font-medium">{selectedOrder.customerPhone || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Trailer Configuration */}
              <div>
                <h3 className="font-semibold mb-3">Trailer Configuration</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">Category</Label>
                    <p className="font-medium">{selectedOrder.categoryName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Model</Label>
                    <p className="font-medium">{selectedOrder.modelName}</p>
                  </div>
                  {selectedOrder.modelSpecs && (
                    <div>
                      <Label className="text-sm text-gray-600">Specifications</Label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {Object.entries(selectedOrder.modelSpecs).map(([key, value]) => (
                          <div key={key} className="text-sm">
                            <span className="text-gray-600">{key}:</span>{" "}
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Options */}
              {selectedOrder.selectedOptions && Object.keys(selectedOrder.selectedOptions).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Selected Options</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedOrder.selectedOptions).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600">{key}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div>
                <h3 className="font-semibold mb-3">Pricing</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Price</span>
                    <span className="font-medium">{formatPrice(selectedOrder.basePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Options</span>
                    <span className="font-medium">{formatPrice(selectedOrder.optionsPrice)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder.totalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="font-semibold mb-3">Notes</h3>
                  <p className="text-sm text-gray-600">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Order Status */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-600">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div className="text-right">
                  <Label className="text-sm text-gray-600">Created</Label>
                  <p className="font-medium">
                    {format(new Date(selectedOrder.createdAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>
              Update customer information and order status
            </DialogDescription>
          </DialogHeader>

          {editingOrder && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={editingOrder.customerName || ""}
                  onChange={(e) =>
                    setEditingOrder({ ...editingOrder, customerName: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={editingOrder.customerEmail || ""}
                  onChange={(e) =>
                    setEditingOrder({ ...editingOrder, customerEmail: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="customerPhone">Customer Phone</Label>
                <Input
                  id="customerPhone"
                  value={editingOrder.customerPhone || ""}
                  onChange={(e) =>
                    setEditingOrder({ ...editingOrder, customerPhone: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editingOrder.status}
                  onValueChange={(value) =>
                    setEditingOrder({ ...editingOrder, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editingOrder.notes || ""}
                  onChange={(e) =>
                    setEditingOrder({ ...editingOrder, notes: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOrder}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmOrder} onOpenChange={() => setDeleteConfirmOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete order #{deleteConfirmOrder?.orderNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOrder(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmOrder) {
                  deleteOrderMutation.mutate(deleteConfirmOrder.id);
                }
              }}
            >
              Delete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add User Dialog */}
      <Dialog open={isAddingUser} onOpenChange={setIsAddingUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user who can access the dealer portal
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={newUserData.firstName}
                  onChange={(e) => setNewUserData({ ...newUserData, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={newUserData.lastName}
                  onChange={(e) => setNewUserData({ ...newUserData, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newUserData.title}
                  onChange={(e) => setNewUserData({ ...newUserData, title: e.target.value })}
                  placeholder="e.g. Sales Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUserData.role}
                onValueChange={(value) => setNewUserData({ ...newUserData, role: value as 'admin' | 'user' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access including user management</SelectItem>
                  <SelectItem value="user">User - Can manage orders only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingUser(false)}>
              Cancel
            </Button>
            <Button onClick={() => createUserMutation.mutate(newUserData)}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={editingUser.username}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingUser.title || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value) => setEditingUser({ ...editingUser, role: value as 'admin' | 'user' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full access including user management</SelectItem>
                      <SelectItem value="user">User - Can manage orders only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => editingUser && updateUserMutation.mutate({ 
              id: editingUser.id, 
              updates: {
                email: editingUser.email,
                firstName: editingUser.firstName,
                lastName: editingUser.lastName,
                title: editingUser.title,
                role: editingUser.role
              }
            })}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}