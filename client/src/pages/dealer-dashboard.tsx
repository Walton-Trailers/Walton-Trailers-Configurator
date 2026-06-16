import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link, useRoute } from "wouter";
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
import { Building2, Plus, FileText, Edit, Trash2, LogOut, Package, User, Users, Phone, Mail, DollarSign, Calendar, StickyNote, RefreshCw, Key, Eye, EyeOff, Send, Search, ArrowLeft } from "lucide-react";
import { SubmitOrderDialog } from "@/components/submit-order-dialog";
import { DealerHelpButton } from "@/components/dealer-help-button";
import { format } from "date-fns";

interface DealerOrder {
  id: number;
  orderNumber: string;
  repOrderNumber: string | null;
  submittedAt: string | null;
  deletedAt: string | null;
  workOrderUrl: string | null;
  workOrderUploadedAt: string | null;
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
  // Assigned Walton sales rep. Used by the past-window delete dialog to
  // tell the dealer who to contact for cancellation.
  salesRepName?: string | null;
  salesRepEmail?: string | null;
  // User info for dealer employees
  user?: {
    id: number;
    username?: string | null;
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
  username?: string | null;
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
  const [activeTab, setActiveTab] = useState("quotes");
  // Per-table search filters. Independent state so switching tabs
  // doesn't clobber what the dealer typed in another one.
  const [quotesFilter, setQuotesFilter] = useState("");
  const [reservedFilter, setReservedFilter] = useState("");
  const [ordersFilter, setOrdersFilter] = useState("");
  // Profile is its own URL (/dealer/profile) so it reads as a separate
  // screen instead of a tab. Same component, different chrome — when
  // this matches we hide the dashboard stats + tab row and show a
  // Back-to-Dashboard button above the profile content.
  const [onProfileScreen] = useRoute("/dealer/profile");
  // Quote being converted to a submitted order via the SubmitOrderDialog.
  const [convertingOrder, setConvertingOrder] = useState<DealerOrder | null>(null);
  const [isSubmittingConvert, setIsSubmittingConvert] = useState(false);
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
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<DealerUser | null>(null);
  const [newUserData, setNewUserData] = useState({
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

  // Keep the Tabs `value` in sync with the route. Landing on
  // /dealer/profile or coming back to /dealer/dashboard should land
  // the user on the right TabsContent.
  useEffect(() => {
    if (onProfileScreen && activeTab !== "profile") {
      setActiveTab("profile");
    } else if (!onProfileScreen && activeTab === "profile") {
      setActiveTab("quotes");
    }
  }, [onProfileScreen]);

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
  
  // Dealer's Reserve-Now history for the new Reserved tab.
  interface Reservation {
    id: number;
    airtableRecordId: string | null;
    stockNumber: string | null;
    model: string | null;
    customerName: string | null;
    note: string | null;
    status: string;
    createdAt: string;
  }
  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ["/api/dealer/inventory/reservations"],
    enabled: !!localStorage.getItem("dealer_session"),
    retry: false,
  });

  // Get all options for displaying option names
  const { data: allOptions = [] } = useQuery<any[]>({
    queryKey: ["/api/options/all"],
    enabled: !!localStorage.getItem("dealer_session"),
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

  // Restore a soft-deleted order back into the Quotes tab. Server always
  // resets the order to status='draft' regardless of its prior state so a
  // previously-submitted order can't sneak back into Orders without going
  // through Submit again. The toast reflects which branch ran.
  const restoreOrderMutation = useMutation({
    mutationFn: async (orderId: number) =>
      apiRequest(`/api/dealer/orders/${orderId}/restore`, { method: "POST" }) as Promise<{ message: string; wasSubmitted: boolean }>,
    onSuccess: (result) => {
      toast({
        title: "Restored to Quotes",
        description: result?.wasSubmitted
          ? "This was a submitted order — submit again to resend it to Walton."
          : "Moved back to your Quotes.",
      });
      refetch();
      setActiveTab('quotes');
    },
    onError: (err: any) =>
      toast({ title: "Couldn't restore", description: err?.message, variant: "destructive" }),
  });

  // Convert a draft quote into a submitted order. Server route fires the
  // rep + dealer notification emails as a side effect.
  const handleConvertSubmit = async (data: { customerName: string; poNumber: string; signature: string }) => {
    if (!convertingOrder) return;
    setIsSubmittingConvert(true);
    try {
      await apiRequest(`/api/dealer/orders/${convertingOrder.id}/submit`, {
        method: "POST",
        body: { customerName: data.customerName, poNumber: data.poNumber || undefined, signature: data.signature },
      });
      toast({
        title: "Order submitted",
        description: `Quote sent to Walton. You'll see your assigned order # here once your rep picks it up.`,
      });
      setConvertingOrder(null);
      refetch();
      setActiveTab('orders');
    } catch (error: any) {
      toast({
        title: "Submit failed",
        description: error?.message || "Couldn't submit the order.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingConvert(false);
    }
  };
  
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
        // status intentionally NOT included — only system events and Walton
        // admin staff move orders through the lifecycle.
        notes: editingOrder.notes,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      submitted: "default",
      received: "default",
      processing: "outline",
      completed: "default",
    };

    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      submitted: "bg-blue-100 text-blue-800",
      // Received = rep has matched the order and uploaded a work order. Use
      // a teal/cyan so it reads as a distinct progression from blue submitted.
      received: "bg-teal-100 text-teal-800",
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

  // Format option value - convert IDs to names
  const formatOptionValue = (category: string, value: any): string => {
    if (!allOptions || allOptions.length === 0) {
      return String(value);
    }

    // Handle arrays (like extras with multiple selections)
    if (Array.isArray(value)) {
      const categoryOptions = allOptions.filter(opt => opt.category === category);
      const selectedOptions = categoryOptions.filter(opt => value.includes(opt.id));
      return selectedOptions.map(opt => opt.name).join(', ') || String(value);
    }

    // Handle single selections (option ID)
    if (typeof value === 'number') {
      const categoryOptions = allOptions.filter(opt => opt.category === category);
      const selectedOption = categoryOptions.find(opt => opt.id === value);
      return selectedOption ? selectedOption.name : String(value);
    }

    return String(value);
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
              {/* Personalized greeting. Dealer-user logins (profile.user
                  populated) get the employee's first name; main dealer
                  account logins fall back to the dealer's primary
                  contact name, then the company name. */}
              <h1 className="text-xl font-bold text-gray-900">
                Welcome
                {profile && (() => {
                  const name = profile.user?.firstName
                    || profile.contactName
                    || profile.companyName
                    || profile.dealerName;
                  return name ? `, ${name}` : "";
                })()}
              </h1>
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
                onClick={() => setLocation("/dealer/inventory")}
                variant="outline"
                size="sm"
              >
                <Package className="w-4 h-4 mr-2" />
                View Inventory
              </Button>
              {/* Profile icon — navigates to /dealer/profile, which
                  renders the same component without the dashboard
                  chrome (stats, tab row) and adds a Back-to-Dashboard
                  button. The activeTab effect snaps to "profile" when
                  this route matches. */}
              <Button
                onClick={() => setLocation("/dealer/profile")}
                variant="ghost"
                size="sm"
                title="Profile & users"
                aria-label="Profile & users"
                className="px-2"
              >
                <User className="w-5 h-5" />
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
        {/* Back-to-Dashboard button only visible on /dealer/profile so the
            screen reads as a separate destination, not a hidden tab. */}
        {onProfileScreen && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => setLocation("/dealer/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        )}
        {/* Stats Cards — dashboard chrome only; hidden on the profile route. */}
        {!onProfileScreen && (
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
        )}

        {/* Split orders into Quotes (drafts the dealer is still iterating on)
            and Orders (anything that's been submitted to Walton). Computed
            inline rather than via useMemo since the array is small. */}
        {(() => {
          // Three buckets keyed off (status, deletedAt). Deleted always wins
          // — a soft-deleted draft shows up in Deleted, never Quotes.
          const activeOrders = orders.filter((o) => !o.deletedAt);
          const quotesAll = activeOrders.filter((o) => o.status === 'draft');
          const submittedOrdersAll = activeOrders.filter((o) => o.status !== 'draft');
          const deletedOrders = orders.filter((o) => !!o.deletedAt);

          // Lightweight free-text filter that matches across the columns
          // visible in the Quotes / Orders tables. Case-insensitive.
          const matchesOrderFilter = (o: DealerOrder, needle: string): boolean => {
            if (!needle) return true;
            const q = needle.toLowerCase();
            return (
              (o.repOrderNumber || "").toLowerCase().includes(q) ||
              (o.orderNumber || "").toLowerCase().includes(q) ||
              (o.customerName || "").toLowerCase().includes(q) ||
              (o.modelName || "").toLowerCase().includes(q) ||
              (o.categoryName || "").toLowerCase().includes(q) ||
              (o.status || "").toLowerCase().includes(q)
            );
          };
          const quotes = quotesAll.filter((o) => matchesOrderFilter(o, quotesFilter));
          const submittedOrders = submittedOrdersAll.filter((o) =>
            matchesOrderFilter(o, ordersFilter),
          );
          // Shared row renderer so the Convert action only appears on quotes.
          const renderRows = (rows: typeof orders, opts: { showConvert: boolean }) =>
            rows.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  {/* Click the order number to see the full order detail
                      (documents, dates, options, status). Other cells stay
                      non-navigating so the inline action buttons still work
                      without stopPropagation. */}
                  <Link href={`/dealer/orders/${order.id}`}>
                    <span className="cursor-pointer text-blue-600 hover:underline">
                      {order.repOrderNumber || (
                        <span className="text-gray-400 italic font-normal">Pending assignment</span>
                      )}
                    </span>
                  </Link>
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
                <TableCell>{format(new Date(order.createdAt), "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEditOrder(order)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {opts.showConvert && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Submit to Walton"
                        onClick={() => setConvertingOrder(order)}
                        className="text-green-700 hover:text-green-800"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmOrder(order)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ));

          return (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Active-reservations count drives the Reserved tab badge.
                  We hide cancelled/released entries from the count so the
                  number tracks what's "in flight" rather than total history. */}
              {/* Profile + Users moved out of the tab row — accessed via
                  the person icon in the header so the work-related tabs
                  (quotes / reserved / orders / deleted) read cleanly as
                  four equal columns. */}
              {(() => {
                const activeReservations = reservations.filter(
                  (r) => r.status !== "cancelled" && r.status !== "released",
                );
                return (
              <TabsList className={`grid w-full grid-cols-4${onProfileScreen ? " hidden" : ""}`}>
                <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
                <TabsTrigger value="reserved">Reserved ({activeReservations.length})</TabsTrigger>
                <TabsTrigger value="orders">Orders ({submittedOrders.length})</TabsTrigger>
                <TabsTrigger value="deleted">Deleted ({deletedOrders.length})</TabsTrigger>
              </TabsList>
                );
              })()}

              {/* Quotes — drafts the dealer hasn't sent to Walton yet. */}
              <TabsContent value="quotes" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Quotes</CardTitle>
                        <CardDescription>
                          Saved configurations you can iterate on with customers. Click the
                          send icon to submit a quote to Walton as an order.
                        </CardDescription>
                      </div>
                      <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <p className="text-center py-8 text-gray-500">Loading…</p>
                    ) : quotesAll.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No quotes yet</p>
                        <Button onClick={() => setLocation("/")} variant="outline">
                          Configure a Trailer
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Search filter matches Order #, customer, model,
                            status, PO #. Empty input = show all. */}
                        <div className="relative mb-4 w-full sm:max-w-xs">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            value={quotesFilter}
                            onChange={(e) => setQuotesFilter(e.target.value)}
                            placeholder="Filter quotes…"
                            className="pl-8"
                          />
                        </div>
                        {quotes.length === 0 ? (
                          <p className="text-center text-sm text-gray-500 py-8">
                            No quotes match "{quotesFilter}".
                          </p>
                        ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Quote #</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Model</TableHead>
                              <TableHead>Total Price</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Created</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>{renderRows(quotes, { showConvert: true })}</TableBody>
                        </Table>
                      </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reserved — inventory units the dealer hit "Reserve Now" on
                  from the View Inventory page. Distinct from Orders because
                  these aren't built-to-order; the rep confirms the hold
                  out-of-band and updates status when ready. */}
              <TabsContent value="reserved" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Reserved Inventory Units</CardTitle>
                    <CardDescription>
                      Stock units you've requested to hold via View Inventory.
                      Your rep is notified by email when you click Reserve Now,
                      and updates the status as the hold progresses.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reservations.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No reserved units yet</p>
                        <Button onClick={() => setLocation("/dealer/inventory")} variant="outline">
                          View Inventory
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Free-text filter across Production ID, model,
                            customer, and status. Stays empty by default
                            so the full list is visible until the dealer
                            types something. */}
                        <div className="relative mb-4 w-full sm:max-w-xs">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            value={reservedFilter}
                            onChange={(e) => setReservedFilter(e.target.value)}
                            placeholder="Filter reservations…"
                            className="pl-8"
                          />
                        </div>
                        {(() => {
                          const q = reservedFilter.trim().toLowerCase();
                          // Hide cancelled reservations from the dealer's view entirely.
                          const visibleReservations = reservations.filter(
                            (r) => r.status !== "cancelled",
                          );
                          const filteredReservations = !q
                            ? visibleReservations
                            : visibleReservations.filter((r) =>
                                [r.stockNumber, r.model, r.customerName, r.status]
                                  .filter(Boolean)
                                  .some((v) => String(v).toLowerCase().includes(q)),
                              );
                          if (filteredReservations.length === 0) {
                            return (
                              <p className="text-center text-sm text-gray-500 py-8">
                                No reservations match "{reservedFilter}".
                              </p>
                            );
                          }
                          return (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Production ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Requested</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredReservations.map((r) => {
                            // Status visualization — keep close to the Order
                            // status palette so dealers read the two lists
                            // the same way.
                            const tone =
                              r.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : r.status === "released" || r.status === "cancelled"
                                  ? "bg-gray-200 text-gray-700"
                                  : "bg-amber-100 text-amber-800";
                            const muted = r.status === "released" || r.status === "cancelled";
                            return (
                              <TableRow key={r.id} className={muted ? "opacity-60" : ""}>
                                {/* Production ID column carries both the unit
                                    ID and its model so the dealer sees the
                                    full identity of the unit they reserved
                                    in one cell. */}
                                <TableCell>
                                  <div className="font-mono">
                                    {r.stockNumber || (
                                      <span className="text-gray-400 italic">—</span>
                                    )}
                                  </div>
                                  {r.model && (
                                    <div className="text-xs text-gray-500 mt-0.5">{r.model}</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {r.customerName || (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${tone}`}>
                                    {r.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {format(new Date(r.createdAt), "MMM d, yyyy")}
                                  {(r as any).documentUrl && (
                                    <a
                                      href={(r as any).documentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="mt-1 block text-xs text-blue-700 hover:underline"
                                    >
                                      View document
                                    </a>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                          );
                        })()}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Orders — submitted to Walton (and any further pipeline states). */}
              <TabsContent value="orders" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Orders</CardTitle>
                        <CardDescription>
                          Orders you've submitted to Walton. Track status as they move through
                          processing and completion.
                        </CardDescription>
                      </div>
                      <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <p className="text-center py-8 text-gray-500">Loading…</p>
                    ) : submittedOrdersAll.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No submitted orders yet</p>
                        <p className="text-sm text-gray-400">
                          Submit a quote from the Quotes tab to start an order.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Search filter matches Order #, customer, model,
                            status, PO #. Empty input = show all. */}
                        <div className="relative mb-4 w-full sm:max-w-xs">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            value={ordersFilter}
                            onChange={(e) => setOrdersFilter(e.target.value)}
                            placeholder="Filter orders…"
                            className="pl-8"
                          />
                        </div>
                        {submittedOrders.length === 0 ? (
                          <p className="text-center text-sm text-gray-500 py-8">
                            No orders match "{ordersFilter}".
                          </p>
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
                              <TableBody>{renderRows(submittedOrders, { showConvert: false })}</TableBody>
                            </Table>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Deleted — soft-deleted quotes and cancelled submissions.
                  Recreate spawns a fresh configurator session pre-filled from
                  this row; Restore brings the original row back into Quotes. */}
              <TabsContent value="deleted" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>Deleted</CardTitle>
                        <CardDescription>
                          Quotes and cancelled submissions you've removed.
                          Recreate copies the configuration into a fresh quote;
                          Restore brings the original back to your Quotes tab.
                        </CardDescription>
                      </div>
                      <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <p className="text-center py-8 text-gray-500">Loading…</p>
                    ) : deletedOrders.length === 0 ? (
                      <div className="text-center py-12">
                        <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Nothing deleted yet</p>
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
                              <TableHead>Was</TableHead>
                              <TableHead>Deleted</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {deletedOrders.map((order) => (
                              <TableRow key={order.id} className="opacity-75">
                                <TableCell className="font-medium">
                                  {order.repOrderNumber || (
                                    <span className="text-gray-400 italic font-normal">Pending assignment</span>
                                  )}
                                </TableCell>
                                <TableCell>{order.customerName || <span className="text-gray-400">N/A</span>}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{order.modelName}</p>
                                    <p className="text-sm text-gray-500">{order.categoryName}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{formatPrice(order.totalPrice)}</TableCell>
                                <TableCell>{getStatusBadge(order.status)}</TableCell>
                                <TableCell>
                                  {order.deletedAt ? format(new Date(order.deletedAt), "MMM d, yyyy") : '—'}
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-2">
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
                                      <FileText className="w-4 h-4" />
                                    </Button>
                                    {/* Recreate — pre-fills a fresh configurator session.
                                        Wired in the next commit (Phase C.2 part 2). For
                                        now just navigates to the configurator. */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Recreate as a new quote"
                                      onClick={() => setLocation(`/?recreate=${order.id}`)}
                                      className="text-green-700 hover:text-green-800"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Restore to Quotes"
                                      onClick={() => restoreOrderMutation.mutate(order.id)}
                                      disabled={restoreOrderMutation.isPending}
                                    >
                                      <RefreshCw className="w-4 h-4" />
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

            {/* User Management — moved out of the top tab row and into
                the Profile view. Only dealer-account admins see it
                (isUserAdmin gates the Add/Edit/Delete affordances at
                the server too). */}
            {isUserAdmin && (
              <Card className="mt-6">
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
                                    onClick={() => setDeleteConfirmUser(user)}
                                    data-testid={`button-delete-user-${user.id}`}
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
            )}
          </TabsContent>
        </Tabs>
          );
        })()}
      </div>

      {/* Submit-to-Walton conversion dialog — pre-filled from the quote row.
          Quote already has a customerName on it most of the time; the dealer
          can adjust before sending. */}
      <SubmitOrderDialog
        open={!!convertingOrder}
        onOpenChange={(open) => { if (!open && !isSubmittingConvert) setConvertingOrder(null); }}
        onSubmit={handleConvertSubmit}
        defaultCustomerName={convertingOrder?.customerName || ""}
      />

      {/* Floating Help button — posts to Slack via /api/dealer/help. */}
      <DealerHelpButton />

      {/* View Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.repOrderNumber || 'Pending assignment'}
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
                    {Object.entries(selectedOrder.selectedOptions).map(([key, value]) => {
                      // The length option is special-cased: it's stored as a
                      // synthetic ID ("length_DHV207_0") that points into the
                      // model's length_options array. The resolved string is
                      // already in modelSpecs.deckSize at save time, so we
                      // show that here instead of the raw synthetic ID.
                      const display =
                        key === 'length' && typeof value === 'string' && value.startsWith('length_')
                          ? (selectedOrder.modelSpecs as any)?.deckSize || String(value)
                          : formatOptionValue(key, value);
                      return (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-600 capitalize">{key}</span>
                          <span className="font-medium">{display}</span>
                        </div>
                      );
                    })}
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

              {/* Work order PDF — appears once the rep attaches one on the
                  admin side. Opens in a new tab; the PDF is a public Blob
                  URL so no auth header needed. */}
              {selectedOrder.workOrderUrl && (
                <div>
                  <h3 className="font-semibold mb-3">Work Order</h3>
                  <a
                    href={selectedOrder.workOrderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded border border-blue-300 bg-blue-50 text-blue-800 text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Download Work Order PDF
                  </a>
                  {selectedOrder.workOrderUploadedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Uploaded {format(new Date(selectedOrder.workOrderUploadedAt), "MMM d, yyyy h:mm a")}
                    </p>
                  )}
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
              Update customer information and notes
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

              {/* Status is managed by the system (submitted on order send,
                  received when the rep uploads the work order) and by Walton
                  admin staff — not by dealers — so the field is intentionally
                  omitted from the dealer edit dialog. */}

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

      {/* Smart delete / cancel dialog. Three branches keyed off (status,
          submittedAt) — same rules the server enforces:
            1. Draft quote          → simple confirm.
            2. Submitted < 48hr     → warning + "rep will be notified".
            3. Submitted ≥ 48hr OR  → no destructive action; show rep
               status past submitted   contact info instead. */}
      {(() => {
        if (!deleteConfirmOrder) {
          return (
            <Dialog open={false} onOpenChange={() => setDeleteConfirmOrder(null)}>
              <DialogContent />
            </Dialog>
          );
        }

        const orderDisplay = deleteConfirmOrder.repOrderNumber
          ? `order #${deleteConfirmOrder.repOrderNumber}`
          : 'this order';
        const repName = profile?.salesRepName || 'your Walton sales rep';
        const repEmail = profile?.salesRepEmail || 'info@waltontrailers.com';

        const isDraft = deleteConfirmOrder.status === 'draft';
        const submittedAt = deleteConfirmOrder.submittedAt
          ? new Date(deleteConfirmOrder.submittedAt)
          : null;
        const WINDOW_MS = 48 * 60 * 60 * 1000;
        const withinWindow = submittedAt != null &&
          (Date.now() - submittedAt.getTime()) < WINDOW_MS;
        const isCancelablePostSubmit = deleteConfirmOrder.status === 'submitted' && withinWindow;
        const lockedOut = !isDraft && !isCancelablePostSubmit;

        const close = () => setDeleteConfirmOrder(null);

        return (
          <Dialog open={true} onOpenChange={close}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {isDraft ? 'Delete quote'
                    : isCancelablePostSubmit ? 'Cancel submitted order'
                    : 'Cancellation not available'}
                </DialogTitle>
                <DialogDescription>
                  {isDraft && (
                    <>Move {orderDisplay} to your Deleted tab? You can Recreate or Restore it later.</>
                  )}
                  {isCancelablePostSubmit && (
                    <>
                      You're cancelling {orderDisplay} within the 48-hour window.{' '}
                      <strong>{repName}</strong> will be notified by email so they can stop the order on Walton's side.
                    </>
                  )}
                  {lockedOut && (
                    <>
                      It's been more than 48 hours since {orderDisplay} was submitted, so you can't cancel it directly anymore.{' '}
                      Please contact <strong>{repName}</strong> at{' '}
                      <a className="underline" href={`mailto:${repEmail}`}>{repEmail}</a> to cancel.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                {lockedOut ? (
                  <>
                    <Button variant="outline" onClick={close}>Close</Button>
                    <Button asChild>
                      <a href={`mailto:${repEmail}?subject=${encodeURIComponent(
                        `Cancel request: ${deleteConfirmOrder.repOrderNumber || deleteConfirmOrder.orderNumber}`
                      )}`}>
                        Email {repName}
                      </a>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={close}>Keep</Button>
                    <Button
                      variant="destructive"
                      disabled={deleteOrderMutation.isPending}
                      onClick={() => deleteOrderMutation.mutate(deleteConfirmOrder.id)}
                    >
                      {isDraft ? 'Delete quote' : 'Cancel order'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
      
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
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="user@example.com"
                />
                <p className="text-xs text-gray-500">Used as the login.</p>
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
                  {isUserAdmin && (
                    <SelectItem value="admin">Admin - Full access including user management</SelectItem>
                  )}
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
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    autoComplete="email"
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
                      {isUserAdmin && (
                        <SelectItem value="admin">Admin - Full access including user management</SelectItem>
                      )}
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

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deleteConfirmUser} onOpenChange={() => setDeleteConfirmUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteConfirmUser ? `${deleteConfirmUser.firstName} ${deleteConfirmUser.lastName}` : "this user"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmUser(null)} data-testid="button-cancel-delete-user">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmUser) {
                  deleteUserMutation.mutate(deleteConfirmUser.id);
                  setDeleteConfirmUser(null);
                }
              }}
              data-testid="button-confirm-delete-user"
            >
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}