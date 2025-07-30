import { useState, useMemo } from "react";
import { ArrowLeft, Edit, Save, X, DollarSign, Search } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

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
}

interface TrailerOption {
  id: number;
  modelId: string;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export default function PricingManagement() {
  const { user, isLoading: authLoading } = useAdminAuth();
  const [editingModel, setEditingModel] = useState<TrailerModel | null>(null);
  const [editingOption, setEditingOption] = useState<TrailerOption | null>(null);
  const [editData, setEditData] = useState<{ [key: number]: any }>({});
  const [searchQuery, setSearchQuery] = useState("");
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

  // Fetch all trailer categories for the dropdown
  const { data: trailerCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories"),
  });



  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: (data: { id: number; basePrice?: number; name?: string; modelId?: string; gvwr?: string; payload?: string; deckSize?: string; categoryId?: number }) =>
      apiRequest(`/api/models/${data.id}`, {
        method: "PATCH",
        body: { 
          basePrice: data.basePrice, 
          name: data.name, 
          modelId: data.modelId, 
          gvwr: data.gvwr, 
          payload: data.payload, 
          deckSize: data.deckSize,
          categoryId: data.categoryId
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
    mutationFn: (data: { id: number; price?: number; name?: string; category?: string; modelId?: string }) =>
      apiRequest(`/api/options/${data.id}`, {
        method: "PATCH",
        body: { 
          price: data.price, 
          name: data.name, 
          category: data.category, 
          modelId: data.modelId 
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

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!options || !searchQuery.trim()) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter((option: TrailerOption) => 
      option.category.toLowerCase().includes(query) ||
      option.name.toLowerCase().includes(query) ||
      option.modelId.toLowerCase().includes(query) ||
      option.price.toString().includes(query)
    );
  }, [options, searchQuery]);

  // Filter models based on search query
  const filteredModels = useMemo(() => {
    if (!models || !searchQuery.trim()) return models;
    
    const query = searchQuery.toLowerCase();
    return models.filter((model: TrailerModel) => 
      model.name.toLowerCase().includes(query) ||
      model.modelId.toLowerCase().includes(query) ||
      model.basePrice.toString().includes(query) ||
      model.gvwr.toString().includes(query) ||
      model.categoryName.toLowerCase().includes(query)
    );
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

        <Tabs defaultValue="models" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle>Options & Add-ons</CardTitle>
                <CardDescription>
                  Update pricing and details for trailer options and accessories
                </CardDescription>
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
                                      modelId: option.modelId
                                    } 
                                  });
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
                    No options found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}