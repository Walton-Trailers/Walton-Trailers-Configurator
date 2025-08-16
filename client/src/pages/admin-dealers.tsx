import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Edit, Building2, MapPin, Phone, Mail, Package, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

interface Dealer {
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DealerStats {
  dealerId: number;
  orderCount: number;
  totalRevenue: number;
}

export default function AdminDealers() {
  const { toast } = useToast();
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    dealerId: "",
    dealerName: "",
    contactName: "",
    email: "",
    phone: "",
    territory: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    password: "",
  });

  // Fetch all dealers
  const { data: dealers = [], isLoading } = useQuery<Dealer[]>({
    queryKey: ["/api/admin/dealers"],
  });

  // Fetch dealer stats
  const { data: dealerStats = [] } = useQuery<DealerStats[]>({
    queryKey: ["/api/admin/dealers/stats"],
  });

  // Add dealer mutation
  const addDealerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("/api/admin/dealers", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Dealer added",
        description: "The dealer has been successfully added.",
      });
      setIsAddDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dealers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add dealer",
        variant: "destructive",
      });
    },
  });

  // Update dealer mutation
  const updateDealerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Dealer> }) => {
      return apiRequest(`/api/admin/dealers/${id}`, {
        method: "PATCH",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Dealer updated",
        description: "The dealer has been successfully updated.",
      });
      setIsEditDialogOpen(false);
      setSelectedDealer(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dealers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update dealer",
        variant: "destructive",
      });
    },
  });

  // Toggle dealer status mutation
  const toggleDealerStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest(`/api/admin/dealers/${id}/status`, {
        method: "PATCH",
        body: { isActive },
      });
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Dealer status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dealers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      dealerId: "",
      dealerName: "",
      contactName: "",
      email: "",
      phone: "",
      territory: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      password: "",
    });
  };

  const handleEdit = (dealer: Dealer) => {
    setSelectedDealer(dealer);
    setFormData({
      dealerId: dealer.dealerId,
      dealerName: dealer.dealerName,
      contactName: dealer.contactName,
      email: dealer.email,
      phone: dealer.phone,
      territory: dealer.territory,
      address: dealer.address,
      city: dealer.city,
      state: dealer.state,
      zipCode: dealer.zipCode,
      password: "",
    });
    setIsEditDialogOpen(true);
  };

  const handleAddDealer = () => {
    addDealerMutation.mutate(formData);
  };

  const handleUpdateDealer = () => {
    if (!selectedDealer) return;
    
    const updateData: any = {
      dealerName: formData.dealerName,
      contactName: formData.contactName,
      email: formData.email,
      phone: formData.phone,
      territory: formData.territory,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    updateDealerMutation.mutate({
      id: selectedDealer.id,
      data: updateData,
    });
  };

  const getStats = (dealerId: number) => {
    const stats = dealerStats.find(s => s.dealerId === dealerId);
    return stats || { orderCount: 0, totalRevenue: 0 };
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Dealer Management</h1>
            <p className="text-gray-600 mt-2">Manage dealer accounts and territories</p>
          </div>
          <Button onClick={() => {
            resetForm();
            setIsAddDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Dealer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Dealers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dealers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Dealers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dealers.filter(d => d.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {dealerStats.reduce((sum, stat) => sum + stat.orderCount, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dealers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Dealers</CardTitle>
          <CardDescription>
            View and manage all dealer accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Loading dealers...</p>
          ) : dealers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No dealers found</p>
              <Button onClick={() => {
                resetForm();
                setIsAddDialogOpen(true);
              }}>
                Add First Dealer
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer ID</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Territory</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealers.map((dealer) => {
                    const stats = getStats(dealer.id);
                    return (
                      <TableRow key={dealer.id}>
                        <TableCell className="font-medium">{dealer.dealerId}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{dealer.dealerName}</p>
                            <p className="text-sm text-gray-500">{dealer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{dealer.contactName}</p>
                            <p className="text-sm text-gray-500">{dealer.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{dealer.territory}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{dealer.city}, {dealer.state}</p>
                            <p className="text-gray-500">{dealer.zipCode}</p>
                          </div>
                        </TableCell>
                        <TableCell>{stats.orderCount}</TableCell>
                        <TableCell>{formatPrice(stats.totalRevenue)}</TableCell>
                        <TableCell>
                          <Switch
                            checked={dealer.isActive}
                            onCheckedChange={(checked) => {
                              toggleDealerStatusMutation.mutate({
                                id: dealer.id,
                                isActive: checked,
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(dealer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dealer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Dealer</DialogTitle>
            <DialogDescription>
              Create a new dealer account with login credentials
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dealerId">Dealer ID *</Label>
                <Input
                  id="dealerId"
                  value={formData.dealerId}
                  onChange={(e) => setFormData({ ...formData, dealerId: e.target.value })}
                  placeholder="D003"
                />
              </div>
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="dealerName">Company Name *</Label>
              <Input
                id="dealerName"
                value={formData.dealerName}
                onChange={(e) => setFormData({ ...formData, dealerName: e.target.value })}
                placeholder="ABC Trailers Inc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="territory">Territory</Label>
                <Input
                  id="territory"
                  value={formData.territory}
                  onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                  placeholder="Northeast Region"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="dealer@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="NY"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  placeholder="10001"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDealer}>
              Add Dealer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dealer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Dealer</DialogTitle>
            <DialogDescription>
              Update dealer information and credentials
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-dealerId">Dealer ID</Label>
                <Input
                  id="edit-dealerId"
                  value={formData.dealerId}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div>
                <Label htmlFor="edit-password">New Password (Optional)</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank to keep current"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-dealerName">Company Name *</Label>
              <Input
                id="edit-dealerName"
                value={formData.dealerName}
                onChange={(e) => setFormData({ ...formData, dealerName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-contactName">Contact Name *</Label>
                <Input
                  id="edit-contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-territory">Territory</Label>
                <Input
                  id="edit-territory"
                  value={formData.territory}
                  onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="edit-zipCode">ZIP Code</Label>
                <Input
                  id="edit-zipCode"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateDealer}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}