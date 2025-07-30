import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Save, DollarSign, Edit, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// import { Textarea } from "@/components/ui/textarea";

interface TrailerCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  image: string;
}

interface TrailerModel {
  id: number;
  categoryId: number;
  modelSeries: string;
  description: string;
  basePrice: number;
  features: string[];
  specifications: Record<string, any>;
  image: string;
}

interface TrailerOption {
  id: number;
  modelId: number;
  name: string;
  description: string;
  category: string;
  price: number;
  isRequired: boolean;
  options: string[];
}

export default function PricingManagement() {
  const { user, isLoading: authLoading } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [editingModel, setEditingModel] = useState<TrailerModel | null>(null);
  const [editingOption, setEditingOption] = useState<TrailerOption | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sessionId = localStorage.getItem("admin_session");

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Fetch all models
  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ["/api/models/all"],
    queryFn: () =>
      apiRequest("/api/models/all", {
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
  });

  // Fetch all options
  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ["/api/options/all"],
    queryFn: () =>
      apiRequest("/api/options/all", {
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
  });

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: (data: { id: number; basePrice: number; description: string }) =>
      apiRequest(`/api/models/${data.id}`, {
        method: "PATCH",
        body: { basePrice: data.basePrice, description: data.description },
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models/all"] });
      setEditingModel(null);
      toast({
        title: "Success",
        description: "Model pricing updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update model",
        variant: "destructive",
      });
    },
  });

  // Update option mutation
  const updateOptionMutation = useMutation({
    mutationFn: (data: { id: number; price: number; description: string }) =>
      apiRequest(`/api/options/${data.id}`, {
        method: "PATCH",
        body: { price: data.price, description: data.description },
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/options/all"] });
      setEditingOption(null);
      toast({
        title: "Success",
        description: "Option pricing updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update option",
        variant: "destructive",
      });
    },
  });

  const handleUpdateModel = (data: { basePrice: number; description: string }) => {
    if (editingModel) {
      updateModelMutation.mutate({
        id: editingModel.id,
        basePrice: data.basePrice,
        description: data.description,
      });
    }
  };

  const handleUpdateOption = (data: { price: number; description: string }) => {
    if (editingOption) {
      updateOptionMutation.mutate({
        id: editingOption.id,
        price: data.price,
        description: data.description,
      });
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    setLocation("/admin/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/admin")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Pricing Management
                </h1>
                <p className="text-sm text-gray-600">
                  Update trailer and option pricing
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role}
              </Badge>
              <span className="text-sm text-gray-600">
                {user.firstName || user.username}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="models" className="space-y-6">
          <TabsList>
            <TabsTrigger value="models">
              <Package className="w-4 h-4 mr-2" />
              Trailer Models
            </TabsTrigger>
            <TabsTrigger value="options">
              <DollarSign className="w-4 h-4 mr-2" />
              Options & Add-ons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trailer Model Pricing</CardTitle>
                <CardDescription>
                  Update base pricing for all trailer models
                </CardDescription>
              </CardHeader>
              <CardContent>
                {modelsLoading ? (
                  <div className="text-center py-8">Loading models...</div>
                ) : (
                  <div className="space-y-4">
                    {(models as TrailerModel[])?.map((model) => {
                      const category = (categories as TrailerCategory[])?.find(
                        (c) => c.id === model.categoryId
                      );
                      return (
                        <div
                          key={model.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{model.modelSeries}</h3>
                              <Badge variant="outline">
                                {category?.name || "Unknown"}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {model.description}
                            </p>
                            <p className="text-lg font-semibold text-green-600 mt-2">
                              ${model.basePrice?.toLocaleString() || "0"}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingModel(model)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Price
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Option Pricing</CardTitle>
                <CardDescription>
                  Update pricing for trailer options and add-ons
                </CardDescription>
              </CardHeader>
              <CardContent>
                {optionsLoading ? (
                  <div className="text-center py-8">Loading options...</div>
                ) : (
                  <div className="space-y-4">
                    {(options as TrailerOption[])?.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{option.name}</h3>
                            <Badge variant="outline">{option.category}</Badge>
                            {option.isRequired && (
                              <Badge variant="destructive">Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {option.description}
                          </p>
                          <p className="text-lg font-semibold text-green-600 mt-2">
                            ${option.price?.toLocaleString() || "0"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingOption(option)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Price
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Model Dialog */}
        <Dialog open={!!editingModel} onOpenChange={() => setEditingModel(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Model Pricing</DialogTitle>
              <DialogDescription>
                Update pricing and description for {editingModel?.modelSeries}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateModel({
                  basePrice: Number(formData.get("basePrice")),
                  description: formData.get("description") as string,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price ($)</Label>
                <Input
                  id="basePrice"
                  name="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingModel?.basePrice || 0}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={editingModel?.description || ""}
                  placeholder="Enter model description"
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingModel(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateModelMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateModelMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Option Dialog */}
        <Dialog open={!!editingOption} onOpenChange={() => setEditingOption(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Option Pricing</DialogTitle>
              <DialogDescription>
                Update pricing and description for {editingOption?.name}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleUpdateOption({
                  price: Number(formData.get("price")),
                  description: formData.get("description") as string,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingOption?.price || 0}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={editingOption?.description || ""}
                  placeholder="Enter option description"
                  rows={3}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingOption(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateOptionMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateOptionMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}