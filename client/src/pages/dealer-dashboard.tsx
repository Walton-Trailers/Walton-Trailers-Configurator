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
import { Building2, Plus, FileText, Edit, Trash2, LogOut, Package, User, Phone, Mail, DollarSign, Calendar, StickyNote } from "lucide-react";
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
  dealerName: string;
  contactName: string;
  email: string;
  phone: string;
  territory: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function DealerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<DealerOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<DealerOrder | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<DealerOrder | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");

  // Check authentication
  useEffect(() => {
    const sessionId = localStorage.getItem("dealer_session");
    console.log("Dealer Dashboard - Session ID:", sessionId);
    if (!sessionId) {
      console.log("No session found, redirecting to login");
      setLocation("/dealer/login");
    }
  }, [setLocation]);

  // Get dealer profile
  const sessionId = localStorage.getItem("dealer_session");
  const { data: profile } = useQuery<DealerProfile>({
    queryKey: ["/api/dealer/profile"],
    enabled: !!sessionId,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Get dealer orders
  const { data: orders = [], isLoading, refetch } = useQuery<DealerOrder[]>({
    queryKey: ["/api/dealer/orders"],
    enabled: !!sessionId,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    retry: 1,
  });

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

  const handleLogout = () => {
    localStorage.removeItem("dealer_session");
    localStorage.removeItem("dealer_user");
    setLocation("/dealer/login");
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Orders</CardTitle>
                <CardDescription>
                  Manage your saved trailer configurations and customer orders
                </CardDescription>
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
            <Card>
              <CardHeader>
                <CardTitle>Dealer Profile</CardTitle>
                <CardDescription>
                  Your dealer account information
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm text-gray-600">Dealer ID</Label>
                        <p className="font-medium">{profile.dealerId}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Company Name</Label>
                        <p className="font-medium">{profile.dealerName}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Contact Person</Label>
                        <p className="font-medium">{profile.contactName}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Territory</Label>
                        <p className="font-medium">{profile.territory}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Email</Label>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Phone</Label>
                        <p className="font-medium">{profile.phone}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-sm text-gray-600">Address</Label>
                        <p className="font-medium">
                          {profile.address}<br />
                          {profile.city}, {profile.state} {profile.zipCode}
                        </p>
                      </div>
                    </div>
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
    </div>
  );
}