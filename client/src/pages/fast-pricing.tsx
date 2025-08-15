import { useState, useMemo } from "react";
import { ArrowLeft, Edit, Save, X, Archive, RotateCcw, Upload, Image } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFastQuery } from "@/hooks/useFastQuery";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Minimal UI components for maximum performance
const Button = ({ children, onClick, disabled, variant = 'default', size = 'default', ...props }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors
      ${variant === 'outline' ? 'border border-gray-300 bg-white hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'}
      ${size === 'sm' ? 'px-2 py-1 text-xs' : ''}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    {...props}
  >
    {children}
  </button>
);

const Input = ({ className = '', ...props }: any) => (
  <input
    className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

const Select = ({ value, onValueChange, children }: any) => (
  <select
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  >
    {children}
  </select>
);

const SelectTrigger = ({ children }: any) => <>{children}</>;
const SelectValue = () => null;
const SelectContent = ({ children }: any) => <>{children}</>;
const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
    {children}
  </div>
);

const Table = ({ children }: any) => (
  <div className="overflow-auto">
    <table className="w-full border-collapse">
      {children}
    </table>
  </div>
);

const TableHeader = ({ children }: any) => <thead className="bg-gray-50">{children}</thead>;
const TableBody = ({ children }: any) => <tbody className="divide-y divide-gray-200">{children}</tbody>;
const TableRow = ({ children, className = '' }: any) => <tr className={className}>{children}</tr>;
const TableHead = ({ children }: any) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>;
const TableCell = ({ children, className = '' }: any) => <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;

// Fast mutations with minimal overhead
const fastMutate = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export default function FastPricing() {
  const [activeTab, setActiveTab] = useState("models");
  const [editingModel, setEditingModel] = useState<any>(null);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [uploadingModelId, setUploadingModelId] = useState<number | null>(null);

  const sessionId = localStorage.getItem("admin_session");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: models = [], isLoading, error: modelsError } = useFastQuery.allModels(sessionId);
  const { data: options = [], error: optionsError } = useFastQuery.allOptions(sessionId);

  // Fast filtering with memoization
  const { activeModels, archivedModels } = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = models.filter((model: any) => 
      !query || 
      model.name.toLowerCase().includes(query) ||
      model.modelId.toLowerCase().includes(query) ||
      model.categoryName.toLowerCase().includes(query)
    );
    
    return {
      activeModels: filtered.filter((m: any) => !m.isArchived),
      archivedModels: filtered.filter((m: any) => m.isArchived)
    };
  }, [models, searchQuery]);

  // Fast mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => fastMutate(`/api/models/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionId}`,
      },
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
      setEditingModel(null);
      setEditData({});
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/models/${id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionId}` },
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'models'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/models/${id}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionId}` },
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'models'] }),
  });

  const handleUpdate = (model: any) => {
    const data = editData[model.id] || {};
    updateMutation.mutate({
      id: model.id,
      modelId: data.modelId ?? model.modelId,
      name: data.name ?? model.name,
      categoryId: data.categoryId ?? model.categoryId,
      basePrice: data.basePrice ?? model.basePrice,
    });
  };

  // Options update mutation
  const updateOptionMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => fastMutate(`/api/options/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionId}`,
      },
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'options'] });
      setEditingOption(null);
      setEditData({});
    },
  });

  const handleOptionUpdate = (option: any) => {
    const data = editData[option.id] || {};
    const modelIds = data.modelIds || [option.modelId];
    
    // For now, update the first model association
    // In a full implementation, you might need to handle multiple model associations
    updateOptionMutation.mutate({
      id: option.id,
      name: data.name ?? option.name,
      modelId: modelIds[0] || option.modelId,
      category: data.category ?? option.category,
      price: data.price ?? option.price,
    });
  };

  // Image upload handlers
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("/api/models/upload-url", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionId}`,
      },
    });
    return {
      method: "PUT" as const,
      url: response.uploadURL,
    };
  };

  const handleImageUploadComplete = async (modelId: number, result: any) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile) {
        throw new Error("No file uploaded");
      }

      const imageUrl = uploadedFile.uploadURL;
      
      // Update the model with the new image URL
      await apiRequest(`/api/models/${modelId}/image`, {
        method: "PATCH",
        body: { imageUrl },
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });

      // Refresh the models data
      queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
      
      toast({
        title: "Success",
        description: "Model image uploaded successfully",
      });
      
      setUploadingModelId(null);
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      setUploadingModelId(null);
    }
  };

  // Handle authentication errors
  if (modelsError || optionsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access the pricing management.</p>
          <Link href="/admin/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Product Management</h1>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("models")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "models"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Models
              </button>
              <button
                onClick={() => setActiveTab("options")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "options"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Options & Extras
              </button>
            </nav>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <Input
            placeholder={activeTab === "models" ? "Search models..." : "Search options..."}
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Models table */}
        {activeTab === "models" && (
          <>
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Models ({activeModels.length})</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeModels.map((model: any) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">
                      {editingModel?.id === model.id ? (
                        <Input
                          value={editData[model.id]?.modelId ?? model.modelId}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], modelId: e.target.value }
                          })}
                        />
                      ) : (
                        model.modelId
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Input
                          value={editData[model.id]?.name ?? model.name}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], name: e.target.value }
                          })}
                        />
                      ) : (
                        model.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Select
                          value={editData[model.id]?.categoryId?.toString() ?? model.categoryId?.toString()}
                          onValueChange={(value) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], categoryId: parseInt(value) }
                          })}
                        >
                          <SelectItem value="6">Gooseneck Trailers</SelectItem>
                          <SelectItem value="7">Car/Equipment Haulers</SelectItem>
                          <SelectItem value="8">Dump Trailers</SelectItem>
                          <SelectItem value="9">Landscape Trailers</SelectItem>
                          <SelectItem value="10">Utility Trailers</SelectItem>
                          <SelectItem value="11">Specialty Trailers</SelectItem>
                        </Select>
                      ) : (
                        model.categoryName
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Input
                          type="number"
                          value={editData[model.id]?.basePrice ?? model.basePrice}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], basePrice: parseInt(e.target.value) }
                          })}
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
                            onClick={() => handleUpdate(model)}
                            disabled={updateMutation.isPending}
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
                            onClick={() => archiveMutation.mutate(model.id)}
                            disabled={archiveMutation.isPending}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingModel(model)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <ObjectUploader
                            onGetUploadParameters={handleGetUploadParameters}
                            onComplete={(result) => handleImageUploadComplete(model.id, result)}
                          >
                            {model.imageUrl ? (
                              <Image className="w-4 h-4" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                          </ObjectUploader>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                </Table>
              </div>
            </Card>

            {/* Archived section */}
            {archivedModels.length > 0 && (
              <Card className="mt-6">
                <div className="p-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchived(!showArchived)}
                    className="mb-4"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {showArchived ? 'Hide' : 'Show'} Archived ({archivedModels.length})
                  </Button>
                  
                  {showArchived && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedModels.map((model: any) => (
                          <TableRow key={model.id} className="opacity-60">
                            <TableCell>{model.modelId}</TableCell>
                            <TableCell>{model.name}</TableCell>
                            <TableCell>{model.categoryName}</TableCell>
                            <TableCell>${model.basePrice?.toLocaleString()}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreMutation.mutate(model.id)}
                                disabled={restoreMutation.isPending}
                                title="Restore to active"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Options & Extras Tab */}
        {activeTab === "options" && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Options & Extras ({options.length})</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options
                    .filter((option: any) => 
                      !searchQuery || 
                      option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      option.modelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      option.category.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((option: any) => (
                    <TableRow key={option.id}>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <Input
                            value={editData[option.id]?.name ?? option.name}
                            onChange={(e: any) => setEditData({
                              ...editData,
                              [option.id]: { ...editData[option.id], name: e.target.value }
                            })}
                          />
                        ) : (
                          option.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {activeModels.map((model: any) => (
                              <label key={model.id} className="flex items-center space-x-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={editData[option.id]?.modelIds?.includes(model.modelId) ?? option.modelId === model.modelId}
                                  onChange={(e) => {
                                    const currentModelIds = editData[option.id]?.modelIds ?? (option.modelId === model.modelId ? [option.modelId] : []);
                                    const newModelIds = e.target.checked 
                                      ? [...currentModelIds.filter((id: string) => id !== model.modelId), model.modelId]
                                      : currentModelIds.filter((id: string) => id !== model.modelId);
                                    setEditData({
                                      ...editData,
                                      [option.id]: { ...editData[option.id], modelIds: newModelIds }
                                    });
                                  }}
                                  className="rounded"
                                />
                                <span>{model.modelId}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          option.modelId
                        )}
                      </TableCell>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <Select
                            value={editData[option.id]?.category ?? option.category}
                            onValueChange={(value) => setEditData({
                              ...editData,
                              [option.id]: { ...editData[option.id], category: value }
                            })}
                          >
                            <SelectItem value="tires">Tires</SelectItem>
                            <SelectItem value="ramps">Ramps</SelectItem>
                            <SelectItem value="color">Color</SelectItem>
                            <SelectItem value="extras">Extras</SelectItem>
                            <SelectItem value="deck">Deck</SelectItem>
                            <SelectItem value="walls">Walls</SelectItem>
                            <SelectItem value="winch">Winch</SelectItem>
                            <SelectItem value="wheels">Wheels</SelectItem>
                            <SelectItem value="brakes">Brakes</SelectItem>
                            <SelectItem value="hitch">Hitch</SelectItem>
                          </Select>
                        ) : (
                          option.category
                        )}
                      </TableCell>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <Input
                            type="number"
                            value={editData[option.id]?.price ?? option.price}
                            onChange={(e: any) => setEditData({
                              ...editData,
                              [option.id]: { ...editData[option.id], price: parseInt(e.target.value) }
                            })}
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
                            onClick={() => setEditingOption(option)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}