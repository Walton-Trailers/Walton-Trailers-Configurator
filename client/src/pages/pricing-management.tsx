import { useState } from "react";
import { ArrowLeft, Edit, Save, X, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
}

interface TrailerOption {
  id: number;
  name: string;
  price: number;
  category: string;
  description?: string;
}

export default function PricingManagement() {
  const { user, isLoading: authLoading } = useAdminAuth();
  const [editingModel, setEditingModel] = useState<TrailerModel | null>(null);
  const [editingOption, setEditingOption] = useState<TrailerOption | null>(null);
  const [editPrices, setEditPrices] = useState<{ [key: number]: number }>({});
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

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: (data: { id: number; basePrice: number; name: string }) =>
      apiRequest(`/api/models/${data.id}`, {
        method: "PATCH",
        body: { basePrice: data.basePrice, name: data.name },
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models/all"] });
      setEditingModel(null);
      setEditPrices({});
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
    mutationFn: (data: { id: number; price: number; name: string }) =>
      apiRequest(`/api/options/${data.id}`, {
        method: "PATCH",
        body: { price: data.price, name: data.name },
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/options/all"] });
      setEditingOption(null);
      setEditPrices({});
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

  const handleModelPriceUpdate = (model: TrailerModel) => {
    const newPrice = editPrices[model.id] || model.basePrice;
    updateModelMutation.mutate({ id: model.id, basePrice: newPrice, name: model.name });
  };

  const handleOptionPriceUpdate = (option: TrailerOption) => {
    const newPrice = editPrices[option.id] || option.price;
    updateOptionMutation.mutate({ 
      id: option.id, 
      price: newPrice, 
      name: option.name
    });
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to access pricing management.</div>;
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
              <h1 className="text-2xl font-bold text-gray-900">Pricing Management</h1>
              <p className="text-gray-600">Update trailer and option pricing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{user.role}</span>
            <span>{user.username}</span>
          </div>
        </div>

        <Tabs defaultValue="models" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="models" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Trailer Model Pricing
            </TabsTrigger>
            <TabsTrigger value="options" className="flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Options & Add-ons
            </TabsTrigger>
          </TabsList>

          <TabsContent value="models">
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
                ) : models && models.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Model ID</TableHead>
                        <TableHead>Model Name</TableHead>
                        <TableHead>GVWR</TableHead>
                        <TableHead>Payload</TableHead>
                        <TableHead>Deck Size</TableHead>
                        <TableHead>Current Base Price</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((model: TrailerModel) => (
                        <TableRow key={model.id}>
                          <TableCell className="font-medium">
                            {model.modelId}
                          </TableCell>
                          <TableCell>{model.name}</TableCell>
                          <TableCell>{model.gvwr}</TableCell>
                          <TableCell>{model.payload}</TableCell>
                          <TableCell>{model.deckSize}</TableCell>
                          <TableCell>
                            {editingModel?.id === model.id ? (
                              <Input
                                type="number"
                                value={editPrices[model.id] || model.basePrice}
                                onChange={(e) =>
                                  setEditPrices({
                                    ...editPrices,
                                    [model.id]: parseInt(e.target.value) || 0,
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
                                    setEditPrices({});
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
                                  setEditPrices({ [model.id]: model.basePrice });
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
                <CardTitle>Options & Add-ons Pricing</CardTitle>
                <CardDescription>
                  Update pricing for trailer options and accessories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {optionsLoading ? (
                  <div className="text-center py-8">Loading options...</div>
                ) : options && options.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Option Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Current Price</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {options.map((option: TrailerOption) => (
                        <TableRow key={option.id}>
                          <TableCell className="font-medium">
                            {option.category}
                          </TableCell>
                          <TableCell>{option.name}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            Model: {option.modelId}
                          </TableCell>
                          <TableCell>
                            {editingOption?.id === option.id ? (
                              <Input
                                type="number"
                                value={editPrices[option.id] || option.price}
                                onChange={(e) =>
                                  setEditPrices({
                                    ...editPrices,
                                    [option.id]: parseInt(e.target.value) || 0,
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
                                  onClick={() => handleOptionPriceUpdate(option)}
                                  disabled={updateOptionMutation.isPending}
                                >
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingOption(null);
                                    setEditPrices({});
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
                                  setEditPrices({ [option.id]: option.price });
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