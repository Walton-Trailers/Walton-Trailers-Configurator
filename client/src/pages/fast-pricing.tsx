import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Edit, Save, X, Archive, RotateCcw, Upload, Image, Trash2, Plus } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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

// Utility function to validate hex color format
const isValidHex = (hex: string): boolean => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(hex);
};

// Fast mutations with minimal overhead
const fastMutate = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export default function FastPricing() {
  const [activeTab, setActiveTab] = useState("categories");
  const [editingModel, setEditingModel] = useState<any>(null);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showArchivedCategories, setShowArchivedCategories] = useState(false);
  const [showArchivedSeries, setShowArchivedSeries] = useState(false);
  const [uploadingModelId, setUploadingModelId] = useState<number | null>(null);
  const [uploadingCategoryId, setUploadingCategoryId] = useState<number | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    slug: "",
    name: "",
    description: "",
    imageUrl: "",
    startingPrice: "",
    orderIndex: 0
  });
  const [editingSeries, setEditingSeries] = useState<any>(null);
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [showAddSeries, setShowAddSeries] = useState(false);
  const [seriesSelection, setSeriesSelection] = useState<Record<number, string>>({});
  const [newSeriesData, setNewSeriesData] = useState({
    categoryId: 0,
    name: "",
    description: "",
    slug: "",
    basePrice: "",
    imageUrl: ""
  });
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModelData, setNewModelData] = useState({
    categoryId: 0,
    seriesId: null as number | null,
    modelSeries: "",
    name: "",
    pullType: "",
    imageUrl: "",
    standardFeatures: [] as string[],
    basePrice: "",
    gvwr: "",
    payload: "",
    deckSize: "",
    axles: ""
  });
  const [showAddOption, setShowAddOption] = useState(false);
  const [showArchivedOptions, setShowArchivedOptions] = useState(false);
  const [newOptionData, setNewOptionData] = useState({
    name: "",
    modelIds: [] as string[],
    category: "extras",
    price: "",
    imageUrl: "",
    isMultiSelect: false,
    hexColor: "",
    primerPrice: ""
  });
  const [addingLengthFor, setAddingLengthFor] = useState<number | null>(null);
  const [newLengthValue, setNewLengthValue] = useState("");

  // Helper functions for managing length options and their pull types
  const addLengthOption = (modelId: number, lengthValue: string) => {
    if (!lengthValue.trim()) return;
    
    const currentLengthOptions = editData[modelId]?.lengthOptions || 
      (typeof (models.find(m => m.id === modelId)?.lengthOptions) === 'string' 
        ? JSON.parse(models.find(m => m.id === modelId)?.lengthOptions || '[]')
        : models.find(m => m.id === modelId)?.lengthOptions || []);
    
    const newLengthOptions = [...currentLengthOptions, lengthValue.trim()];
    
    // Initialize pull type options for this new length
    const currentPulltypeOptions = editData[modelId]?.pulltypeOptions || 
      models.find(m => m.id === modelId)?.pulltypeOptions || {};
    
    const newPulltypeOptions = {
      ...currentPulltypeOptions,
      [lengthValue.trim()]: "" // Initialize with empty string
    };
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthOptions: newLengthOptions,
        pulltypeOptions: newPulltypeOptions
      }
    });
    
    setNewLengthValue("");
    setAddingLengthFor(null);
  };

  const removeLengthOption = (modelId: number, indexToRemove: number) => {
    const currentLengthOptions = editData[modelId]?.lengthOptions || 
      (typeof (models.find(m => m.id === modelId)?.lengthOptions) === 'string' 
        ? JSON.parse(models.find(m => m.id === modelId)?.lengthOptions || '[]')
        : models.find(m => m.id === modelId)?.lengthOptions || []);
    
    const lengthToRemove = currentLengthOptions[indexToRemove];
    const newLengthOptions = currentLengthOptions.filter((_: any, index: number) => index !== indexToRemove);
    
    // Remove the pull type option for this length as well
    const currentPulltypeOptions = editData[modelId]?.pulltypeOptions || 
      models.find(m => m.id === modelId)?.pulltypeOptions || {};
    
    const newPulltypeOptions = { ...currentPulltypeOptions };
    delete newPulltypeOptions[lengthToRemove];
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthOptions: newLengthOptions,
        pulltypeOptions: newPulltypeOptions
      }
    });
  };

  const updatePullTypeForLength = (modelId: number, length: string, pullType: string) => {
    const currentPulltypeOptions = editData[modelId]?.pulltypeOptions || 
      models.find(m => m.id === modelId)?.pulltypeOptions || {};
    
    const newPulltypeOptions = {
      ...currentPulltypeOptions,
      [length]: pullType
    };
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        pulltypeOptions: newPulltypeOptions
      }
    });
  };

  const sessionId = localStorage.getItem("admin_session");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: models = [], isLoading, error: modelsError } = useFastQuery.allModels(sessionId);
  const { data: options = [], error: optionsError } = useFastQuery.allOptions(sessionId);
  const { data: categories = [] } = useFastQuery.categories(sessionId);

  // Separate active and archived options
  const activeOptions = options.filter(option => !option.isArchived);
  const archivedOptions = options.filter(option => option.isArchived);
  
  // Fetch option categories dynamically from database
  const { data: optionCategories = [] } = useQuery({
    queryKey: ['/api/categories', 'options'],
    queryFn: async () => {
      const response = await fetch('/api/categories/options', {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
  });

  // Fetch series data
  const fetchSeries = async () => {
    try {
      const response = await fetch('/api/series/all');
      const data = await response.json();
      setSeriesData(data);
    } catch (error) {
      console.error('Failed to fetch series:', error);
    }
  };

  // Load series on mount and when tab changes
  useEffect(() => {
    if (activeTab === 'series' || activeTab === 'models') {
      fetchSeries();
    }
  }, [activeTab]);

  // Series mutations
  const addSeriesMutation = useMutation({
    mutationFn: (data: any) => {
      const processedData = {
        ...data,
        basePrice: parseFloat(data.basePrice) || 0
      };
      return fastMutate('/api/series', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(processedData),
      });
    },
    onSuccess: () => {
      fetchSeries();
      setShowAddSeries(false);
      setNewSeriesData({ categoryId: 0, name: "", description: "", slug: "", basePrice: "", imageUrl: "" });
      toast({ title: "Success", description: "Series added successfully" });
    },
  });

  const updateSeriesMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => fastMutate(`/api/series/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionId}`,
      },
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      fetchSeries();
      setEditingSeries(null);
      toast({ title: "Success", description: "Series updated successfully" });
    },
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/series/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${sessionId}`,
      },
    }),
    onSuccess: () => {
      fetchSeries();
      toast({ title: "Success", description: "Series deleted successfully" });
    },
  });

  // Model mutations
  const addModelMutation = useMutation({
    mutationFn: (data: any) => {
      const processedData = {
        ...data,
        basePrice: parseFloat(data.basePrice) || 0
      };
      return fastMutate('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(processedData),
      });
    },
    onSuccess: () => {
      // Invalidate multiple related queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setShowAddModel(false);
      setNewModelData({
        categoryId: 0,
        seriesId: null,
        modelSeries: "",
        name: "",
        pullType: "",
        imageUrl: "",
        standardFeatures: [],
        basePrice: "",
        gvwr: "",
        payload: "",
        deckSize: "",
        axles: ""
      });
      toast({ title: "Success", description: "Model added successfully" });
    },
  });


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

  // Filter categories into active and archived
  const { activeCategories, archivedCategories } = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = categories.filter((cat: any) => 
      !query || 
      cat.name.toLowerCase().includes(query) ||
      cat.slug.toLowerCase().includes(query) ||
      cat.description.toLowerCase().includes(query)
    );
    
    return {
      activeCategories: filtered.filter((c: any) => !c.isArchived),
      archivedCategories: filtered.filter((c: any) => c.isArchived)
    };
  }, [categories, searchQuery]);

  // Filter series into active and archived
  const { activeSeries, archivedSeries } = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = seriesData.filter((series: any) => 
      !query || 
      series.name.toLowerCase().includes(query) ||
      series.slug.toLowerCase().includes(query) ||
      series.description.toLowerCase().includes(query)
    );
    
    return {
      activeSeries: filtered.filter((s: any) => !s.isArchived),
      archivedSeries: filtered.filter((s: any) => s.isArchived)
    };
  }, [seriesData, searchQuery]);

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
      setSeriesSelection({}); // Clear series selection state
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

  // Category archive/restore mutations
  const archiveCategoryMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/categories/${id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionId}` },
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const restoreCategoryMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/categories/${id}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionId}` },
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  // Series archive/restore mutations
  const archiveSeriesMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/series/${id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionId}` },
    }),
    onSuccess: () => fetchSeries(),
  });

  const restoreSeriesMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/series/${id}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionId}` },
    }),
    onSuccess: () => fetchSeries(),
  });

  const handleUpdate = (model: any) => {
    const data = editData[model.id] || {};
    const selectedSeriesName = seriesSelection[model.id];
    
    // Convert series name to series_id by looking it up in seriesData
    let seriesId = null;
    if (selectedSeriesName && selectedSeriesName !== "No Series") {
      const foundSeries = seriesData.find(series => series.name === selectedSeriesName);
      seriesId = foundSeries ? foundSeries.id : null;
    }
    
    updateMutation.mutate({
      id: model.id,
      modelId: data.modelId ?? model.modelId,
      name: data.name ?? model.name,
      categoryId: data.categoryId ?? model.categoryId,
      basePrice: data.basePrice ?? model.basePrice,
      seriesId: seriesId, // Use the foreign key instead of text
      gvwr: data.gvwr ?? model.gvwr,
      payload: data.payload ?? model.payload,
      deckSize: data.deckSize ?? model.deckSize,
      axles: data.axles ?? model.axles,
      lengthOptions: data.lengthOptions ?? model.lengthOptions,
      pulltypeOptions: data.pulltypeOptions ?? model.pulltypeOptions,
    });
  };

  // Option mutations
  const addOptionMutation = useMutation({
    mutationFn: (data: any) => fastMutate('/api/options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionId}`,
      },
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'options'] });
      queryClient.invalidateQueries({ queryKey: ['options'] });
      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'options'] });
      setShowAddOption(false);
      setNewOptionData({
        name: "",
        modelIds: [],
        category: "extras",
        price: "",
        imageUrl: "",
        isMultiSelect: false,
        hexColor: "",
        primerPrice: ""
      });
      toast({ title: "Success", description: "Option added successfully" });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'options'] });
      setEditingOption(null);
      setEditData({});
    },
  });

  // Options delete mutation
  const deleteOptionMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/options/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${sessionId}`,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'options'] });
      toast({ title: "Success", description: "Option deleted successfully" });
    },
  });

  const archiveOptionMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/options/${id}/archive`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionId}`,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'options'] });
      toast({ title: "Success", description: "Option archived successfully" });
    },
  });

  const restoreOptionMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/options/${id}/restore`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${sessionId}`,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'options'] });
      toast({ title: "Success", description: "Option restored successfully" });
    },
  });

  const handleOptionUpdate = (option: any) => {
    const data = editData[option.id] || {};
    const applicableModels = data.modelIds || option.applicableModels || [option.modelId];
    
    updateOptionMutation.mutate({
      id: option.id,
      name: data.name ?? option.name,
      modelId: applicableModels[0] || option.modelId, // Legacy field for backward compatibility
      applicableModels: applicableModels, // New field for multiple models
      category: data.category ?? option.category,
      price: data.price ?? option.price,
    });
    
    // Clear editing state
    setEditingOption(null);
    setEditData({});
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

  // Option image upload handlers
  const handleGetCategoryUploadParameters = async () => {
    const response = await apiRequest("/api/categories/upload-url", {
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
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });

      // Refresh the categories list
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      
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

  const handleGetOptionUploadParameters = async () => {
    const response = await apiRequest("/api/options/upload-url", {
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

  const handleOptionImageUploadComplete = async (optionId: number, result: any) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile) {
        throw new Error("No file uploaded");
      }

      const imageUrl = uploadedFile.uploadURL;
      
      // Update the option with the new image URL
      await apiRequest(`/api/options/${optionId}/image`, {
        method: "PATCH",
        body: { imageUrl },
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });

      // Refresh the options data
      queryClient.invalidateQueries({ queryKey: ['admin', 'options'] });
      queryClient.invalidateQueries({ queryKey: ['/api/options/all'] });
      
      toast({
        title: "Success",
        description: "Option image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading option image:", error);
      toast({
        title: "Error",
        description: "Failed to upload option image",
        variant: "destructive",
      });
    }
  };

  // Series image upload handlers
  const handleGetSeriesUploadParameters = async () => {
    const response = await apiRequest("/api/series/upload-url", {
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

  const handleSeriesImageUploadComplete = async (seriesId: number, result: any) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile) {
        throw new Error("No file uploaded");
      }

      const imageUrl = uploadedFile.uploadURL;
      
      // Update the series with the new image URL
      await apiRequest(`/api/series/${seriesId}/image`, {
        method: "PATCH",
        body: { imageUrl },
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });

      // Refresh the series data
      fetchSeries();
      
      toast({
        title: "Success",
        description: "Series image uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading series image:", error);
      toast({
        title: "Error",
        description: "Failed to upload series image",
        variant: "destructive",
      });
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
                onClick={() => setActiveTab("categories")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "categories"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveTab("series")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "series"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Series
              </button>
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
            placeholder={activeTab === "categories" ? "Search categories..." : activeTab === "models" ? "Search models..." : "Search options..."}
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Categories table */}
        {activeTab === "categories" && (
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Categories ({categories.length})</h2>
                <Button onClick={() => setShowAddCategory(true)} size="sm">
                  Add Category
                </Button>
              </div>
              
              {/* Add Category Dialog */}
              {showAddCategory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                    <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Slug (URL)</label>
                          <Input
                            placeholder="e.g., dump-trailers"
                            value={newCategoryData.slug}
                            onChange={(e: any) => setNewCategoryData({ ...newCategoryData, slug: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Name</label>
                          <Input
                            placeholder="e.g., Dump Trailers"
                            value={newCategoryData.name}
                            onChange={(e: any) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Input
                          placeholder="Category description"
                          value={newCategoryData.description}
                          onChange={(e: any) => setNewCategoryData({ ...newCategoryData, description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Image URL</label>
                          <Input
                            placeholder="https://..."
                            value={newCategoryData.imageUrl}
                            onChange={(e: any) => setNewCategoryData({ ...newCategoryData, imageUrl: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Starting Price</label>
                          <Input
                            type="number"
                            placeholder="Enter starting price"
                            value={String(newCategoryData.startingPrice)}
                            onChange={(e: any) => setNewCategoryData({ ...newCategoryData, startingPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Order Index</label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={newCategoryData.orderIndex}
                          onChange={(e: any) => setNewCategoryData({ ...newCategoryData, orderIndex: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
                      <Button 
                        onClick={async () => {
                          try {
                            const processedData = {
                              ...newCategoryData,
                              startingPrice: parseFloat(newCategoryData.startingPrice as string) || 0
                            };
                            await apiRequest("/api/categories", {
                              method: "POST",
                              body: processedData,
                              headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
                            });
                            queryClient.invalidateQueries({ queryKey: ['categories'] });
                            setShowAddCategory(false);
                            setNewCategoryData({
                              slug: "",
                              name: "",
                              description: "",
                              imageUrl: "",
                              startingPrice: "",
                              orderIndex: 0
                            });
                            toast({
                              title: "Success",
                              description: "Category created successfully",
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Failed to create category",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Create Category
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Starting Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeCategories.map((category: any) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          {editingCategory?.id === category.id ? (
                            <Input
                              type="number"
                              value={editData[category.id]?.orderIndex ?? category.orderIndex ?? 0}
                              onChange={(e: any) => setEditData((prev: any) => ({
                                ...prev,
                                [category.id]: { ...prev[category.id], orderIndex: parseInt(e.target.value) || 0 }
                              }))}
                              className="w-20"
                            />
                          ) : (
                            category.orderIndex ?? 0
                          )}
                        </TableCell>
                        <TableCell>
                          <ObjectUploader
                            onGetUploadParameters={handleGetCategoryUploadParameters}
                            onComplete={(result) => handleCategoryImageUploadComplete(category.id, result)}
                            buttonClassName="p-0"
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
                              onChange={(e: any) => setEditData((prev: any) => ({
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
                              onChange={(e: any) => setEditData((prev: any) => ({
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
                              onChange={(e: any) => setEditData((prev: any) => ({
                                ...prev,
                                [category.id]: { ...prev[category.id], description: e.target.value }
                              }))}
                              className="w-full"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">{category.description}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCategory?.id === category.id ? (
                            <Input
                              type="number"
                              value={editData[category.id]?.startingPrice ?? category.startingPrice}
                              onChange={(e: any) => setEditData((prev: any) => ({
                                ...prev,
                                [category.id]: { ...prev[category.id], startingPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }
                              }))}
                              className="w-32"
                            />
                          ) : (
                            `$${category.startingPrice?.toLocaleString()}`
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCategory?.id === category.id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const processedEditData = {
                                      ...editData[category.id],
                                      startingPrice: parseFloat(editData[category.id]?.startingPrice) || 0
                                    };
                                    await apiRequest(`/api/categories/${category.id}`, {
                                      method: "PATCH",
                                      body: processedEditData,
                                      headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
                                    });
                                    queryClient.invalidateQueries({ queryKey: ['categories'] });
                                    setEditingCategory(null);
                                    setEditData({});
                                    toast({
                                      title: "Success",
                                      description: "Category updated successfully",
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to update category",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => archiveCategoryMutation.mutate(category.id)}
                                disabled={archiveCategoryMutation.isPending}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategory(null);
                                  setEditData((prev: any) => {
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
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingCategory(category);
                                  setEditData((prev: any) => ({
                                    ...prev,
                                    [category.id]: {
                                      slug: category.slug,
                                      name: category.name,
                                      description: category.description,
                                      imageUrl: category.imageUrl,
                                      startingPrice: category.startingPrice,
                                      orderIndex: category.orderIndex
                                    }
                                  }));
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>

            {/* Archived Categories section */}
            {archivedCategories.length > 0 && (
              <Card className="mt-6">
                <div className="p-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchivedCategories(!showArchivedCategories)}
                    className="mb-4"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {showArchivedCategories ? 'Hide' : 'Show'} Archived ({archivedCategories.length})
                  </Button>
                  
                  {showArchivedCategories && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Image</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Starting Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedCategories.map((category: any) => (
                          <TableRow key={category.id} className="opacity-60">
                            <TableCell>{category.orderIndex ?? 0}</TableCell>
                            <TableCell>
                              {category.imageUrl ? (
                                <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200">
                                  <img 
                                    src={category.imageUrl} 
                                    alt={category.name}
                                    className="w-full h-full object-cover opacity-60"
                                    onError={(e: any) => {
                                      e.target.onerror = null;
                                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"%3E%3Crect width="48" height="48" fill="%23f3f4f6"/%3E%3Cpath stroke="%239ca3af" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M24 16v16m-8-8h16"/%3E%3C/svg%3E';
                                    }}
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>{category.slug}</TableCell>
                            <TableCell>{category.name}</TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">{category.description}</span>
                            </TableCell>
                            <TableCell>${category.startingPrice?.toLocaleString()}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreCategoryMutation.mutate(category.id)}
                                disabled={restoreCategoryMutation.isPending}
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
          </Card>
        )}

        {/* Series Tab */}
        {activeTab === "series" && (
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Series ({activeSeries.length})</h2>
                <Button onClick={() => setShowAddSeries(true)} size="sm">
                  Add Series
                </Button>
              </div>
              
              
              {/* Add Series Dialog */}
              {showAddSeries && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                    <h3 className="text-lg font-semibold mb-4">Add New Series</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Category</label>
                          <Select
                            value={newSeriesData.categoryId > 0 ? newSeriesData.categoryId.toString() : ""}
                            onValueChange={(value: string) => setNewSeriesData({ ...newSeriesData, categoryId: parseInt(value) })}
                          >
                            <option value="">Select category</option>
                            {categories.map((category: any) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Slug (URL)</label>
                          <Input
                            placeholder="e.g., fbh-series"
                            value={newSeriesData.slug}
                            onChange={(e: any) => setNewSeriesData({ ...newSeriesData, slug: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Series Name</label>
                        <Input
                          placeholder="e.g., FBH Heavy Duty Series"
                          value={newSeriesData.name}
                          onChange={(e: any) => setNewSeriesData({ ...newSeriesData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Input
                          placeholder="Series description"
                          value={newSeriesData.description}
                          onChange={(e: any) => setNewSeriesData({ ...newSeriesData, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Image (Optional)</label>
                        <div className="space-y-2">
                          <ObjectUploader
                            onGetUploadParameters={handleGetSeriesUploadParameters}
                            onComplete={(result) => {
                              const uploadedFile = result.successful?.[0];
                              if (uploadedFile) {
                                setNewSeriesData({ ...newSeriesData, imageUrl: uploadedFile.uploadURL });
                                toast({
                                  title: "Success",
                                  description: "Image uploaded successfully",
                                });
                              }
                            }}
                            currentImageUrl={newSeriesData.imageUrl}
                            modelName="New Series"
                          >
                            {newSeriesData.imageUrl ? (
                              <div className="w-full h-20 rounded-md overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors cursor-pointer">
                                <img 
                                  src={newSeriesData.imageUrl} 
                                  alt="Series Preview"
                                  className="w-full h-full object-cover"
                                  onError={(e: any) => {
                                    e.target.onerror = null;
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="80" fill="none"%3E%3Crect width="400" height="80" fill="%23f3f4f6"/%3E%3Cpath stroke="%239ca3af" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M200 30v20m-10-10h20"/%3E%3C/svg%3E';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-full h-20 rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-center bg-gray-50">
                                <div className="text-center">
                                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                                  <span className="text-sm text-gray-600">Click to upload image</span>
                                </div>
                              </div>
                            )}
                          </ObjectUploader>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Base Price</label>
                        <Input
                          type="number"
                          placeholder="Enter base price"
                          value={String(newSeriesData.basePrice)}
                          onChange={(e: any) => setNewSeriesData({ ...newSeriesData, basePrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <Button variant="outline" onClick={() => setShowAddSeries(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => addSeriesMutation.mutate(newSeriesData)}
                        disabled={addSeriesMutation.isPending || !newSeriesData.name || !newSeriesData.categoryId}
                      >
                        Add Series
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Descriptions</TableHead>
                    <TableHead>Base Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSeries.map((series: any) => (
                    <TableRow key={series.id}>
                      <TableCell>
                        {editingSeries?.id === series.id ? (
                          <Input
                            value={editData[series.id]?.name ?? series.name}
                            onChange={(e: any) => setEditData({
                              ...editData,
                              [series.id]: { ...editData[series.id], name: e.target.value }
                            })}
                          />
                        ) : (
                          series.name
                        )}
                      </TableCell>
                      <TableCell className="w-20">
                        <div className="flex items-center justify-center">
                          {series.imageUrl ? (
                            <div className="relative group">
                              <img
                                src={series.imageUrl}
                                alt={series.name}
                                className="w-12 h-12 object-cover rounded border"
                                onError={(e: any) => {
                                  e.target.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>')}`;
                                }}
                                data-testid={`img-series-${series.id}`}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <ObjectUploader
                                  onGetUploadParameters={handleGetSeriesUploadParameters}
                                  onComplete={(result) => handleSeriesImageUploadComplete(series.id, result)}
                                  buttonClassName="w-full h-full flex items-center justify-center"
                                  data-testid={`upload-series-${series.id}`}
                                >
                                  <Upload className="w-4 h-4 text-white" />
                                </ObjectUploader>
                              </div>
                            </div>
                          ) : (
                            <ObjectUploader
                              onGetUploadParameters={handleGetSeriesUploadParameters}
                              onComplete={(result) => handleSeriesImageUploadComplete(series.id, result)}
                              buttonClassName="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
                              data-testid={`upload-series-${series.id}`}
                            >
                              <Upload className="w-4 h-4 text-gray-400" />
                            </ObjectUploader>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingSeries?.id === series.id ? (
                          <Select
                            value={editData[series.id]?.categoryId?.toString() ?? series.categoryId?.toString()}
                            onValueChange={(value: string) => setEditData({
                              ...editData,
                              [series.id]: { ...editData[series.id], categoryId: parseInt(value) }
                            })}
                          >
                            {categories.map((category: any) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          series.categoryName || 'Unknown'
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {editingSeries?.id === series.id ? (
                          <Input
                            value={editData[series.id]?.slug ?? series.slug}
                            onChange={(e: any) => setEditData({
                              ...editData,
                              [series.id]: { ...editData[series.id], slug: e.target.value }
                            })}
                          />
                        ) : (
                          series.slug
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSeries?.id === series.id ? (
                          <Input
                            value={editData[series.id]?.description ?? series.description}
                            onChange={(e: any) => setEditData({
                              ...editData,
                              [series.id]: { ...editData[series.id], description: e.target.value }
                            })}
                          />
                        ) : (
                          series.description || 'No description'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSeries?.id === series.id ? (
                          <Input
                            type="number"
                            value={editData[series.id]?.basePrice ?? series.basePrice}
                            onChange={(e: any) => setEditData({
                              ...editData,
                              [series.id]: { ...editData[series.id], basePrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }
                            })}
                          />
                        ) : (
                          `$${series.basePrice?.toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {editingSeries?.id === series.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const data = editData[series.id] || {};
                                  updateSeriesMutation.mutate({
                                    id: series.id,
                                    name: data.name ?? series.name,
                                    categoryId: data.categoryId ?? series.categoryId,
                                    slug: data.slug ?? series.slug,
                                    basePrice: data.basePrice ?? series.basePrice,
                                    description: data.description ?? series.description,
                                  });
                                }}
                                disabled={updateSeriesMutation.isPending}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => archiveSeriesMutation.mutate(series.id)}
                                disabled={archiveSeriesMutation.isPending}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingSeries(null);
                                  setEditData({});
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSeries(series)}
                                title="Edit series details"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Show Archived Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchivedSeries(!showArchivedSeries)}
                className="mt-4"
              >
                <Archive className="w-4 h-4 mr-2" />
                {showArchivedSeries ? 'Hide' : 'Show'} Archived ({archivedSeries.length})
              </Button>

              {/* Archived Series Section */}
              {showArchivedSeries && archivedSeries.length > 0 && (
                <Card className="mt-4">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Archived Series ({archivedSeries.length})</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Slug</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Base Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedSeries.map((series: any) => (
                          <TableRow key={series.id}>
                            <TableCell>{series.name}</TableCell>
                            <TableCell>{series.categoryName || 'Unknown'}</TableCell>
                            <TableCell>{series.slug}</TableCell>
                            <TableCell>{series.description}</TableCell>
                            <TableCell>{series.basePrice}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreSeriesMutation.mutate(series.id)}
                                disabled={restoreSeriesMutation.isPending}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </div>
          </Card>
        )}


        {/* Models table */}
        {activeTab === "models" && (
          <>
            <Card>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Models ({activeModels.length})</h2>
                  <Button onClick={() => setShowAddModel(true)} size="sm">
                    Add Model
                  </Button>
                </div>
                
                {/* Add Model Dialog */}
                {showAddModel && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
                      <h3 className="text-lg font-semibold mb-4">Add New Model</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <Select
                              value={newModelData.categoryId > 0 ? newModelData.categoryId.toString() : ""}
                              onValueChange={(value: string) => setNewModelData({ ...newModelData, categoryId: parseInt(value) })}
                            >
                              <option value="">Select category</option>
                              {categories.map((category: any) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Series</label>
                            <Select
                              value={newModelData.seriesId ? newModelData.seriesId.toString() : ""}
                              onValueChange={(value: string) => setNewModelData({ ...newModelData, seriesId: value ? parseInt(value) : null })}
                            >
                              <option value="">Select series</option>
                              {seriesData.map((series: any) => (
                                <option key={series.id} value={series.id}>
                                  {series.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Model Series (e.g., DHV207)</label>
                            <Input
                              placeholder="e.g., DHV207, FBH208"
                              value={newModelData.modelSeries}
                              onChange={(e: any) => setNewModelData({ ...newModelData, modelSeries: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Model Name</label>
                            <Input
                              placeholder="e.g., 7x14 Dump Trailer"
                              value={newModelData.name}
                              onChange={(e: any) => setNewModelData({ ...newModelData, name: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Base Price ($)</label>
                            <Input
                              type="number"
                              placeholder="Enter base price"
                              value={String(newModelData.basePrice)}
                              onChange={(e: any) => setNewModelData({ ...newModelData, basePrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">GVWR</label>
                            <Input
                              placeholder="e.g., 14,000 lbs"
                              value={newModelData.gvwr}
                              onChange={(e: any) => setNewModelData({ ...newModelData, gvwr: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Payload</label>
                            <Input
                              placeholder="e.g., 9,820 lbs"
                              value={newModelData.payload}
                              onChange={(e: any) => setNewModelData({ ...newModelData, payload: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Deck Size</label>
                            <Input
                              placeholder="e.g., 83 x 14-16ft"
                              value={newModelData.deckSize}
                              onChange={(e: any) => setNewModelData({ ...newModelData, deckSize: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Axles</label>
                            <Input
                              placeholder="e.g., Dual 7K"
                              value={newModelData.axles}
                              onChange={(e: any) => setNewModelData({ ...newModelData, axles: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Image (Optional)</label>
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const uploadParams = await handleGetUploadParameters();
                                    const formData = new FormData();
                                    formData.append("file", file);
                                    
                                    const response = await fetch(uploadParams.url, {
                                      method: uploadParams.method,
                                      body: formData,
                                    });
                                    
                                    if (response.ok) {
                                      // Use the upload URL from the parameters, not the response
                                      // This will be processed properly by the backend when the model is created
                                      setNewModelData({ ...newModelData, imageUrl: uploadParams.url });
                                    }
                                  } catch (error) {
                                    console.error('Upload failed:', error);
                                  }
                                }
                              }}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {newModelData.imageUrl && (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={newModelData.imageUrl} 
                                  alt="Preview"
                                  className="w-12 h-12 object-cover rounded-md border border-gray-200"
                                  onError={(e: any) => {
                                    e.target.onerror = null;
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"%3E%3Crect width="48" height="48" fill="%23f3f4f6"/%3E%3Cpath stroke="%239ca3af" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M24 16v16m-8-8h16"/%3E%3C/svg%3E';
                                  }}
                                />
                                <span className="text-sm text-gray-600">Image uploaded</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Standard Features (comma-separated)</label>
                          <Input
                            placeholder="e.g., Heavy-duty frame, LED lights, Electric brakes"
                            value={newModelData.standardFeatures.join(", ")}
                            onChange={(e: any) => setNewModelData({ 
                              ...newModelData, 
                              standardFeatures: e.target.value.split(",").map((f: string) => f.trim()).filter((f: string) => f.length > 0)
                            })}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setShowAddModel(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => addModelMutation.mutate(newModelData)}
                          disabled={addModelMutation.isPending || !newModelData.name || !newModelData.modelSeries || !newModelData.categoryId || !newModelData.seriesId || (parseFloat(newModelData.basePrice as string) || 0) < 0}
                        >
                          Add Model
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Series</TableHead>
                  <TableHead>GVWR</TableHead>
                  <TableHead>Payload</TableHead>
                  <TableHead>Deck Size</TableHead>
                  <TableHead>Axles</TableHead>
                  <TableHead>Length Options</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Image</TableHead>
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
                          onValueChange={(value: string) => setEditData({
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
                        <Select
                          value={seriesSelection[model.id] ?? model.seriesName ?? "No Series"}
                          onValueChange={(value: string) => setSeriesSelection(prev => ({ 
                            ...prev, 
                            [model.id]: value 
                          }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="No Series">No Series</SelectItem>
                            {seriesData.map((series) => (
                              <SelectItem key={series.id} value={series.name}>
                                {series.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        model.seriesName ?? "No Series"
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Input
                          placeholder="GVWR"
                          value={editData[model.id]?.gvwr ?? model.gvwr ?? ""}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], gvwr: e.target.value || null }
                          })}
                        />
                      ) : (
                        model.gvwr || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Input
                          placeholder="Payload"
                          value={editData[model.id]?.payload ?? model.payload ?? ""}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], payload: e.target.value || null }
                          })}
                        />
                      ) : (
                        model.payload || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Input
                          placeholder="Deck Size"
                          value={editData[model.id]?.deckSize ?? model.deckSize ?? ""}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], deckSize: e.target.value || null }
                          })}
                        />
                      ) : (
                        model.deckSize || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Input
                          placeholder="Axles"
                          value={editData[model.id]?.axles ?? model.axles ?? ""}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], axles: e.target.value || null }
                          })}
                        />
                      ) : (
                        model.axles || "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <div className="space-y-2">
                          {/* Display existing length options with their pull types */}
                          {(() => {
                            const currentLengthOptions = editData[model.id]?.lengthOptions || 
                              (typeof model.lengthOptions === 'string' 
                                ? (model.lengthOptions ? JSON.parse(model.lengthOptions) : [])
                                : model.lengthOptions || []);
                            
                            const currentPulltypeOptions = editData[model.id]?.pulltypeOptions || 
                              model.pulltypeOptions || {};
                            
                            return (
                              <div className="space-y-2">
                                {currentLengthOptions.map((length: string, index: number) => (
                                  <div key={index} className="border rounded-md p-2 bg-gray-50">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-blue-800">{length}</span>
                                      <button
                                        type="button"
                                        onClick={() => removeLengthOption(model.id, index)}
                                        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-red-400 hover:bg-red-100 hover:text-red-600"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <Input
                                      placeholder="Pull types (e.g., Bumper Pull, Gooseneck)"
                                      value={currentPulltypeOptions[length] || ""}
                                      onChange={(e: any) => updatePullTypeForLength(model.id, length, e.target.value)}
                                      className="text-xs h-7"
                                    />
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          
                          {/* Add new length option */}
                          {addingLengthFor === model.id ? (
                            <div className="flex gap-1">
                              <Input
                                placeholder="Enter length (e.g., 16', 20')"
                                value={newLengthValue}
                                onChange={(e: any) => setNewLengthValue(e.target.value)}
                                onKeyPress={(e: any) => {
                                  if (e.key === 'Enter') {
                                    addLengthOption(model.id, newLengthValue);
                                  }
                                }}
                                className="text-xs"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => addLengthOption(model.id, newLengthValue)}
                                disabled={!newLengthValue.trim()}
                                className="px-2 h-8"
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAddingLengthFor(null);
                                  setNewLengthValue("");
                                }}
                                className="px-2 h-8"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAddingLengthFor(model.id)}
                              className="h-8 text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Length
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {(() => {
                            const lengthOptions = typeof model.lengthOptions === 'string' 
                              ? (model.lengthOptions ? JSON.parse(model.lengthOptions) : [])
                              : model.lengthOptions || [];
                            
                            const pulltypeOptions = model.pulltypeOptions || {};
                            
                            return lengthOptions.length > 0 ? (
                              lengthOptions.map((length: string, index: number) => (
                                <div key={index} className="text-xs border rounded px-2 py-1 bg-gray-50">
                                  <div className="font-medium text-gray-800">{length}</div>
                                  {pulltypeOptions[length] && (
                                    <div className="text-gray-600 mt-1">{pulltypeOptions[length]}</div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            );
                          })()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Input
                          type="number"
                          value={editData[model.id]?.basePrice ?? model.basePrice}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], basePrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }
                          })}
                        />
                      ) : (
                        `$${model.basePrice?.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell>
                      <ObjectUploader
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={(result) => handleImageUploadComplete(model.id, result)}
                        buttonClassName="p-0"
                        currentImageUrl={model.imageUrl}
                        modelName={model.name}
                      >
                        {model.imageUrl ? (
                          <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors cursor-pointer">
                            <img 
                              src={model.imageUrl} 
                              alt={model.name}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingModel(model);
                            // Initialize seriesSelection with current model's series
                            setSeriesSelection(prev => ({
                              ...prev,
                              [model.id]: model.seriesName ?? "No Series"
                            }));
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
                          <TableHead>Series</TableHead>
                          <TableHead>GVWR</TableHead>
                          <TableHead>Payload</TableHead>
                          <TableHead>Deck Size</TableHead>
                          <TableHead>Axles</TableHead>
                          <TableHead>Length Options</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Image</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedModels.map((model: any) => (
                          <TableRow key={model.id} className="opacity-60">
                            <TableCell>{model.modelId}</TableCell>
                            <TableCell>{model.name}</TableCell>
                            <TableCell>{model.categoryName}</TableCell>
                            <TableCell>{model.seriesName ?? "No Series"}</TableCell>
                            <TableCell>{model.gvwr || "—"}</TableCell>
                            <TableCell>{model.payload || "—"}</TableCell>
                            <TableCell>{model.deckSize || "—"}</TableCell>
                            <TableCell>{model.axles || "—"}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {(() => {
                                  const lengthOptions = typeof model.lengthOptions === 'string' 
                                    ? (model.lengthOptions ? JSON.parse(model.lengthOptions) : [])
                                    : model.lengthOptions || [];
                                  
                                  const pulltypeOptions = model.pulltypeOptions || {};
                                  
                                  return lengthOptions.length > 0 ? (
                                    lengthOptions.map((length: string, index: number) => (
                                      <div key={index} className="text-xs border rounded px-2 py-1 bg-gray-50 opacity-60">
                                        <div className="font-medium text-gray-600">{length}</div>
                                        {pulltypeOptions[length] && (
                                          <div className="text-gray-500 mt-1">{pulltypeOptions[length]}</div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 text-xs">—</span>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            <TableCell>${model.basePrice?.toLocaleString()}</TableCell>
                            <TableCell>
                              {model.imageUrl ? (
                                <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200">
                                  <img 
                                    src={model.imageUrl} 
                                    alt={model.name}
                                    className="w-full h-full object-cover opacity-60"
                                    onError={(e: any) => {
                                      e.target.onerror = null;
                                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"%3E%3Crect width="48" height="48" fill="%23f3f4f6"/%3E%3Cpath stroke="%239ca3af" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M24 16v16m-8-8h16"/%3E%3C/svg%3E';
                                    }}
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Options & Extras ({activeOptions.length})</h2>
                <Button onClick={() => setShowAddOption(true)} size="sm">
                  Add Extras
                </Button>
              </div>
              
              {/* Add Option Dialog */}
              {showAddOption && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center z-50 overflow-y-auto">
                  <div className="bg-white rounded-lg max-w-2xl w-full my-8 max-h-[calc(100vh-4rem)] flex flex-col">
                    <div className="p-6 pb-4">
                      <h3 className="text-lg font-semibold mb-4">Add New Option/Extra</h3>
                    </div>
                    <div className="px-6 flex-1 overflow-y-auto">
                      <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Option Name</label>
                        <Input
                          placeholder="e.g., Spare Tire, LED Light Kit"
                          value={newOptionData.name}
                          onChange={(e: any) => setNewOptionData({ ...newOptionData, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Category</label>
                        <Select
                          value={newOptionData.category}
                          onValueChange={(value: string) => setNewOptionData({ ...newOptionData, category: value })}
                        >
                          {optionCategories.map((category: string) => (
                            <option key={category} value={category}>
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Price ($)</label>
                        <Input
                          type="number"
                          placeholder="Enter price"
                          value={String(newOptionData.price)}
                          onChange={(e: any) => setNewOptionData({ ...newOptionData, price: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      {newOptionData.category.toLowerCase() === 'color' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Hex Color</label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="#FF0000"
                              value={newOptionData.hexColor}
                              onChange={(e: any) => setNewOptionData({ ...newOptionData, hexColor: e.target.value })}
                              className={`flex-1 ${newOptionData.hexColor && !isValidHex(newOptionData.hexColor) ? 'border-red-500' : ''}`}
                            />
                            {newOptionData.hexColor && isValidHex(newOptionData.hexColor) && (
                              <div 
                                className="w-10 h-10 rounded border border-gray-300 flex-shrink-0"
                                style={{ backgroundColor: newOptionData.hexColor }}
                                title={`Color preview: ${newOptionData.hexColor}`}
                              />
                            )}
                          </div>
                          {newOptionData.hexColor && !isValidHex(newOptionData.hexColor) && (
                            <p className="text-sm text-red-600 mt-1">Please enter a valid hex color (e.g., #FF0000)</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Enter a hex color code for this color option (e.g., #FF0000 for red)
                          </p>
                        </div>
                      )}
                      {newOptionData.category.toLowerCase() === 'color' && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Primer Price</label>
                          <Input
                            type="number"
                            placeholder="Enter primer price"
                            value={String(newOptionData.primerPrice)}
                            onChange={(e: any) => setNewOptionData({ ...newOptionData, primerPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter the primer price for this color option
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium mb-1">Compatible Models</label>
                        <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto space-y-1">
                          {activeModels.map((model: any) => (
                            <label key={model.id} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={newOptionData.modelIds.includes(model.modelId)}
                                onChange={(e) => {
                                  const modelIds = e.target.checked 
                                    ? [...newOptionData.modelIds, model.modelId]
                                    : newOptionData.modelIds.filter(id => id !== model.modelId);
                                  setNewOptionData({ ...newOptionData, modelIds });
                                }}
                                className="rounded"
                              />
                              <span>{model.modelId} - {model.name}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <input
                            type="checkbox"
                            id="selectAllModels"
                            checked={newOptionData.modelIds.length === activeModels.length && activeModels.length > 0}
                            onChange={(e) => {
                              const allModelIds = activeModels.map((model: any) => model.modelId);
                              setNewOptionData({ 
                                ...newOptionData, 
                                modelIds: e.target.checked ? allModelIds : [] 
                              });
                            }}
                            className="rounded"
                          />
                          <label htmlFor="selectAllModels" className="text-sm font-medium text-gray-700">
                            Select All
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Image (Optional)</label>
                        <div className="space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const uploadParams = await handleGetUploadParameters();
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  
                                  const response = await fetch(uploadParams.url, {
                                    method: uploadParams.method,
                                    body: formData,
                                  });
                                  
                                  if (response.ok) {
                                    // Use the upload URL from the parameters, not the response
                                    // This will be processed properly by the backend when the option is created
                                    setNewOptionData({ ...newOptionData, imageUrl: uploadParams.url });
                                  }
                                } catch (error) {
                                  console.error('Upload failed:', error);
                                }
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {newOptionData.imageUrl && (
                            <div className="flex items-center gap-2">
                              <img 
                                src={newOptionData.imageUrl} 
                                alt="Preview"
                                className="w-12 h-12 object-cover rounded-md border border-gray-200"
                                onError={(e: any) => {
                                  e.target.onerror = null;
                                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"%3E%3Crect width="48" height="48" fill="%23f3f4f6"/%3E%3Cpath stroke="%239ca3af" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M24 16v16m-8-8h16"/%3E%3C/svg%3E';
                                }}
                              />
                              <span className="text-sm text-gray-600">Image uploaded</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isMultiSelect"
                          checked={newOptionData.isMultiSelect}
                          onChange={(e) => setNewOptionData({ ...newOptionData, isMultiSelect: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="isMultiSelect" className="text-sm">Allow multiple selections</label>
                      </div>
                      </div>
                    </div>
                    <div className="p-6 pt-4 border-t bg-white rounded-b-lg">
                      <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowAddOption(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => {
                          // Create single option with multiple models
                          const applicableModels = newOptionData.modelIds.length > 0 ? newOptionData.modelIds : ["ALL"];
                          addOptionMutation.mutate({
                            name: newOptionData.name,
                            modelId: applicableModels[0], // Legacy field for backward compatibility
                            applicableModels: applicableModels, // New field for multiple models
                            category: newOptionData.category,
                            price: parseFloat(newOptionData.price as string) || 0,
                            imageUrl: newOptionData.imageUrl,
                            isMultiSelect: newOptionData.isMultiSelect,
                            hexColor: newOptionData.hexColor,
                            primerPrice: parseFloat(newOptionData.primerPrice as string) || 0
                          });
                        }}
                        disabled={
                          addOptionMutation.isPending || 
                          !newOptionData.name || 
                          (parseFloat(newOptionData.price as string) || 0) < 0 ||
                          (newOptionData.category.toLowerCase() === 'color' && !isValidHex(newOptionData.hexColor))
                        }
                      >
                        Add Option
                      </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOptions
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
                                  checked={editData[option.id]?.modelIds?.includes(model.modelId) ?? option.applicableModels?.includes(model.modelId)}
                                  onChange={(e) => {
                                    const currentModelIds = editData[option.id]?.modelIds ?? (option.applicableModels || [option.modelId]);
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
                          <div className="text-sm">
                            {option.applicableModels && option.applicableModels.length > 0 ? (
                              option.applicableModels.length === 1 ? (
                                option.applicableModels[0]
                              ) : (
                                <div className="space-y-1">
                                  {option.applicableModels.slice(0, 2).map((modelId: string, index: number) => (
                                    <div key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                      {modelId}
                                    </div>
                                  ))}
                                  {option.applicableModels.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{option.applicableModels.length - 2} more
                                    </div>
                                  )}
                                </div>
                              )
                            ) : (
                              option.modelId || "No models"
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <Select
                            value={editData[option.id]?.category ?? option.category}
                            onValueChange={(value: string) => setEditData({
                              ...editData,
                              [option.id]: { ...editData[option.id], category: value }
                            })}
                          >
                            {optionCategories.map((category: string) => (
                              <SelectItem key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </SelectItem>
                            ))}
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
                              [option.id]: { ...editData[option.id], price: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }
                            })}
                          />
                        ) : (
                          `$${option.price?.toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        <ObjectUploader
                          onGetUploadParameters={handleGetOptionUploadParameters}
                          onComplete={(result) => handleOptionImageUploadComplete(option.id, result)}
                          buttonClassName="p-0"
                          currentImageUrl={option.imageUrl}
                          modelName={option.name}
                        >
                          {option.imageUrl ? (
                            <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors cursor-pointer">
                              <img 
                                src={option.imageUrl} 
                                alt={option.name}
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
                              onClick={() => archiveOptionMutation.mutate(option.id)}
                              disabled={archiveOptionMutation.isPending}
                            >
                              <Archive className="w-4 h-4" />
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
              
              {/* Show Archived Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchivedOptions(!showArchivedOptions)}
                className="mt-4"
              >
                <Archive className="w-4 h-4 mr-2" />
                {showArchivedOptions ? 'Hide' : 'Show'} Archived ({archivedOptions.length})
              </Button>

              {/* Archived Options Section */}
              {showArchivedOptions && archivedOptions.length > 0 && (
                <Card className="mt-4">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Archived Options ({archivedOptions.length})</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Option Name</TableHead>
                          <TableHead>Models</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Image</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedOptions.map((option: any) => (
                          <TableRow key={option.id}>
                            <TableCell>{option.name}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {(option.applicableModels || [option.modelId]).map((modelId: string) => {
                                  const model = activeModels.find((m: any) => m.modelId === modelId);
                                  return model ? (
                                    <div key={modelId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full inline-block mr-1">
                                      {model.modelId}
                                    </div>
                                  ) : (
                                    <div key={modelId} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full inline-block mr-1">
                                      {modelId}
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                            <TableCell>{option.category}</TableCell>
                            <TableCell>${option.price}</TableCell>
                            <TableCell>
                              {option.imageUrl ? (
                                <div className="w-12 h-12 rounded-md overflow-hidden border border-gray-200">
                                  <img 
                                    src={option.imageUrl} 
                                    alt={option.name}
                                    className="w-full h-full object-cover"
                                    onError={(e: any) => {
                                      e.target.onerror = null;
                                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"%3E%3Crect width="48" height="48" fill="%23f3f4f6"/%3E%3Cpath stroke="%239ca3af" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M24 16v16m-8-8h16"/%3E%3C/svg%3E';
                                    }}
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreOptionMutation.mutate(option.id)}
                                disabled={restoreOptionMutation.isPending}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}