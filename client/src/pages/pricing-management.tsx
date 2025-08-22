import { useState, useMemo } from "react";
import { ArrowLeft, Edit, Save, X, DollarSign, Search, ChevronDown, Plus, Trash2, Archive, RotateCcw, Upload } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ObjectUploader } from "@/components/ObjectUploader";

interface TrailerModel {
  id: number;
  categoryId: number;
  modelId: string;
  name: string;
  gvwr: string;
  payload: string;
  deckSize: string;
  axles: string;
  basePrice: number;
  imageUrl: string;
  features: string[];
  categoryName: string;
  isArchived?: boolean;
}

interface TrailerOption {
  id: number;
  modelId: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  isArchived?: boolean;
}

interface TrailerCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  startingPrice: number;
}

export default function PricingManagement() {
  const { user, isLoading: authLoading } = useAdminAuth();
  const [editingModel, setEditingModel] = useState<TrailerModel | null>(null);
  const [editingOption, setEditingOption] = useState<TrailerOption | null>(null);
  const [editingCategory, setEditingCategory] = useState<TrailerCategory | null>(null);
  const [editData, setEditData] = useState<{ [key: number]: any }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddOption, setShowAddOption] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showArchivedOptions, setShowArchivedOptions] = useState(false);
  const [showArchivedModels, setShowArchivedModels] = useState(false);
  const [newOptionData, setNewOptionData] = useState({
    name: "",
    price: 0,
    category: "",
    modelId: "",
    relatedModels: [] as string[]
  });
  const [newCategoryData, setNewCategoryData] = useState({
    slug: "",
    name: "",
    description: "",
    imageUrl: "",
    startingPrice: 0
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sessionId = localStorage.getItem("admin_session");



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

  // Fetch option categories for dropdown
  const { data: optionCategories } = useQuery({
    queryKey: ["/api/categories/options"],
    queryFn: () =>
      apiRequest("/api/categories/options", {
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
  });

  // Fetch all trailer categories for the dropdown and management
  const { data: trailerCategories, isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories"),
    staleTime: 0, // Always refetch to ensure fresh data
    gcTime: 0, // Don't cache results
  });



  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: (data: { id: number; basePrice?: number; name?: string; modelId?: string; gvwr?: string; payload?: string; deckSize?: string; categoryId?: number; isArchived?: boolean }) =>
      apiRequest(`/api/models/${data.id}`, {
        method: "PATCH",
        body: { 
          basePrice: data.basePrice, 
          name: data.name, 
          modelId: data.modelId, 
          gvwr: data.gvwr, 
          payload: data.payload, 
          deckSize: data.deckSize,
          categoryId: data.categoryId,
          isArchived: data.isArchived
        },
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models/all"] });
      setEditingModel(null);
      setEditData({});
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
    mutationFn: (data: { id: number; price?: number; name?: string; category?: string; modelId?: string; isArchived?: boolean }) =>
      apiRequest(`/api/options/${data.id}`, {
        method: "PATCH",
        body: { 
          price: data.price, 
          name: data.name, 
          category: data.category, 
          modelId: data.modelId,
          isArchived: data.isArchived
        },
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/options/all"] });
      setEditingOption(null);
      setEditData({});
      toast({
        title: "Success",
        description: "Option updated successfully",
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

  // Create new option mutation
  const createOptionMutation = useMutation({
    mutationFn: (data: { name: string; price: number; category: string; modelId: string }) =>
      apiRequest("/api/options", {
        method: "POST",
        body: data,
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/options/all"] });
      setShowAddOption(false);
      setNewOptionData({
        name: "",
        price: 0,
        category: "",
        modelId: "",
        relatedModels: []
      });
      toast({
        title: "Success",
        description: "Option created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create option",
        variant: "destructive",
      });
    },
  });

  // Delete option mutation
  const deleteOptionMutation = useMutation({
    mutationFn: (optionId: number) =>
      apiRequest(`/api/options/${optionId}`, {
        method: "DELETE",
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/options/all"] });
      toast({
        title: "Success",
        description: "Option deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete option",
        variant: "destructive",
      });
    },
  });

  // Archive option mutation
  const archiveOptionMutation = useMutation({
    mutationFn: (optionId: number) =>
      apiRequest(`/api/options/${optionId}/archive`, {
        method: "PATCH",
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/options/all"] });
      toast({
        title: "Success",
        description: "Option archived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive option",
        variant: "destructive",
      });
    },
  });

  // Archive model mutation
  const archiveModelMutation = useMutation({
    mutationFn: (modelId: number) =>
      apiRequest(`/api/models/${modelId}/archive`, {
        method: "PATCH",
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models/all"] });
      toast({
        title: "Success",
        description: "Model archived successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive model",
        variant: "destructive",
      });
    },
  });

  // Category mutations
  const updateCategoryMutation = useMutation({
    mutationFn: (data: { id: number; slug?: string; name?: string; description?: string; imageUrl?: string; startingPrice?: number }) =>
      apiRequest(`/api/categories/${data.id}`, {
        method: "PATCH",
        body: { 
          slug: data.slug,
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          startingPrice: data.startingPrice
        },
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: async () => {
      // Force complete cache clearing and refetch
      queryClient.removeQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      // Force manual refetch
      await refetchCategories();
      setEditingCategory(null);
      setEditData({});
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: typeof newCategoryData) =>
      apiRequest("/api/categories", {
        method: "POST",
        body: data,
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowAddCategory(false);
      setNewCategoryData({
        slug: "",
        name: "",
        description: "",
        imageUrl: "",
        startingPrice: 0
      });
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/categories/${id}`, {
        method: "DELETE",
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  const handleModelPriceUpdate = (model: TrailerModel) => {
    const data = editData[model.id] || {};
    updateModelMutation.mutate({
      id: model.id,
      basePrice: data.basePrice !== undefined ? data.basePrice : model.basePrice,
      name: data.name !== undefined ? data.name : model.name,
      modelId: data.modelId !== undefined ? data.modelId : model.modelId,
      gvwr: data.gvwr !== undefined ? data.gvwr : model.gvwr,
      payload: data.payload !== undefined ? data.payload : model.payload,
      deckSize: data.deckSize !== undefined ? data.deckSize : model.deckSize,
    });
  };

  const handleOptionUpdate = (option: TrailerOption) => {
    const data = editData[option.id] || {};
    updateOptionMutation.mutate({ 
      id: option.id, 
      price: data.price !== undefined ? data.price : option.price,
      name: data.name !== undefined ? data.name : option.name,
      category: data.category !== undefined ? data.category : option.category,
      modelId: data.modelId !== undefined ? data.modelId : option.modelId,
    });
  };

  // Category image upload handlers
  const handleGetCategoryUploadParameters = async () => {
    const response = await apiRequest("/api/categories/upload-url", {
      method: "POST",
      headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
    });
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handleCategoryImageUploadComplete = async (categoryId: number, result: any) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile) {
        throw new Error("No file uploaded");
      }

      // Get the raw upload URL from the result
      const imageUrl = uploadedFile.uploadURL;
      
      // Call the dedicated image update endpoint
      // The backend will handle normalizing the path and setting ACL
      await apiRequest(`/api/categories/${categoryId}/image`, {
        method: "PATCH",
        body: { imageUrl },
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      });

      // Refresh the categories list
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      
      toast({
        title: "Success",
        description: "Category image updated successfully",
      });
    } catch (error) {
      console.error("Error updating category image:", error);
      toast({
        title: "Error",
        description: "Failed to update category image",
        variant: "destructive",
      });
    }
  };

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!options || !searchQuery.trim()) {
      return options?.filter((option: TrailerOption) => !option.isArchived) || [];
    }
    
    const query = searchQuery.toLowerCase();
    return options.filter((option: TrailerOption) => 
      !option.isArchived && (
        option.category.toLowerCase().includes(query) ||
        option.name.toLowerCase().includes(query) ||
        option.modelId.toLowerCase().includes(query) ||
        option.price.toString().includes(query)
      )
    );
  }, [options, searchQuery]);

  // Filter archived options
  const archivedOptions = useMemo(() => {
    return options?.filter((option: TrailerOption) => option.isArchived) || [];
  }, [options]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!models) return [];
    
    const query = searchQuery.toLowerCase();
    const filteredList = searchQuery.trim() 
      ? models.filter((model: TrailerModel) => 
          model.name.toLowerCase().includes(query) ||
          model.modelId.toLowerCase().includes(query) ||
          model.basePrice.toString().includes(query) ||
          model.gvwr.toString().includes(query) ||
          model.categoryName.toLowerCase().includes(query)
        )
      : models;
    
    return filteredList.filter((model: TrailerModel) => !model.isArchived);
  }, [models, searchQuery]);

  // Filter archived models
  const archivedModels = useMemo(() => {
    if (!models) return [];
    
    const query = searchQuery.toLowerCase();
    const filteredList = searchQuery.trim() 
      ? models.filter((model: TrailerModel) => 
          model.name.toLowerCase().includes(query) ||
          model.modelId.toLowerCase().includes(query) ||
          model.basePrice.toString().includes(query) ||
          model.gvwr.toString().includes(query) ||
          model.categoryName.toLowerCase().includes(query)
        )
      : models;
    
    return filteredList.filter((model: TrailerModel) => model.isArchived);
  }, [models, searchQuery]);

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to access product management.</div>;
  }

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
              <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
              <p className="text-gray-600">Update trailer and option pricing & details</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{user.role}</span>
            <span>{user.username}</span>
          </div>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full max-w-[600px] grid-cols-3">
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="models" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Trailer Models
              </TabsTrigger>
              <TabsTrigger value="options" className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Options & Add-ons
              </TabsTrigger>
            </TabsList>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Trailer Categories</CardTitle>
                    <CardDescription>
                      Manage trailer categories displayed on the frontend
                    </CardDescription>
                  </div>
                  <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                          Create a new trailer category
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-slug">Slug (URL)</Label>
                            <Input
                              id="new-slug"
                              placeholder="e.g., dump-trailers"
                              value={newCategoryData.slug}
                              onChange={(e) => setNewCategoryData({ ...newCategoryData, slug: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-name">Name</Label>
                            <Input
                              id="new-name"
                              placeholder="e.g., Dump Trailers"
                              value={newCategoryData.name}
                              onChange={(e) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-description">Description</Label>
                          <Input
                            id="new-description"
                            placeholder="Category description"
                            value={newCategoryData.description}
                            onChange={(e) => setNewCategoryData({ ...newCategoryData, description: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="new-imageUrl">Image URL</Label>
                            <Input
                              id="new-imageUrl"
                              placeholder="https://..."
                              value={newCategoryData.imageUrl}
                              onChange={(e) => setNewCategoryData({ ...newCategoryData, imageUrl: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="new-startingPrice">Starting Price</Label>
                            <Input
                              id="new-startingPrice"
                              type="number"
                              placeholder="0"
                              value={newCategoryData.startingPrice}
                              onChange={(e) => setNewCategoryData({ ...newCategoryData, startingPrice: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>

                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
                        <Button onClick={() => createCategoryMutation.mutate(newCategoryData)}>Create Category</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="text-center py-8">Loading categories...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Starting Price</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(trailerCategories as TrailerCategory[])?.map((category) => (
                        <TableRow key={`${category.id}-${category.name}-${category.slug}`}>
                          <TableCell>
                            <ObjectUploader
                              onGetUploadParameters={handleGetCategoryUploadParameters}
                              onComplete={(result: any) => handleCategoryImageUploadComplete(category.id, result)}
                              currentImageUrl={category.imageUrl}
                              modelName={category.name}
                            >
                              {category.imageUrl ? (
                                <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors cursor-pointer">
                                  <img 
                                    src={category.imageUrl} 
                                    alt={category.name}
                                    className="w-full h-full object-cover"
                                    onError={(e: any) => {
                                      e.target.onerror = null;
                                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"%3E%3Crect width="48" height="48" fill="%23f3f4f6"/%3E%3Cpath stroke="%239ca3af" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M24 16v16m-8-8h16"/%3E%3C/svg%3E';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-center bg-gray-50">
                                  <Upload className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </ObjectUploader>
                          </TableCell>
                          <TableCell>
                            {editingCategory?.id === category.id ? (
                              <Input
                                value={editData[category.id]?.slug ?? category.slug}
                                onChange={(e) => setEditData(prev => ({
                                  ...prev,
                                  [category.id]: { ...prev[category.id], slug: e.target.value }
                                }))}
                                className="w-40"
                              />
                            ) : (
                              category.slug
                            )}
                          </TableCell>
                          <TableCell>
                            {editingCategory?.id === category.id ? (
                              <Input
                                value={editData[category.id]?.name ?? category.name}
                                onChange={(e) => setEditData(prev => ({
                                  ...prev,
                                  [category.id]: { ...prev[category.id], name: e.target.value }
                                }))}
                                className="w-48"
                              />
                            ) : (
                              category.name
                            )}
                          </TableCell>
                          <TableCell>
                            {editingCategory?.id === category.id ? (
                              <Input
                                value={editData[category.id]?.description ?? category.description}
                                onChange={(e) => setEditData(prev => ({
                                  ...prev,
                                  [category.id]: { ...prev[category.id], description: e.target.value }
                                }))}
                                className="w-full"
                              />
                            ) : (
                              <span className="text-sm text-gray-600">{category.description}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingCategory?.id === category.id ? (
                              <Input
                                type="number"
                                value={editData[category.id]?.startingPrice ?? category.startingPrice}
                                onChange={(e) => setEditData(prev => ({
                                  ...prev,
                                  [category.id]: { ...prev[category.id], startingPrice: parseInt(e.target.value) || 0 }
                                }))}
                                className="w-32"
                              />
                            ) : (
                              `$${category.startingPrice?.toLocaleString()}`
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingCategory?.id === category.id ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    updateCategoryMutation.mutate({
                                      id: category.id,
                                      ...editData[category.id]
                                    });
                                  }}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCategory(null);
                                    setEditData(prev => {
                                      const newData = { ...prev };
                                      delete newData[category.id];
                                      return newData;
                                    });
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCategory(category);
                                    setEditData(prev => ({
                                      ...prev,
                                      [category.id]: {
                                        slug: category.slug,
                                        name: category.name,
                                        description: category.description,
                                        imageUrl: category.imageUrl,
                                        startingPrice: category.startingPrice
                                      }
                                    }));
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete the "${category.name}" category?`)) {
                                      deleteCategoryMutation.mutate(category.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models">
            <Card>
              <CardHeader>
                <CardTitle>Trailer Models</CardTitle>
                <CardDescription>
                  Update specifications and pricing for all trailer models
                </CardDescription>
              </CardHeader>
              <CardContent>
                {modelsLoading ? (
                  <div className="text-center py-8">Loading models...</div>
                ) : filteredModels && filteredModels.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model ID</TableHead>
                        <TableHead>Model Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>GVWR</TableHead>
                        <TableHead>Payload</TableHead>
                        <TableHead>Deck Size</TableHead>
                        <TableHead>Current Base Price</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredModels.map((model: TrailerModel) => (
                        <TableRow key={model.id}>
                          <TableCell className="font-medium">
                            {editingModel?.id === model.id ? (
                              <Input
                                value={editData[model.id]?.modelId ?? model.modelId}
                                onChange={(e) => setEditData(prev => ({
                                  ...prev,
                                  [model.id]: { ...prev[model.id], modelId: e.target.value }
                                }))}
                                className="w-24"
                              />
                            ) : (
                              model.modelId
                            )}
                          </TableCell>
                          <TableCell>
                            {editingModel?.id === model.id ? (
                              <Input
                                value={editData[model.id]?.name ?? model.name}
                                onChange={(e) => setEditData(prev => ({
                                  ...prev,
                                  [model.id]: { ...prev[model.id], name: e.target.value }
                                }))}
                                className="w-48"
                              />
                            ) : (
                              model.name
                            )}
                          </TableCell>
                          <TableCell>
                            {editingModel?.id === model.id ? (
                              <Select 
                                value={editData[model.id]?.categoryId?.toString() ?? model.categoryId.toString()}
                                onValueChange={(value) => setEditData(prev => ({
                                  ...prev,
                                  [model.id]: { ...prev[model.id], categoryId: parseInt(value) }
                                }))}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {trailerCategories?.map((category: any) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-gray-600">{model.categoryName}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingModel?.id === model.id ? (
                              <Input
                                value={editData[model.id]?.gvwr ?? model.gvwr}
                                onChange={(e) => setEditData(prev => ({
                                  ...prev,
                                  [model.id]: { ...prev[model.id], gvwr: e.target.value }
                                }))}
                                className="w-32"
                              />
                            ) : (
                              model.gvwr
                            )}
                          </TableCell>
                          <TableCell>
                            {editingModel?.id === model.id ? (
                              <Input
                                value={editData[model.id]?.payload ?? model.payload}
                                onChange={(e) => setEditData(prev => ({
                                  ...prev,
                                  [model.id]: { ...prev[model.id], payload: e.target.value }
                                }))}
                                className="w-32"
                              />
                            ) : (
                              model.payload
                            )}
                          </TableCell>
                          <TableCell>
                            {editingModel?.id === model.id ? (
                              <Input
                                value={editData[model.id]?.deckSize ?? model.deckSize}
                                onChange={(e) => setEditData(prev => ({
                                  ...prev,
                                  [model.id]: { ...prev[model.id], deckSize: e.target.value }
                                }))}
                                className="w-32"
                              />
                            ) : (
                              model.deckSize
                            )}
                          </TableCell>
                          <TableCell>
                            {editingModel?.id === model.id ? (
                              <Input
                                type="number"
                                value={editData[model.id]?.basePrice || model.basePrice}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    [model.id]: {
                                      ...editData[model.id],
                                      basePrice: parseInt(e.target.value) || 0,
                                    }
                                  })
                                }
                                className="w-32"
                              />
                            ) : (
                              `$${model.basePrice?.toLocaleString()}`
                            )}
                          </TableCell>
                          <TableCell>
                            {editingModel?.id === model.id ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleModelPriceUpdate(model)}
                                  disabled={updateModelMutation.isPending}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingModel(null);
                                    setEditData({});
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => archiveModelMutation.mutate(model.id)}
                                  disabled={archiveModelMutation.isPending}
                                  title="Archive model"
                                >
                                  <Archive className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingModel(model);
                                  setEditData({ [model.id]: { 
                                    basePrice: model.basePrice,
                                    name: model.name,
                                    modelId: model.modelId,
                                    gvwr: model.gvwr,
                                    payload: model.payload,
                                    deckSize: model.deckSize,
                                    categoryId: model.categoryId
                                  } });
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No trailer models found
                  </div>
                )}

                {/* Archived Models Section */}
                {archivedModels.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowArchivedModels(!showArchivedModels)}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        {showArchivedModels ? 'Hide' : 'Show'} Archived Models ({archivedModels.length})
                      </Button>
                    </div>
                    
                    {showArchivedModels && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Archived Models</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Model ID</TableHead>
                              <TableHead>Model Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>GVWR</TableHead>
                              <TableHead>Payload</TableHead>
                              <TableHead>Deck Size</TableHead>
                              <TableHead>Base Price</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {archivedModels.map((model: TrailerModel) => (
                              <TableRow key={model.id} className="opacity-60">
                                <TableCell className="font-medium">{model.modelId}</TableCell>
                                <TableCell>{model.name}</TableCell>
                                <TableCell>{model.categoryName}</TableCell>
                                <TableCell>{model.gvwr}</TableCell>
                                <TableCell>{model.payload}</TableCell>
                                <TableCell>{model.deckSize}</TableCell>
                                <TableCell>${model.basePrice?.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateModelMutation.mutate({ 
                                      id: model.id, 
                                      isArchived: false 
                                    })}
                                    disabled={updateModelMutation.isPending}
                                    title="Restore model"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Options & Add-ons</CardTitle>
                  <CardDescription>
                    Update pricing and details for trailer options and accessories
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddOption(true)} className="shrink-0">
                  Add New Option
                </Button>
              </CardHeader>
              <CardContent>
                {optionsLoading ? (
                  <div className="text-center py-8">Loading options...</div>
                ) : filteredOptions && filteredOptions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Option Name</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Related Models</TableHead>
                        <TableHead>Current Price</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOptions.map((option: TrailerOption) => (
                        <TableRow key={option.id}>
                          <TableCell className="font-medium">
                            {editingOption?.id === option.id ? (
                              <Select
                                value={editData[option.id]?.category || option.category}
                                onValueChange={(value) =>
                                  setEditData({
                                    ...editData,
                                    [option.id]: {
                                      ...editData[option.id],
                                      category: value,
                                    }
                                  })
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {optionCategories?.map((category: string) => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              option.category
                            )}
                          </TableCell>
                          <TableCell>
                            {editingOption?.id === option.id ? (
                              <Input
                                value={editData[option.id]?.name || option.name}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    [option.id]: {
                                      ...editData[option.id],
                                      name: e.target.value,
                                    }
                                  })
                                }
                                className="w-48"
                              />
                            ) : (
                              option.name
                            )}
                          </TableCell>
                          <TableCell>
                            {editingOption?.id === option.id ? (
                              <Input
                                value={editData[option.id]?.modelId || option.modelId}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    [option.id]: {
                                      ...editData[option.id],
                                      modelId: e.target.value,
                                    }
                                  })
                                }
                                className="w-24"
                              />
                            ) : (
                              option.modelId
                            )}
                          </TableCell>
                          <TableCell>
                            {editingOption?.id === option.id ? (
                              <div className="w-48">
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between">
                                      Select Models
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-0">
                                    <div className="max-h-64 overflow-y-auto p-4 space-y-2">
                                      {models?.map((model: TrailerModel) => (
                                        <div key={model.id} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`model-${model.id}-${option.id}`}
                                            checked={editData[option.id]?.relatedModels?.includes(model.modelId) || 
                                                    model.modelId === option.modelId || 
                                                    model.modelId.startsWith(option.modelId.substring(0, 3))}
                                            onCheckedChange={(checked: boolean) => {
                                              const currentRelated = editData[option.id]?.relatedModels || 
                                                models
                                                  .filter((m: TrailerModel) => 
                                                    m.modelId === option.modelId || 
                                                    m.modelId.startsWith(option.modelId.substring(0, 3))
                                                  )
                                                  .map((m: TrailerModel) => m.modelId);
                                              
                                              const updatedRelated = checked
                                                ? Array.from(new Set([...currentRelated, model.modelId]))
                                                : currentRelated.filter((id: string) => id !== model.modelId);
                                              
                                              setEditData(prev => ({
                                                ...prev,
                                                [option.id]: {
                                                  ...prev[option.id],
                                                  relatedModels: updatedRelated
                                                }
                                              }));
                                            }}
                                          />
                                          <label 
                                            htmlFor={`model-${model.id}-${option.id}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                          >
                                            {model.modelId}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            ) : (
                              <div className="max-w-48">
                                <span className="text-sm text-gray-600">
                                  {models ? 
                                    models
                                      .filter((model: TrailerModel) => 
                                        model.modelId === option.modelId || 
                                        model.modelId.startsWith(option.modelId.substring(0, 3))
                                      )
                                      .map((model: TrailerModel) => model.modelId)
                                      .join(", ") || option.modelId
                                    : "Loading..."
                                  }
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingOption?.id === option.id ? (
                              <Input
                                type="number"
                                value={editData[option.id]?.price || option.price}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    [option.id]: {
                                      ...editData[option.id],
                                      price: parseInt(e.target.value) || 0,
                                    }
                                  })
                                }
                                className="w-32"
                              />
                            ) : (
                              `$${option.price?.toLocaleString()}`
                            )}
                          </TableCell>
                          <TableCell>
                            {editingOption?.id === option.id ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleOptionUpdate(option)}
                                  disabled={updateOptionMutation.isPending}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingOption(null);
                                    setEditData({});
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingOption(option);
                                    setEditData({ 
                                      [option.id]: { 
                                        price: option.price,
                                        name: option.name,
                                        category: option.category,
                                        modelId: option.modelId,
                                        relatedModels: models
                                          ?.filter((model: TrailerModel) => 
                                            model.modelId === option.modelId || 
                                            model.modelId.startsWith(option.modelId.substring(0, 3))
                                          )
                                          .map((model: TrailerModel) => model.modelId) || [option.modelId]
                                      } 
                                    });
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => archiveOptionMutation.mutate(option.id)}
                                  disabled={archiveOptionMutation.isPending}
                                  title="Archive option"
                                >
                                  <Archive className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this option? This action cannot be undone.')) {
                                      deleteOptionMutation.mutate(option.id);
                                    }
                                  }}
                                  disabled={deleteOptionMutation.isPending}
                                  title="Delete option"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No options found
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Archived Options Table */}
            <Card className="mt-6">
              <CardHeader 
                className="cursor-pointer" 
                onClick={() => setShowArchivedOptions(!showArchivedOptions)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Archived Options ({archivedOptions.length})</CardTitle>
                    <CardDescription>
                      View and restore archived trailer options
                    </CardDescription>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${showArchivedOptions ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
              {showArchivedOptions && (
                <CardContent>
                  {archivedOptions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Option Name</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedOptions.map((option: TrailerOption) => (
                          <TableRow key={option.id} className="opacity-60">
                            <TableCell className="font-medium">{option.category}</TableCell>
                            <TableCell>{option.name}</TableCell>
                            <TableCell>{option.modelId}</TableCell>
                            <TableCell>${option.price?.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Restore option - remove archive status
                                    updateOptionMutation.mutate({ 
                                      id: option.id, 
                                      price: option.price,
                                      name: option.name,
                                      category: option.category,
                                      modelId: option.modelId,
                                      isArchived: false 
                                    });
                                  }}
                                  disabled={updateOptionMutation.isPending}
                                  title="Restore option"
                                  className="text-green-600 hover:text-green-700"
                                >
                                  Restore
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to permanently delete this archived option? This action cannot be undone.')) {
                                      deleteOptionMutation.mutate(option.id);
                                    }
                                  }}
                                  disabled={deleteOptionMutation.isPending}
                                  title="Delete option permanently"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No archived options found
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add New Option Dialog */}
        <Dialog open={showAddOption} onOpenChange={setShowAddOption}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Option</DialogTitle>
              <DialogDescription>
                Create a new option or add-on for trailer models
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="option-name">Option Name</Label>
                <Input
                  id="option-name"
                  placeholder="Enter option name"
                  value={newOptionData.name}
                  onChange={(e) => setNewOptionData({ ...newOptionData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="option-category">Category</Label>
                <Select
                  value={newOptionData.category}
                  onValueChange={(value) => setNewOptionData({ ...newOptionData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {optionCategories?.map((category: string) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="option-model">Model ID</Label>
                <Input
                  id="option-model"
                  placeholder="Enter model ID (e.g., DHV207)"
                  value={newOptionData.modelId}
                  onChange={(e) => setNewOptionData({ ...newOptionData, modelId: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="option-price">Price</Label>
                <Input
                  id="option-price"
                  type="number"
                  placeholder="Enter price"
                  value={newOptionData.price}
                  onChange={(e) => setNewOptionData({ ...newOptionData, price: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Related Models</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                  <div className="space-y-2">
                    {models?.map((model: TrailerModel) => (
                      <div key={model.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`new-model-${model.id}`}
                          checked={newOptionData.relatedModels.includes(model.modelId)}
                          onCheckedChange={(checked: boolean) => {
                            const updatedRelated = checked
                              ? [...newOptionData.relatedModels, model.modelId]
                              : newOptionData.relatedModels.filter(id => id !== model.modelId);
                            setNewOptionData({ ...newOptionData, relatedModels: updatedRelated });
                          }}
                        />
                        <label 
                          htmlFor={`new-model-${model.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {model.modelId} - {model.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Select which trailer models this option applies to
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAddOption(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createOptionMutation.mutate(newOptionData)}
                disabled={createOptionMutation.isPending || !newOptionData.name || !newOptionData.category}
              >
                {createOptionMutation.isPending ? "Creating..." : "Create Option"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}