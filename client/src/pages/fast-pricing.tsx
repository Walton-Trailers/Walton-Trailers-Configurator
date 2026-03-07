import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Edit, Save, X, Archive, RotateCcw, Upload, Image, Trash2, Plus, Pencil } from "lucide-react";
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

const Switch = ({ checked, onCheckedChange, disabled = false }: any) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => !disabled && onCheckedChange(!checked)}
    disabled={disabled}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

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
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMessage = errorData.message;
    } catch {}
    throw new Error(errorMessage);
  }
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
  const [addModelError, setAddModelError] = useState<string | null>(null);
  const [newModelData, setNewModelData] = useState({
    categoryId: 0,
    seriesId: null as number | null,
    modelSeries: "",
    name: "",
    pullType: "",
    imageUrl: "",
    standardFeatures: [] as string[],
    basePrice: "",
    payload: "",
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
    isPerFt: false,
    hexColor: "",
    primerPrice: ""
  });
  const [addingLengthFor, setAddingLengthFor] = useState<number | null>(null);
  const [newLengthValue, setNewLengthValue] = useState("");
  const [expandedLengthOptions, setExpandedLengthOptions] = useState<Record<number, boolean>>({});
  const [editingLengthFor, setEditingLengthFor] = useState<{modelId: number, lengthIndex: number, originalLength: string} | null>(null);
  const [tempLengthValue, setTempLengthValue] = useState("");
  const [showOptionsPopup, setShowOptionsPopup] = useState<Record<number, boolean>>({});
  const [galleryModelId, setGalleryModelId] = useState<number | null>(null);
  const [creatingNewCategory, setCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showEditCategories, setShowEditCategories] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [localCategoryOrder, setLocalCategoryOrder] = useState<Record<number, Record<string, number>>>({});
  const [localGlobalCatOrder, setLocalGlobalCatOrder] = useState<any[]>([]);

  // Helper functions for managing length options and their pull types and GVWR
  const addLengthOption = (modelId: number, lengthValue: string) => {
    if (!lengthValue.trim()) return;
    
    const currentLengthOptions = editData[modelId]?.lengthOptions || 
      (typeof (models.find(m => m.id === modelId)?.lengthOptions) === 'string' 
        ? JSON.parse(models.find(m => m.id === modelId)?.lengthOptions || '[]')
        : models.find(m => m.id === modelId)?.lengthOptions || []);
    
    const newLengthOptions = [...currentLengthOptions, lengthValue.trim()];
    
    const rawLengthOrder = editData[modelId]?.lengthOrder || 
      models.find(m => m.id === modelId)?.lengthOrder || {};
    const currentLengthOrder = typeof rawLengthOrder === 'string' ? JSON.parse(rawLengthOrder) : rawLengthOrder;
    const maxOrder = Math.max(0, ...Object.values(currentLengthOrder).map((v: any) => Number(v) || 0));
    const newLengthOrder = {
      ...currentLengthOrder,
      [lengthValue.trim()]: maxOrder + 1
    };
    
    // Initialize pull type options for this new length
    const currentPulltypeOptions = editData[modelId]?.pulltypeOptions || 
      models.find(m => m.id === modelId)?.pulltypeOptions || {};
    
    const newPulltypeOptions = {
      ...currentPulltypeOptions,
      [lengthValue.trim()]: "" // Initialize with empty string
    };
    
    // Initialize GVWR options for this new length
    const currentLengthGvwr = editData[modelId]?.lengthGvwr || 
      models.find(m => m.id === modelId)?.lengthGvwr || {};
    
    const newLengthGvwr = {
      ...currentLengthGvwr,
      [lengthValue.trim()]: "" // Initialize with empty string
    };
    
    // Initialize payload options for this new length
    const currentLengthPayload = editData[modelId]?.lengthPayload || 
      models.find(m => m.id === modelId)?.lengthPayload || {};
    
    const newLengthPayload = {
      ...currentLengthPayload,
      [lengthValue.trim()]: "" // Initialize with empty string
    };
    
    // Initialize deck size options for this new length
    const currentLengthDeckSize = editData[modelId]?.lengthDeckSize || 
      models.find(m => m.id === modelId)?.lengthDeckSize || {};
    
    const newLengthDeckSize = {
      ...currentLengthDeckSize,
      [lengthValue.trim()]: "" // Initialize with empty string
    };
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthOptions: newLengthOptions,
        pulltypeOptions: newPulltypeOptions,
        lengthGvwr: newLengthGvwr,
        lengthPayload: newLengthPayload,
        lengthDeckSize: newLengthDeckSize,
        lengthOrder: newLengthOrder
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
    
    // Remove the GVWR option for this length as well
    const currentLengthGvwr = editData[modelId]?.lengthGvwr || 
      models.find(m => m.id === modelId)?.lengthGvwr || {};
    
    const newLengthGvwr = { ...currentLengthGvwr };
    delete newLengthGvwr[lengthToRemove];
    
    // Remove the payload option for this length as well
    const currentLengthPayload = editData[modelId]?.lengthPayload || 
      models.find(m => m.id === modelId)?.lengthPayload || {};
    
    const newLengthPayload = { ...currentLengthPayload };
    delete newLengthPayload[lengthToRemove];
    
    // Remove the deck size option for this length as well
    const currentLengthDeckSize = editData[modelId]?.lengthDeckSize || 
      models.find(m => m.id === modelId)?.lengthDeckSize || {};
    
    const newLengthDeckSize = { ...currentLengthDeckSize };
    delete newLengthDeckSize[lengthToRemove];
    
    // Remove and recalculate length order
    const currentLengthOrder = editData[modelId]?.lengthOrder || 
      models.find(m => m.id === modelId)?.lengthOrder || {};
    const newLengthOrder: Record<string, number> = {};
    newLengthOptions.forEach((len: string, idx: number) => {
      newLengthOrder[len] = idx + 1;
    });
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthOptions: newLengthOptions,
        pulltypeOptions: newPulltypeOptions,
        lengthGvwr: newLengthGvwr,
        lengthPayload: newLengthPayload,
        lengthDeckSize: newLengthDeckSize,
        lengthOrder: newLengthOrder
      }
    });
  };

  const moveLengthOption = (modelId: number, fromIndex: number, toIndex: number) => {
    const currentLengthOptions = editData[modelId]?.lengthOptions || 
      (typeof (models.find(m => m.id === modelId)?.lengthOptions) === 'string' 
        ? JSON.parse(models.find(m => m.id === modelId)?.lengthOptions || '[]')
        : models.find(m => m.id === modelId)?.lengthOptions || []);
    
    if (toIndex < 0 || toIndex >= currentLengthOptions.length) return;
    
    const newLengthOptions = [...currentLengthOptions];
    const [moved] = newLengthOptions.splice(fromIndex, 1);
    newLengthOptions.splice(toIndex, 0, moved);
    
    // Rebuild length_order based on new positions
    const newLengthOrder: Record<string, number> = {};
    newLengthOptions.forEach((len: string, idx: number) => {
      newLengthOrder[len] = idx + 1;
    });
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthOptions: newLengthOptions,
        lengthOrder: newLengthOrder
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

  const updatePriceForLength = (modelId: number, length: string, price: string) => {
    const currentLengthPrice = editData[modelId]?.lengthPrice || 
      models.find(m => m.id === modelId)?.lengthPrice || {};
    
    const newLengthPrice = {
      ...currentLengthPrice,
      [length]: price === "" ? 0 : parseFloat(price) || 0
    };
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthPrice: newLengthPrice
      }
    });
  };

  const updateGvwrForLength = (modelId: number, length: string, gvwr: string) => {
    const currentLengthGvwr = editData[modelId]?.lengthGvwr || 
      models.find(m => m.id === modelId)?.lengthGvwr || {};
    
    const newLengthGvwr = {
      ...currentLengthGvwr,
      [length]: gvwr
    };
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthGvwr: newLengthGvwr
      }
    });
  };

  const updatePayloadForLength = (modelId: number, length: string, payload: string) => {
    const currentLengthPayload = editData[modelId]?.lengthPayload || 
      models.find(m => m.id === modelId)?.lengthPayload || {};
    
    const newLengthPayload = {
      ...currentLengthPayload,
      [length]: payload
    };
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthPayload: newLengthPayload
      }
    });
  };

  const updateDeckSizeForLength = (modelId: number, length: string, deckSize: string) => {
    const currentLengthDeckSize = editData[modelId]?.lengthDeckSize || 
      models.find(m => m.id === modelId)?.lengthDeckSize || {};
    
    const newLengthDeckSize = {
      ...currentLengthDeckSize,
      [length]: deckSize
    };
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthDeckSize: newLengthDeckSize
      }
    });
  };

  const updateLengthValue = (modelId: number, oldLength: string, newLength: string) => {
    if (!newLength.trim() || oldLength === newLength.trim()) {
      return;
    }
    
    const currentLengthOptions = editData[modelId]?.lengthOptions || 
      (typeof (models.find(m => m.id === modelId)?.lengthOptions) === 'string' 
        ? JSON.parse(models.find(m => m.id === modelId)?.lengthOptions || '[]')
        : models.find(m => m.id === modelId)?.lengthOptions || []);
    
    // Update length options array
    const newLengthOptions = currentLengthOptions.map((length: string) => 
      length === oldLength ? newLength.trim() : length
    );
    
    // Update pull type options (move from old key to new key)
    const currentPulltypeOptions = editData[modelId]?.pulltypeOptions || 
      models.find(m => m.id === modelId)?.pulltypeOptions || {};
    
    const newPulltypeOptions = { ...currentPulltypeOptions };
    if (newPulltypeOptions[oldLength] !== undefined) {
      newPulltypeOptions[newLength.trim()] = newPulltypeOptions[oldLength];
      delete newPulltypeOptions[oldLength];
    }
    
    // Update length pricing (move from old key to new key)
    const currentLengthPrice = editData[modelId]?.lengthPrice || 
      models.find(m => m.id === modelId)?.lengthPrice || {};
    
    const newLengthPrice = { ...currentLengthPrice };
    if (newLengthPrice[oldLength] !== undefined) {
      newLengthPrice[newLength.trim()] = newLengthPrice[oldLength];
      delete newLengthPrice[oldLength];
    }
    
    // Update GVWR options (move from old key to new key)
    const currentLengthGvwr = editData[modelId]?.lengthGvwr || 
      models.find(m => m.id === modelId)?.lengthGvwr || {};
    
    const newLengthGvwr = { ...currentLengthGvwr };
    if (newLengthGvwr[oldLength] !== undefined) {
      newLengthGvwr[newLength.trim()] = newLengthGvwr[oldLength];
      delete newLengthGvwr[oldLength];
    }
    
    // Update payload options (move from old key to new key)
    const currentLengthPayload = editData[modelId]?.lengthPayload || 
      models.find(m => m.id === modelId)?.lengthPayload || {};
    
    const newLengthPayload = { ...currentLengthPayload };
    if (newLengthPayload[oldLength] !== undefined) {
      newLengthPayload[newLength.trim()] = newLengthPayload[oldLength];
      delete newLengthPayload[oldLength];
    }
    
    // Update deck size options (move from old key to new key)
    const currentLengthDeckSize = editData[modelId]?.lengthDeckSize || 
      models.find(m => m.id === modelId)?.lengthDeckSize || {};
    
    const newLengthDeckSize = { ...currentLengthDeckSize };
    if (newLengthDeckSize[oldLength] !== undefined) {
      newLengthDeckSize[newLength.trim()] = newLengthDeckSize[oldLength];
      delete newLengthDeckSize[oldLength];
    }
    
    setEditData({
      ...editData,
      [modelId]: { 
        ...editData[modelId], 
        lengthOptions: newLengthOptions,
        pulltypeOptions: newPulltypeOptions,
        lengthPrice: newLengthPrice,
        lengthGvwr: newLengthGvwr,
        lengthPayload: newLengthPayload,
        lengthDeckSize: newLengthDeckSize
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

  const { data: categoryDetails = [], isLoading: categoryDetailsLoading } = useQuery<any[]>({
    queryKey: ['/api/categories/options/details'],
    queryFn: async () => {
      const response = await fetch('/api/categories/options/details', {
        headers: { Authorization: `Bearer ${sessionId}` },
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

  // Keep local global category order in sync with fetched data
  useEffect(() => {
    if (categoryDetails.length > 0) {
      setLocalGlobalCatOrder(categoryDetails);
    }
  }, [categoryDetails]);

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
        payload: "",
        axles: ""
      });
      toast({ title: "Success", description: "Model added successfully" });
    },
    onError: (error: any) => {
      console.error('Error adding model:', error);
      let errorMessage = 'Failed to add model. Please try again.';
      
      // Handle specific database constraint errors
      if (error?.message?.includes('duplicate key value violates unique constraint')) {
        if (error.message.includes('model_id')) {
          errorMessage = `Model ID '${newModelData.modelSeries}' already exists. Please use a different model ID.`;
        }
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setAddModelError(errorMessage);
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
    onSuccess: (_data: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
      queryClient.invalidateQueries({ queryKey: ['/api/models'] });
      setEditingModel(null);
      setEditData({});
      setSeriesSelection({});
      setLocalCategoryOrder(prev => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
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

  const handleMoveCategoryOrder = async (categoryId: number, direction: 'up' | 'down') => {
    const currentIndex = activeCategories.findIndex((c: any) => c.id === categoryId);
    if (currentIndex === -1) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === activeCategories.length - 1) return;

    const newList = [...activeCategories];
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    [newList[currentIndex], newList[swapIndex]] = [newList[swapIndex], newList[currentIndex]];

    const orderedIds = newList.map((c: any) => c.id);
    try {
      await fastMutate('/api/categories/reorder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ orderedIds }),
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    } catch (error) {
      console.error('Failed to reorder categories:', error);
    }
  };

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

    // Include local draft category order if the user reordered categories
    const categoryOrder = localCategoryOrder[model.id] !== undefined
      ? localCategoryOrder[model.id]
      : model.categoryOrder ?? null;
    
    updateMutation.mutate({
      id: model.id,
      modelId: data.modelId ?? model.modelId,
      name: data.name ?? model.name,
      categoryId: data.categoryId ?? model.categoryId,
      basePrice: data.basePrice ?? model.basePrice,
      seriesId: seriesId,
      payload: data.payload ?? model.payload,
      axles: data.axles ?? model.axles,
      lengthOptions: data.lengthOptions ?? model.lengthOptions,
      pulltypeOptions: data.pulltypeOptions ?? model.pulltypeOptions,
      lengthPrice: data.lengthPrice ?? model.lengthPrice,
      lengthGvwr: data.lengthGvwr ?? model.lengthGvwr,
      lengthPayload: data.lengthPayload ?? model.lengthPayload,
      lengthDeckSize: data.lengthDeckSize ?? model.lengthDeckSize,
      lengthOrder: data.lengthOrder ?? model.lengthOrder,
      categoryOrder,
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
        isPerFt: false,
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
      toast({ title: "Update Successful", description: "Option updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update option", variant: "destructive" });
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
    const optionCategory = ((data.category ?? option.category) || '').toLowerCase();
    
    const mutationData: any = {
      id: option.id,
      name: data.name ?? option.name,
      modelId: applicableModels[0] || option.modelId,
      applicableModels: applicableModels,
      category: data.category ?? option.category,
      price: data.price ?? option.price,
      isMultiSelect: data.isMultiSelect ?? option.isMultiSelect,
      isPerFt: data.isPerFt ?? option.isPerFt,
    };
    
    if (optionCategory === 'color') {
      mutationData.hexColor = data.hexColor ?? option.hexColor;
      mutationData.primerPrice = data.primerPrice ?? option.primerPrice;
    }
    
    toast({ title: "Updating...", description: "Saving your changes" });
    updateOptionMutation.mutate(mutationData);
    
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

  const handleGalleryImageUploadComplete = async (modelId: number, result: any) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile) throw new Error("No file uploaded");
      const url = uploadedFile.uploadURL;
      await apiRequest(`/api/models/${modelId}/images`, {
        method: "POST",
        body: { url },
        headers: { Authorization: `Bearer ${sessionId}` },
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
      toast({ title: "Success", description: "Image added to gallery" });
    } catch (error) {
      console.error("Error adding gallery image:", error);
      toast({ title: "Error", description: "Failed to add image", variant: "destructive" });
    }
  };

  const handle3DModelUploadComplete = async (modelId: number, result: any) => {
    try {
      const uploadedFile = result.successful?.[0];
      if (!uploadedFile) {
        throw new Error("No file uploaded");
      }

      const model3dUrl = uploadedFile.uploadURL;
      
      await apiRequest(`/api/models/${modelId}/model3d`, {
        method: "PATCH",
        body: { model3dUrl },
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
      
      toast({
        title: "Success",
        description: "3D model uploaded successfully",
      });
    } catch (error) {
      console.error("Error uploading 3D model:", error);
      toast({
        title: "Error",
        description: "Failed to upload 3D model",
        variant: "destructive",
      });
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
                          <label className="block text-sm font-medium mb-1">Image (Optional)</label>
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadingCategoryId(-1);
                                  try {
                                    const uploadParams = await handleGetCategoryUploadParameters();
                                    const response = await fetch(uploadParams.url, {
                                      method: uploadParams.method,
                                      body: file,
                                    });
                                    if (response.ok) {
                                      setNewCategoryData(prev => ({ ...prev, imageUrl: uploadParams.url }));
                                      toast({
                                        title: "Success",
                                        description: "Image uploaded successfully",
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Upload failed:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to upload image",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setUploadingCategoryId(null);
                                  }
                                }
                              }}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {uploadingCategoryId === -1 && !newCategoryData.imageUrl && (
                              <span className="text-sm text-blue-600">Uploading...</span>
                            )}
                            {newCategoryData.imageUrl && (
                              <div className="flex items-center gap-2">
                                <img 
                                  src={newCategoryData.imageUrl} 
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
                          <label className="block text-sm font-medium mb-1">Starting Price</label>
                          <Input
                            type="number"
                            placeholder="Enter starting price"
                            value={String(newCategoryData.startingPrice)}
                            onChange={(e: any) => setNewCategoryData({ ...newCategoryData, startingPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
                      <Button 
                        disabled={uploadingCategoryId === -1}
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
                  {activeCategories.map((category: any, catIdx: number) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex flex-col items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveCategoryOrder(category.id, 'up')}
                              disabled={catIdx === 0}
                              className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCategoryOrder(category.id, 'down')}
                              disabled={catIdx === activeCategories.length - 1}
                              className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center">
                            <label className="cursor-pointer relative group">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setUploadingCategoryId(category.id);
                                    try {
                                      const uploadParams = await handleGetCategoryUploadParameters();
                                      const response = await fetch(uploadParams.url, {
                                        method: uploadParams.method,
                                        body: file,
                                      });
                                      if (response.ok) {
                                        await apiRequest(`/api/categories/${category.id}/image`, {
                                          method: "PATCH",
                                          body: { imageUrl: uploadParams.url },
                                          headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
                                        });
                                        queryClient.invalidateQueries({ queryKey: ['/api/admin/categories'] });
                                        queryClient.invalidateQueries({ queryKey: ['categories'] });
                                        toast({ title: "Success", description: "Category image updated" });
                                      }
                                    } catch (error) {
                                      console.error('Upload failed:', error);
                                      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
                                    } finally {
                                      setUploadingCategoryId(null);
                                      e.target.value = '';
                                    }
                                  }
                                }}
                              />
                              {uploadingCategoryId === category.id ? (
                                <div className="w-12 h-12 rounded-md border flex items-center justify-center bg-gray-50">
                                  <span className="text-xs text-blue-600">...</span>
                                </div>
                              ) : category.imageUrl ? (
                                <div className="relative">
                                  <img 
                                    src={category.imageUrl} 
                                    alt={category.name}
                                    className="w-12 h-12 object-cover rounded-md border border-gray-200"
                                    onError={(e: any) => {
                                      e.target.onerror = null;
                                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none"%3E%3Crect width="48" height="48" fill="%23f3f4f6"/%3E%3Cpath stroke="%239ca3af" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M24 16v16m-8-8h16"/%3E%3C/svg%3E';
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                                    <Upload className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-gray-50">
                                  <Upload className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </label>
                          </div>
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
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadingCategoryId(-2);
                                try {
                                  const uploadParams = await handleGetSeriesUploadParameters();
                                  const response = await fetch(uploadParams.url, {
                                    method: uploadParams.method,
                                    body: file,
                                  });
                                  if (response.ok) {
                                    setNewSeriesData(prev => ({ ...prev, imageUrl: uploadParams.url }));
                                    toast({
                                      title: "Success",
                                      description: "Image uploaded successfully",
                                    });
                                  }
                                } catch (error) {
                                  console.error('Upload failed:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to upload image",
                                    variant: "destructive",
                                  });
                                } finally {
                                  setUploadingCategoryId(null);
                                }
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {uploadingCategoryId === -2 && !newSeriesData.imageUrl && (
                            <span className="text-sm text-blue-600">Uploading...</span>
                          )}
                          {newSeriesData.imageUrl && (
                            <div className="flex items-center gap-2">
                              <img 
                                src={newSeriesData.imageUrl} 
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
                        disabled={addSeriesMutation.isPending || !newSeriesData.name || !newSeriesData.categoryId || uploadingCategoryId === -2}
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
                          <label className="cursor-pointer relative group">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadingCategoryId(series.id * -100);
                                  try {
                                    const uploadParams = await handleGetSeriesUploadParameters();
                                    const response = await fetch(uploadParams.url, {
                                      method: uploadParams.method,
                                      body: file,
                                    });
                                    if (response.ok) {
                                      await apiRequest(`/api/series/${series.id}/image`, {
                                        method: "PATCH",
                                        body: { imageUrl: uploadParams.url },
                                        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
                                      });
                                      queryClient.invalidateQueries({ queryKey: ['/api/series/all'] });
                                      toast({ title: "Success", description: "Series image updated" });
                                    }
                                  } catch (error) {
                                    console.error('Upload failed:', error);
                                    toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
                                  } finally {
                                    setUploadingCategoryId(null);
                                    e.target.value = '';
                                  }
                                }
                              }}
                            />
                            {uploadingCategoryId === series.id * -100 ? (
                              <div className="w-12 h-12 rounded border flex items-center justify-center bg-gray-50">
                                <span className="text-xs text-blue-600">...</span>
                              </div>
                            ) : series.imageUrl ? (
                              <div className="relative">
                                <img
                                  src={series.imageUrl}
                                  alt={series.name}
                                  className="w-12 h-12 object-cover rounded border"
                                  onError={(e: any) => {
                                    e.target.src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>')}`;
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                  <Upload className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center hover:bg-gray-50">
                                <Upload className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                          </label>
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
                      <h3 className="text-lg font-semibold mb-2">Add New Model</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Model Lengths and associated Payloads, GVWR, and deck sizes can be edited once Model has been created.
                      </p>
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
                                  setUploadingCategoryId(-3);
                                  try {
                                    const uploadParams = await handleGetUploadParameters();
                                    const response = await fetch(uploadParams.url, {
                                      method: uploadParams.method,
                                      body: file,
                                    });
                                    if (response.ok) {
                                      setNewModelData(prev => ({ ...prev, imageUrl: uploadParams.url }));
                                      toast({
                                        title: "Success",
                                        description: "Image uploaded successfully",
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Upload failed:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to upload image",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setUploadingCategoryId(null);
                                  }
                                }
                              }}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {uploadingCategoryId === -3 && !newModelData.imageUrl && (
                              <span className="text-sm text-blue-600">Uploading...</span>
                            )}
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
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => {
                          setShowAddModel(false);
                          setAddModelError(null);
                        }}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => addModelMutation.mutate(newModelData)}
                          disabled={addModelMutation.isPending || !newModelData.name || !newModelData.modelSeries || !newModelData.categoryId || !newModelData.seriesId || (parseFloat(newModelData.basePrice as string) || 0) < 0 || uploadingCategoryId === -3}
                        >
                          Add Model
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Popup Modal */}
                {addModelError && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                      <div className="flex items-center mb-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-medium text-gray-900">Error Adding Model</h3>
                        </div>
                      </div>
                      <div className="mb-6">
                        <p className="text-sm text-gray-700">{addModelError}</p>
                      </div>
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => setAddModelError(null)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          OK
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
                  <TableHead>Axles</TableHead>
                  <TableHead>Other Options</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>3D Model</TableHead>
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
                            
                            const isExpanded = expandedLengthOptions[model.id];
                            const displayedOptions = isExpanded ? currentLengthOptions : [];
                            const hasLengths = currentLengthOptions.length > 0;
                            
                            return (
                              <div className="space-y-2">
                                {displayedOptions.map((length: string, index: number) => (
                                  <div key={index} className="border rounded-md p-2 bg-gray-50">
                                    <div className="flex items-center justify-between mb-1">
                                      {editingLengthFor?.modelId === model.id && editingLengthFor?.lengthIndex === index ? (
                                        <Input
                                          value={tempLengthValue}
                                          onChange={(e: any) => {
                                            // Only update the temporary display value while typing
                                            setTempLengthValue(e.target.value);
                                          }}
                                          onBlur={(e: any) => {
                                            updateLengthValue(model.id, editingLengthFor.originalLength, e.target.value);
                                            setEditingLengthFor(null);
                                            setTempLengthValue("");
                                          }}
                                          onKeyPress={(e: any) => {
                                            if (e.key === 'Enter') {
                                              updateLengthValue(model.id, editingLengthFor.originalLength, e.target.value);
                                              setEditingLengthFor(null);
                                              setTempLengthValue("");
                                            }
                                            if (e.key === 'Escape') {
                                              setEditingLengthFor(null);
                                              setTempLengthValue("");
                                            }
                                          }}
                                          className="text-xs h-6 font-medium"
                                          autoFocus
                                        />
                                      ) : (
                                        <span 
                                          className="text-xs font-medium text-blue-800 cursor-pointer hover:text-blue-600"
                                          onClick={() => {
                                            setEditingLengthFor({modelId: model.id, lengthIndex: index, originalLength: length});
                                            setTempLengthValue(length);
                                          }}
                                          title="Click to edit length value"
                                        >
                                          {length}
                                        </span>
                                      )}
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
                                      className="text-xs h-7 mb-2"
                                    />
                                    <Input
                                      placeholder="GVWR (e.g., 14,000 lbs)"
                                      value={(editData[model.id]?.lengthGvwr || model.lengthGvwr || {})[length] || ""}
                                      onChange={(e: any) => updateGvwrForLength(model.id, length, e.target.value)}
                                      className="text-xs h-7 mb-2"
                                    />
                                    <Input
                                      placeholder="Payload (e.g., 10,432 lbs)"
                                      value={(editData[model.id]?.lengthPayload || model.lengthPayload || {})[length] || ""}
                                      onChange={(e: any) => updatePayloadForLength(model.id, length, e.target.value)}
                                      className="text-xs h-7 mb-2"
                                    />
                                    <Input
                                      placeholder="Price (e.g., 1500)"
                                      type="number"
                                      value={(editData[model.id]?.lengthPrice || model.lengthPrice || {})[length] || ""}
                                      onChange={(e: any) => updatePriceForLength(model.id, length, e.target.value)}
                                      className="text-xs h-7"
                                    />
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => setShowOptionsPopup({
                                    ...showOptionsPopup,
                                    [model.id]: true
                                  })}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Edit Options
                                </button>
                              </div>
                            );
                          })()}
                          
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {(() => {
                            const lengthOptions = typeof model.lengthOptions === 'string' 
                              ? (model.lengthOptions ? JSON.parse(model.lengthOptions) : [])
                              : model.lengthOptions || [];
                            
                            const pulltypeOptions = model.pulltypeOptions || {};
                            const lengthPrice = typeof model.lengthPrice === 'string' 
                              ? (model.lengthPrice ? JSON.parse(model.lengthPrice) : {})
                              : model.lengthPrice || {};
                            const lengthGvwr = typeof model.lengthGvwr === 'string' 
                              ? (model.lengthGvwr ? JSON.parse(model.lengthGvwr) : {})
                              : model.lengthGvwr || {};
                            const lengthPayload = typeof model.lengthPayload === 'string' 
                              ? (model.lengthPayload ? JSON.parse(model.lengthPayload) : {})
                              : model.lengthPayload || {};
                            
                            const isExpanded = expandedLengthOptions[model.id];
                            const displayedOptions = isExpanded ? lengthOptions : [];
                            const hasLengths = lengthOptions.length > 0;
                            
                            return (
                              <div className="space-y-1">
                                {lengthOptions.length > 0 ? (
                                  displayedOptions.map((length: string, index: number) => (
                                    <div key={index} className="text-xs border rounded px-2 py-1 bg-gray-50">
                                      <div className="font-medium text-gray-800">{length}</div>
                                      {pulltypeOptions[length] && (
                                        <div className="text-gray-600 mt-1">{pulltypeOptions[length]}</div>
                                      )}
                                      {lengthGvwr[length] && (
                                        <div className="text-blue-600 mt-1">GVWR: {lengthGvwr[length]}</div>
                                      )}
                                      {lengthPrice[length] && lengthPrice[length] > 0 && (
                                        <div className="text-green-600 mt-1 font-medium">+${lengthPrice[length].toLocaleString()}</div>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-gray-400 text-xs">No length options</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setShowOptionsPopup({
                                    ...showOptionsPopup,
                                    [model.id]: true
                                  })}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                                >
                                  View Options
                                </button>
                              </div>
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
                      <button
                        type="button"
                        onClick={() => setGalleryModelId(model.id)}
                        className="p-0 relative"
                        title="Manage images"
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
                            {model.imageUrls && model.imageUrls.length > 1 && (
                              <span className="absolute bottom-0.5 right-0.5 text-[9px] px-1 py-0.5 bg-black/60 text-white rounded font-medium leading-none">
                                {model.imageUrls.length}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-center bg-gray-50">
                            <Upload className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <ObjectUploader
                        onGetUploadParameters={handleGetUploadParameters}
                        onComplete={(result) => handle3DModelUploadComplete(model.id, result)}
                        buttonClassName="p-0"
                        allowedFileTypes={['.glb', '.gltf']}
                        maxFileSize={52428800}
                        noteOverride="Upload a 3D model file (.glb or .gltf format, max 50MB)"
                      >
                        {model.model3dUrl ? (
                          <div className="w-12 h-12 rounded-md overflow-hidden border border-green-300 hover:border-green-500 transition-colors cursor-pointer flex items-center justify-center bg-green-50">
                            <span className="text-xs font-bold text-green-700">3D</span>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer flex items-center justify-center bg-gray-50">
                            <span className="text-xs text-gray-400">3D</span>
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
                            <TableCell>{model.axles || "—"}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {(() => {
                                  const lengthOptions = typeof model.lengthOptions === 'string' 
                                    ? (model.lengthOptions ? JSON.parse(model.lengthOptions) : [])
                                    : model.lengthOptions || [];
                                  
                                  const pulltypeOptions = model.pulltypeOptions || {};
                                  const lengthPrice = typeof model.lengthPrice === 'string' 
                                    ? (model.lengthPrice ? JSON.parse(model.lengthPrice) : {})
                                    : model.lengthPrice || {};
                                  const lengthGvwr = typeof model.lengthGvwr === 'string' 
                                    ? (model.lengthGvwr ? JSON.parse(model.lengthGvwr) : {})
                                    : model.lengthGvwr || {};
                                  const lengthPayload = typeof model.lengthPayload === 'string' 
                                    ? (model.lengthPayload ? JSON.parse(model.lengthPayload) : {})
                                    : model.lengthPayload || {};
                                  
                                  const isExpanded = expandedLengthOptions[model.id];
                                  const displayedOptions = isExpanded ? lengthOptions : [];
                                  const hasLengths = lengthOptions.length > 0;
                                  
                                  return (
                                    <div className="space-y-1">
                                      {lengthOptions.length > 0 ? (
                                        displayedOptions.map((length: string, index: number) => (
                                          <div key={index} className="text-xs border rounded px-2 py-1 bg-gray-50 opacity-60">
                                            <div className="font-medium text-gray-600">{length}</div>
                                            {pulltypeOptions[length] && (
                                              <div className="text-gray-500 mt-1">{pulltypeOptions[length]}</div>
                                            )}
                                            {lengthGvwr[length] && (
                                              <div className="text-blue-500 mt-1 opacity-75">GVWR: {lengthGvwr[length]}</div>
                                            )}
                                            {lengthPrice[length] && lengthPrice[length] > 0 && (
                                              <div className="text-green-500 mt-1 font-medium opacity-75">+${lengthPrice[length].toLocaleString()}</div>
                                            )}
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-gray-400 text-xs">No length options</span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => setShowOptionsPopup({
                                          ...showOptionsPopup,
                                          [model.id]: true
                                        })}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1 opacity-60"
                                      >
                                        View Options
                                      </button>
                                    </div>
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
                        <div className="flex gap-2">
                          <Select
                            value={newOptionData.category}
                            onValueChange={(value: string) => {
                              setNewOptionData({ ...newOptionData, category: value });
                            }}
                          >
                            {optionCategories.map((category: string) => (
                              <option key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                          onClick={() => setShowEditCategories(true)}
                        >
                          Edit/Add Categories
                        </button>
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
                      {newOptionData.category.toLowerCase() !== 'color' && (
                        <>
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
                              onChange={(e) => setNewOptionData({ ...newOptionData, isMultiSelect: e.target.checked, ...(e.target.checked ? { isPerFt: false } : {}) })}
                              className="rounded"
                              disabled={newOptionData.isPerFt}
                            />
                            <label htmlFor="isMultiSelect" className={`text-sm ${newOptionData.isPerFt ? 'text-gray-400' : ''}`}>Allow multiple selections</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="isPerFt"
                              checked={newOptionData.isPerFt}
                              onChange={(e) => setNewOptionData({ ...newOptionData, isPerFt: e.target.checked, ...(e.target.checked ? { isMultiSelect: false } : {}) })}
                              className="rounded"
                              disabled={newOptionData.isMultiSelect}
                            />
                            <label htmlFor="isPerFt" className={`text-sm ${newOptionData.isMultiSelect ? 'text-gray-400' : ''}`}>Price is per foot</label>
                          </div>
                        </>
                      )}
                      </div>
                      <div className="pb-6"></div>
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
                            isPerFt: newOptionData.isPerFt,
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
                    <TableHead>Multi-Select</TableHead>
                    <TableHead>Per Ft</TableHead>
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
                          editData[option.id]?._creatingCategory ? (
                            <div className="flex gap-1">
                              <Input
                                placeholder="New category"
                                value={editData[option.id]?._newCatName || ''}
                                onChange={(e: any) => setEditData({
                                  ...editData,
                                  [option.id]: { ...editData[option.id], _newCatName: e.target.value }
                                })}
                                className="text-xs w-24"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                className="px-2"
                                disabled={!(editData[option.id]?._newCatName || '').trim()}
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/categories/options', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${sessionId}`,
                                      },
                                      body: JSON.stringify({ name: editData[option.id]?._newCatName }),
                                    });
                                    if (!response.ok) {
                                      const data = await response.json();
                                      toast({ title: "Error", description: data.message || "Failed to create category", variant: "destructive" });
                                      return;
                                    }
                                    const data = await response.json();
                                    queryClient.invalidateQueries({ queryKey: ['/api/categories', 'options'] });
                                    setEditData({
                                      ...editData,
                                      [option.id]: { ...editData[option.id], category: data.name, _creatingCategory: false, _newCatName: '' }
                                    });
                                    toast({ title: "Success", description: "Category created" });
                                  } catch (error) {
                                    toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
                                  }
                                }}
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="px-2"
                                onClick={() => setEditData({
                                  ...editData,
                                  [option.id]: { ...editData[option.id], _creatingCategory: false, _newCatName: '' }
                                })}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Select
                              value={editData[option.id]?.category ?? option.category}
                              onValueChange={(value: string) => {
                                if (value === '__create_new__') {
                                  setEditData({
                                    ...editData,
                                    [option.id]: { ...editData[option.id], _creatingCategory: true, _newCatName: '' }
                                  });
                                } else {
                                  setEditData({
                                    ...editData,
                                    [option.id]: { ...editData[option.id], category: value }
                                  });
                                }
                              }}
                            >
                              {optionCategories.map((category: string) => (
                                <SelectItem key={category} value={category}>
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </SelectItem>
                              ))}
                              <SelectItem value="__create_new__">+ Create New</SelectItem>
                            </Select>
                          )
                        ) : (
                          option.category
                        )}
                      </TableCell>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <div className="space-y-2">
                            <Input
                              type="number"
                              value={editData[option.id]?.price ?? option.price}
                              onChange={(e: any) => setEditData({
                                ...editData,
                                [option.id]: { ...editData[option.id], price: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }
                              })}
                            />
                            {((editData[option.id]?.category ?? option.category) || '').toLowerCase() === 'color' && (
                              <div>
                                <label className="text-xs text-gray-500">Primer Price</label>
                                <Input
                                  type="number"
                                  value={editData[option.id]?.primerPrice ?? option.primerPrice ?? ""}
                                  onChange={(e: any) => setEditData({
                                    ...editData,
                                    [option.id]: { ...editData[option.id], primerPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }
                                  })}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div>${option.price?.toLocaleString()}</div>
                            {(option.category || '').toLowerCase() === 'color' && (
                              <div className="text-xs text-gray-500 mt-1">Primer: ${(option.primerPrice || 0).toLocaleString()}</div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <Switch
                            checked={editData[option.id]?.isMultiSelect ?? option.isMultiSelect ?? false}
                            onCheckedChange={(checked: boolean) => {
                              setEditData({
                                ...editData,
                                [option.id]: { ...editData[option.id], isMultiSelect: checked, ...(checked ? { isPerFt: false } : {}) }
                              });
                            }}
                            disabled={(editData[option.id]?.isPerFt ?? option.isPerFt) === true}
                          />
                        ) : (
                          <Switch
                            checked={option.isMultiSelect ?? false}
                            onCheckedChange={() => {}}
                            disabled={true}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <Switch
                            checked={editData[option.id]?.isPerFt ?? option.isPerFt ?? false}
                            onCheckedChange={(checked: boolean) => {
                              setEditData({
                                ...editData,
                                [option.id]: { ...editData[option.id], isPerFt: checked, ...(checked ? { isMultiSelect: false } : {}) }
                              });
                            }}
                            disabled={(editData[option.id]?.isMultiSelect ?? option.isMultiSelect) === true}
                          />
                        ) : (
                          <Switch
                            checked={option.isPerFt ?? false}
                            onCheckedChange={() => {}}
                            disabled={true}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {(option.category || '').toLowerCase() === 'color' ? (
                          editingOption?.id === option.id ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-10 h-10 rounded-md border border-gray-300"
                                style={{ backgroundColor: editData[option.id]?.hexColor ?? option.hexColor ?? '#cccccc' }}
                              />
                              <Input
                                value={editData[option.id]?.hexColor ?? option.hexColor ?? ''}
                                onChange={(e: any) => setEditData({
                                  ...editData,
                                  [option.id]: { ...editData[option.id], hexColor: e.target.value }
                                })}
                                placeholder="#000000"
                                className="w-24 text-xs"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-10 h-10 rounded-md border border-gray-200"
                                style={{ backgroundColor: option.hexColor || '#cccccc' }}
                              />
                              <span className="text-xs text-gray-500">{option.hexColor || '-'}</span>
                            </div>
                          )
                        ) : (
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
                          <TableHead>Multi-Select</TableHead>
                          <TableHead>Per Ft</TableHead>
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
                            <TableCell>
                              <div>
                                <div>${option.price}</div>
                                {(option.category || '').toLowerCase() === 'color' && option.primerPrice != null && (
                                  <div className="text-xs text-gray-500 mt-1">Primer: ${option.primerPrice?.toLocaleString()}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={option.isMultiSelect ?? false}
                                onCheckedChange={() => {}}
                                disabled={true}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={option.isPerFt ?? false}
                                onCheckedChange={() => {}}
                                disabled={true}
                              />
                            </TableCell>
                            <TableCell>
                              {(option.category || '').toLowerCase() === 'color' ? (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-10 h-10 rounded-md border border-gray-200"
                                    style={{ backgroundColor: option.hexColor || '#cccccc' }}
                                  />
                                  <span className="text-xs text-gray-500">{option.hexColor || '-'}</span>
                                </div>
                              ) : option.imageUrl ? (
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

        {/* Model Options Popup */}
        {Object.keys(showOptionsPopup).some(modelId => showOptionsPopup[parseInt(modelId)]) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full m-4 max-h-[90vh] flex flex-col">
              {(() => {
                const openModelId = parseInt(Object.keys(showOptionsPopup).find(modelId => showOptionsPopup[parseInt(modelId)]) || '0');
                const model = [...activeModels, ...archivedModels].find(m => m.id === openModelId);
                if (!model) return null;

                const isEditing = editingModel?.id === openModelId;
                
                // Use editData if in editing mode, otherwise use model data
                const lengthOptions = isEditing && editData[openModelId]?.lengthOptions
                  ? editData[openModelId].lengthOptions
                  : typeof model.lengthOptions === 'string' 
                    ? (model.lengthOptions ? JSON.parse(model.lengthOptions) : [])
                    : model.lengthOptions || [];
                
                const pulltypeOptions = isEditing && editData[openModelId]?.pulltypeOptions
                  ? editData[openModelId].pulltypeOptions
                  : model.pulltypeOptions || {};
                const lengthPrice = isEditing && editData[openModelId]?.lengthPrice
                  ? editData[openModelId].lengthPrice
                  : typeof model.lengthPrice === 'string' 
                    ? (model.lengthPrice ? JSON.parse(model.lengthPrice) : {})
                    : model.lengthPrice || {};
                const lengthGvwr = isEditing && editData[openModelId]?.lengthGvwr
                  ? editData[openModelId].lengthGvwr
                  : typeof model.lengthGvwr === 'string' 
                    ? (model.lengthGvwr ? JSON.parse(model.lengthGvwr) : {})
                    : model.lengthGvwr || {};
                const lengthPayload = isEditing && editData[openModelId]?.lengthPayload
                  ? editData[openModelId].lengthPayload
                  : typeof model.lengthPayload === 'string' 
                    ? (model.lengthPayload ? JSON.parse(model.lengthPayload) : {})
                    : model.lengthPayload || {};
                const lengthDeckSize = isEditing && editData[openModelId]?.lengthDeckSize
                  ? editData[openModelId].lengthDeckSize
                  : typeof model.lengthDeckSize === 'string' 
                    ? (model.lengthDeckSize ? JSON.parse(model.lengthDeckSize) : {})
                    : model.lengthDeckSize || {};
                const lengthOrder = isEditing && editData[openModelId]?.lengthOrder
                  ? editData[openModelId].lengthOrder
                  : typeof model.lengthOrder === 'string' 
                    ? (model.lengthOrder ? JSON.parse(model.lengthOrder) : {})
                    : model.lengthOrder || {};

                return (
                  <>
                    <div className="p-6 border-b">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold">{model.name}</h3>
                          <p className="text-gray-600 text-sm">Model ID: {model.modelId} {isEditing && <span className="text-blue-600 font-medium">(Editing Mode)</span>}</p>
                        </div>
                        <button
                          onClick={() => setShowOptionsPopup({
                            ...showOptionsPopup,
                            [openModelId]: false
                          })}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="space-y-6">
                        {/* Model Specifications */}
                        <div>
                          <h4 className="text-lg font-semibold mb-3">Model Specifications</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-600">Category:</span>
                              <div>{model.categoryName}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Series:</span>
                              <div>{model.seriesName || "No Series"}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Axles:</span>
                              <div>{model.axles || "—"}</div>
                            </div>
                            <div>
                              <span className="font-medium text-gray-600">Base Price:</span>
                              <div>${model.basePrice?.toLocaleString() || "0"}</div>
                            </div>
                          </div>
                        </div>

                        {/* Length Options */}
                        {(lengthOptions.length > 0 || isEditing) && (
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-lg font-semibold">Length Options</h4>
                              {isEditing && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setAddingLengthFor(openModelId)}
                                  className="text-xs"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add Length
                                </Button>
                              )}
                            </div>
                            
                            {/* Add new length input */}
                            {isEditing && addingLengthFor === openModelId && (
                              <div className="mb-3 p-3 border rounded-lg bg-blue-50">
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Enter length (e.g., 16', 20')"
                                    value={newLengthValue}
                                    onChange={(e: any) => setNewLengthValue(e.target.value)}
                                    onKeyPress={(e: any) => {
                                      if (e.key === 'Enter') {
                                        addLengthOption(openModelId, newLengthValue);
                                      }
                                    }}
                                    className="text-sm"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => addLengthOption(openModelId, newLengthValue)}
                                    disabled={!newLengthValue.trim()}
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
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                            
                            <div className="grid gap-3">
                              {[...lengthOptions].sort((a: string, b: string) => {
                                const orderA = lengthOrder[a] ?? 999;
                                const orderB = lengthOrder[b] ?? 999;
                                return orderA - orderB;
                              }).map((length: string, index: number) => (
                                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                  {isEditing ? (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">Length:</label>
                                          {editingLengthFor?.modelId === openModelId && editingLengthFor?.lengthIndex === index ? (
                                            <div className="flex gap-1">
                                              <Input
                                                value={tempLengthValue}
                                                onChange={(e: any) => setTempLengthValue(e.target.value)}
                                                className="text-sm"
                                                autoFocus
                                              />
                                              <Button
                                                size="sm"
                                                onClick={() => {
                                                  if (tempLengthValue.trim()) {
                                                    const newLengthOptions = [...lengthOptions];
                                                    const oldLength = newLengthOptions[index];
                                                    newLengthOptions[index] = tempLengthValue.trim();
                                                    
                                                    // Update pull type and GVWR keys
                                                    const newPulltypeOptions = { ...pulltypeOptions };
                                                    const newLengthGvwr = { ...lengthGvwr };
                                                    const newLengthPayload = { ...lengthPayload };
                                                    const newLengthDeckSize = { ...lengthDeckSize };
                                                    const newLengthPrice = { ...lengthPrice };
                                                    
                                                    if (oldLength !== tempLengthValue.trim()) {
                                                      newPulltypeOptions[tempLengthValue.trim()] = newPulltypeOptions[oldLength] || "";
                                                      newLengthGvwr[tempLengthValue.trim()] = newLengthGvwr[oldLength] || "";
                                                      newLengthPayload[tempLengthValue.trim()] = newLengthPayload[oldLength] || "";
                                                      newLengthDeckSize[tempLengthValue.trim()] = newLengthDeckSize[oldLength] || "";
                                                      newLengthPrice[tempLengthValue.trim()] = newLengthPrice[oldLength] || 0;
                                                      
                                                      delete newPulltypeOptions[oldLength];
                                                      delete newLengthGvwr[oldLength];
                                                      delete newLengthPayload[oldLength];
                                                      delete newLengthDeckSize[oldLength];
                                                      delete newLengthPrice[oldLength];
                                                    }
                                                    
                                                    setEditData({
                                                      ...editData,
                                                      [openModelId]: {
                                                        ...editData[openModelId],
                                                        lengthOptions: newLengthOptions,
                                                        pulltypeOptions: newPulltypeOptions,
                                                        lengthGvwr: newLengthGvwr,
                                                        lengthPayload: newLengthPayload,
                                                        lengthDeckSize: newLengthDeckSize,
                                                        lengthPrice: newLengthPrice
                                                      }
                                                    });
                                                    setEditingLengthFor(null);
                                                    setTempLengthValue("");
                                                  }
                                                }}
                                                className="px-2"
                                              >
                                                <Save className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  setEditingLengthFor(null);
                                                  setTempLengthValue("");
                                                }}
                                                className="px-2"
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <div className="flex flex-col mr-1">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => {
                                                    const sortedLengths = [...lengthOptions].sort((a: string, b: string) => {
                                                      const orderA = lengthOrder[a] ?? 999;
                                                      const orderB = lengthOrder[b] ?? 999;
                                                      return orderA - orderB;
                                                    });
                                                    const currentSortedIndex = sortedLengths.indexOf(length);
                                                    if (currentSortedIndex > 0) {
                                                      const newOrder = { ...lengthOrder };
                                                      const prevLength = sortedLengths[currentSortedIndex - 1];
                                                      const tempOrder = newOrder[length] ?? currentSortedIndex + 1;
                                                      newOrder[length] = newOrder[prevLength] ?? currentSortedIndex;
                                                      newOrder[prevLength] = tempOrder;
                                                      setEditData({
                                                        ...editData,
                                                        [openModelId]: { ...editData[openModelId], lengthOrder: newOrder }
                                                      });
                                                    }
                                                  }}
                                                  className="p-0 h-5 w-5"
                                                  disabled={(() => {
                                                    const sortedLengths = [...lengthOptions].sort((a: string, b: string) => {
                                                      const orderA = lengthOrder[a] ?? 999;
                                                      const orderB = lengthOrder[b] ?? 999;
                                                      return orderA - orderB;
                                                    });
                                                    return sortedLengths.indexOf(length) === 0;
                                                  })()}
                                                >
                                                  <ArrowUp className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => {
                                                    const sortedLengths = [...lengthOptions].sort((a: string, b: string) => {
                                                      const orderA = lengthOrder[a] ?? 999;
                                                      const orderB = lengthOrder[b] ?? 999;
                                                      return orderA - orderB;
                                                    });
                                                    const currentSortedIndex = sortedLengths.indexOf(length);
                                                    if (currentSortedIndex < sortedLengths.length - 1) {
                                                      const newOrder = { ...lengthOrder };
                                                      const nextLength = sortedLengths[currentSortedIndex + 1];
                                                      const tempOrder = newOrder[length] ?? currentSortedIndex + 1;
                                                      newOrder[length] = newOrder[nextLength] ?? currentSortedIndex + 2;
                                                      newOrder[nextLength] = tempOrder;
                                                      setEditData({
                                                        ...editData,
                                                        [openModelId]: { ...editData[openModelId], lengthOrder: newOrder }
                                                      });
                                                    }
                                                  }}
                                                  className="p-0 h-5 w-5"
                                                  disabled={(() => {
                                                    const sortedLengths = [...lengthOptions].sort((a: string, b: string) => {
                                                      const orderA = lengthOrder[a] ?? 999;
                                                      const orderB = lengthOrder[b] ?? 999;
                                                      return orderA - orderB;
                                                    });
                                                    return sortedLengths.indexOf(length) === sortedLengths.length - 1;
                                                  })()}
                                                >
                                                  <ArrowDown className="w-3 h-3" />
                                                </Button>
                                              </div>
                                              <span className="font-semibold">{length}</span>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                  setEditingLengthFor({ modelId: openModelId, lengthIndex: index, originalLength: length });
                                                  setTempLengthValue(length);
                                                }}
                                                className="p-1 h-6 w-6"
                                              >
                                                <Edit className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">Pull Type:</label>
                                          <Input
                                            value={pulltypeOptions[length] || ""}
                                            onChange={(e: any) => {
                                              const newPulltypeOptions = { ...pulltypeOptions, [length]: e.target.value };
                                              setEditData({
                                                ...editData,
                                                [openModelId]: { ...editData[openModelId], pulltypeOptions: newPulltypeOptions }
                                              });
                                            }}
                                            placeholder="e.g., Gooseneck, Bumper Pull"
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">GVWR:</label>
                                          <Input
                                            value={lengthGvwr[length] || ""}
                                            onChange={(e: any) => {
                                              const newLengthGvwr = { ...lengthGvwr, [length]: e.target.value };
                                              setEditData({
                                                ...editData,
                                                [openModelId]: { ...editData[openModelId], lengthGvwr: newLengthGvwr }
                                              });
                                            }}
                                            placeholder="e.g., 14,000 lbs"
                                            className="text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">Payload:</label>
                                          <Input
                                            value={lengthPayload[length] || ""}
                                            onChange={(e: any) => {
                                              const newLengthPayload = { ...lengthPayload, [length]: e.target.value };
                                              setEditData({
                                                ...editData,
                                                [openModelId]: { ...editData[openModelId], lengthPayload: newLengthPayload }
                                              });
                                            }}
                                            placeholder="e.g., 10,432 lbs"
                                            className="text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">Deck Size:</label>
                                          <Input
                                            value={lengthDeckSize[length] || ""}
                                            onChange={(e: any) => {
                                              const newLengthDeckSize = { ...lengthDeckSize, [length]: e.target.value };
                                              setEditData({
                                                ...editData,
                                                [openModelId]: { ...editData[openModelId], lengthDeckSize: newLengthDeckSize }
                                              });
                                            }}
                                            placeholder="e.g., 83 x 20 ft"
                                            className="text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">Price Adjustment ($):</label>
                                          <Input
                                            type="number"
                                            value={lengthPrice[length] || 0}
                                            onChange={(e: any) => {
                                              const newLengthPrice = { ...lengthPrice, [length]: parseFloat(e.target.value) || 0 };
                                              setEditData({
                                                ...editData,
                                                [openModelId]: { ...editData[openModelId], lengthPrice: newLengthPrice }
                                              });
                                            }}
                                            placeholder="0"
                                            className="text-sm"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-end">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            const newLengthOptions = lengthOptions.filter((_, i) => i !== index);
                                            const newPulltypeOptions = { ...pulltypeOptions };
                                            const newLengthGvwr = { ...lengthGvwr };
                                            const newLengthPayload = { ...lengthPayload };
                                            const newLengthDeckSize = { ...lengthDeckSize };
                                            const newLengthPrice = { ...lengthPrice };
                                            
                                            delete newPulltypeOptions[length];
                                            delete newLengthGvwr[length];
                                            delete newLengthPayload[length];
                                            delete newLengthDeckSize[length];
                                            delete newLengthPrice[length];
                                            
                                            setEditData({
                                              ...editData,
                                              [openModelId]: {
                                                ...editData[openModelId],
                                                lengthOptions: newLengthOptions,
                                                pulltypeOptions: newPulltypeOptions,
                                                lengthGvwr: newLengthGvwr,
                                                lengthPayload: newLengthPayload,
                                                lengthDeckSize: newLengthDeckSize,
                                                lengthPrice: newLengthPrice
                                              }
                                            });
                                          }}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 className="w-3 h-3 mr-1" />
                                          Remove
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                                      <div>
                                        <span className="font-medium text-gray-600">Length:</span>
                                        <div className="font-semibold">{length}</div>
                                      </div>
                                      {pulltypeOptions[length] && (
                                        <div>
                                          <span className="font-medium text-gray-600">Pull Type:</span>
                                          <div>{pulltypeOptions[length]}</div>
                                        </div>
                                      )}
                                      {lengthGvwr[length] && (
                                        <div>
                                          <span className="font-medium text-gray-600">GVWR:</span>
                                          <div className="text-blue-600 font-medium">{lengthGvwr[length]}</div>
                                        </div>
                                      )}
                                      {lengthPayload[length] && (
                                        <div>
                                          <span className="font-medium text-gray-600">Payload:</span>
                                          <div className="text-purple-600 font-medium">{lengthPayload[length]}</div>
                                        </div>
                                      )}
                                      {lengthDeckSize[length] && (
                                        <div>
                                          <span className="font-medium text-gray-600">Deck Size:</span>
                                          <div className="text-green-600 font-medium">{lengthDeckSize[length]}</div>
                                        </div>
                                      )}
                                      {lengthPrice[length] && lengthPrice[length] > 0 && (
                                        <div>
                                          <span className="font-medium text-gray-600">Price Adjustment:</span>
                                          <div className="text-green-600 font-semibold">+${lengthPrice[length].toLocaleString()}</div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Category Display Order */}
                        {(() => {
                          // Build sorted list using local draft order, then model-specific order, then global position
                          const effectiveCategoryOrder: Record<string, number> = localCategoryOrder[openModelId] ?? model.categoryOrder ?? {};
                          const sortedCategories = [...categoryDetails].sort((a: any, b: any) => {
                            const posA = effectiveCategoryOrder[a.name] !== undefined ? effectiveCategoryOrder[a.name] : a.position ?? 999;
                            const posB = effectiveCategoryOrder[b.name] !== undefined ? effectiveCategoryOrder[b.name] : b.position ?? 999;
                            return posA - posB;
                          });

                          const moveCategory = (catName: string, direction: 'up' | 'down') => {
                            const currentIdx = sortedCategories.findIndex((c: any) => c.name === catName);
                            const swapIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
                            if (swapIdx < 0 || swapIdx >= sortedCategories.length) return;
                            const newSorted = [...sortedCategories];
                            [newSorted[currentIdx], newSorted[swapIdx]] = [newSorted[swapIdx], newSorted[currentIdx]];
                            const newCategoryOrder: Record<string, number> = {};
                            newSorted.forEach((c: any, idx: number) => { newCategoryOrder[c.name] = idx * 10; });
                            setLocalCategoryOrder(prev => ({ ...prev, [openModelId]: newCategoryOrder }));
                          };

                          return (
                            <div className="border border-gray-200 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">Option Display Order</h4>
                              <p className="text-xs text-gray-500 mb-3">Control the order options appear in the configurator for this model.</p>
                              <div className="space-y-1">
                                {sortedCategories.map((cat: any, idx: number) => (
                                  <div key={cat.id} className="flex items-center gap-1 py-1 px-2 rounded bg-gray-50 border border-gray-100">
                                    <div className="flex flex-col gap-0.5 mr-1">
                                      <button
                                        disabled={idx === 0}
                                        onClick={() => moveCategory(cat.name, 'up')}
                                        className={`w-5 h-4 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed`}
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        disabled={idx === sortedCategories.length - 1}
                                        onClick={() => moveCategory(cat.name, 'down')}
                                        className={`w-5 h-4 flex items-center justify-center rounded text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed`}
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <span className="text-sm flex-1">{cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</span>
                                    {cat.isSystem && (
                                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Built-in</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Available Options Note */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <h4 className="text-lg font-semibold mb-2 text-blue-900">Additional Options</h4>
                          <p className="text-blue-800 text-sm">
                            This model may have additional customizable options like tire upgrades, jack options, color choices, and accessories. 
                            These options become available during the configuration process in the main configurator.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Image Gallery Modal */}
      {galleryModelId !== null && (() => {
        const gModel = [...activeModels, ...archivedModels].find((m: any) => m.id === galleryModelId);
        if (!gModel) return null;
        const gallery: string[] = gModel.imageUrls && gModel.imageUrls.length > 0
          ? gModel.imageUrls
          : gModel.imageUrl ? [gModel.imageUrl] : [];

        const removeImage = async (url: string) => {
          try {
            await apiRequest(`/api/models/${galleryModelId}/images`, {
              method: 'DELETE',
              body: { url },
              headers: { Authorization: `Bearer ${sessionId}` },
            });
            queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
            toast({ title: "Success", description: "Image removed" });
          } catch {
            toast({ title: "Error", description: "Failed to remove image", variant: "destructive" });
          }
        };

        const moveImage = async (idx: number, direction: 'left' | 'right') => {
          const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= gallery.length) return;
          const newUrls = [...gallery];
          [newUrls[idx], newUrls[swapIdx]] = [newUrls[swapIdx], newUrls[idx]];
          try {
            await apiRequest(`/api/models/${galleryModelId}/images/reorder`, {
              method: 'PATCH',
              body: { urls: newUrls },
              headers: { Authorization: `Bearer ${sessionId}` },
            });
            queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
          } catch {
            toast({ title: "Error", description: "Failed to reorder images", variant: "destructive" });
          }
        };

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="text-lg font-semibold">Image Gallery</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{gModel.name} — the first image is the primary shown in the configurator.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setGalleryModelId(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-5">
                <div className="flex flex-wrap gap-3 items-center">
                  {gallery.map((url, idx) => (
                    <div key={url} className="relative group w-24 h-24">
                      <img
                        src={url}
                        alt={`Gallery image ${idx + 1}`}
                        className="w-full h-full object-cover rounded-md border border-gray-200"
                        onError={(e: any) => {
                          e.target.onerror = null;
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="none"%3E%3Crect width="80" height="80" fill="%23f3f4f6"/%3E%3Cpath stroke="%239ca3af" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M40 32v16m-8-8h16"/%3E%3C/svg%3E';
                        }}
                      />
                      {idx === 0 && (
                        <span className="absolute top-0.5 left-0.5 text-[9px] px-1 py-0.5 bg-blue-600 text-white rounded font-medium leading-none">Primary</span>
                      )}
                      <button
                        onClick={() => removeImage(url)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          disabled={idx === 0}
                          onClick={() => moveImage(idx, 'left')}
                          className="w-6 h-5 bg-white/90 rounded flex items-center justify-center disabled:opacity-30 hover:bg-white shadow-sm"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          disabled={idx === gallery.length - 1}
                          onClick={() => moveImage(idx, 'right')}
                          className="w-6 h-5 bg-white/90 rounded flex items-center justify-center disabled:opacity-30 hover:bg-white shadow-sm"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <ObjectUploader
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={(result) => handleGalleryImageUploadComplete(galleryModelId, result)}
                    skipPreview
                  >
                    <div className="w-24 h-24 rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer flex flex-col items-center justify-center bg-gray-50 gap-1">
                      <Plus className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-400">Add Image</span>
                    </div>
                  </ObjectUploader>
                </div>
                {gallery.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">No images yet. Click "Add Image" to upload the first one.</p>
                )}
              </div>
              <div className="p-4 border-t flex justify-end">
                <Button variant="outline" onClick={() => setGalleryModelId(null)}>Done</Button>
              </div>
            </div>
          </div>
        );
      })()}

      {showEditCategories && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Edit/Add Categories</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowEditCategories(false); setEditingCatId(null); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 border-b">
              <label className="block text-sm font-medium mb-2">Add New Category</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={(e: any) => setNewCategoryName(e.target.value)}
                />
                <Button
                  size="sm"
                  disabled={!newCategoryName.trim()}
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/categories/options', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${sessionId}`,
                        },
                        body: JSON.stringify({ name: newCategoryName }),
                      });
                      if (!response.ok) {
                        const data = await response.json();
                        toast({ title: "Error", description: data.message || "Failed to create category", variant: "destructive" });
                        return;
                      }
                      const data = await response.json();
                      queryClient.invalidateQueries({ queryKey: ['/api/categories', 'options'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/categories/options/details'] });
                      setNewOptionData({ ...newOptionData, category: data.name });
                      setNewCategoryName("");
                      toast({ title: "Success", description: "Category created" });
                    } catch (error) {
                      toast({ title: "Error", description: "Failed to create category", variant: "destructive" });
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {categoryDetailsLoading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : localGlobalCatOrder.length === 0 ? (
                <div className="text-center py-4 text-gray-500">No categories found</div>
              ) : (
                <div className="space-y-2">
                  {localGlobalCatOrder.map((cat: any, idx: number) => (
                      <div key={cat.id} className="flex items-center gap-1 p-2 border rounded-md">
                        {/* Position arrows */}
                        <div className="flex flex-col gap-0.5 mr-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-1 py-0 h-5 w-5"
                            disabled={idx === 0}
                            onClick={async () => {
                              // Update UI immediately
                              setLocalGlobalCatOrder(prev => {
                                const next = [...prev];
                                [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                                return next;
                              });
                              try {
                                const response = await fetch(`/api/categories/options/${cat.id}/position`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
                                  body: JSON.stringify({ direction: 'up' }),
                                });
                                if (!response.ok) {
                                  const data = await response.json();
                                  toast({ title: "Error", description: data.message, variant: "destructive" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/categories/options/details'] });
                                  return;
                                }
                                queryClient.invalidateQueries({ queryKey: ['/api/categories', 'options'] });
                              } catch {
                                toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
                                queryClient.invalidateQueries({ queryKey: ['/api/categories/options/details'] });
                              }
                            }}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-1 py-0 h-5 w-5"
                            disabled={idx === localGlobalCatOrder.length - 1}
                            onClick={async () => {
                              // Update UI immediately
                              setLocalGlobalCatOrder(prev => {
                                const next = [...prev];
                                [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                return next;
                              });
                              try {
                                const response = await fetch(`/api/categories/options/${cat.id}/position`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
                                  body: JSON.stringify({ direction: 'down' }),
                                });
                                if (!response.ok) {
                                  const data = await response.json();
                                  toast({ title: "Error", description: data.message, variant: "destructive" });
                                  queryClient.invalidateQueries({ queryKey: ['/api/categories/options/details'] });
                                  return;
                                }
                                queryClient.invalidateQueries({ queryKey: ['/api/categories', 'options'] });
                              } catch {
                                toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
                                queryClient.invalidateQueries({ queryKey: ['/api/categories/options/details'] });
                              }
                            }}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                        {cat.isSystem ? (
                          <div className="flex items-center flex-1 gap-2">
                            <span className="flex-1 text-sm font-medium text-gray-700">{cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Built-in</span>
                          </div>
                        ) : editingCatId === cat.id ? (
                          <>
                            <Input
                              value={editingCatName}
                              onChange={(e: any) => setEditingCatName(e.target.value)}
                              className="flex-1 text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="px-2"
                              disabled={!editingCatName.trim() || editingCatName.trim().toLowerCase() === cat.name.toLowerCase()}
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/categories/options/${cat.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionId}` },
                                    body: JSON.stringify({ name: editingCatName }),
                                  });
                                  if (!response.ok) {
                                    const data = await response.json();
                                    toast({ title: "Error", description: data.message, variant: "destructive" });
                                    return;
                                  }
                                  queryClient.invalidateQueries({ queryKey: ['/api/categories/options/details'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/categories', 'options'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/options/all'] });
                                  setEditingCatId(null);
                                  toast({ title: "Success", description: "Category renamed" });
                                } catch {
                                  toast({ title: "Error", description: "Failed to rename category", variant: "destructive" });
                                }
                              }}
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="px-2" onClick={() => setEditingCatId(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm font-medium">{cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2"
                              onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="px-2 text-red-600 hover:text-red-700"
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/categories/options/${cat.id}`, {
                                    method: 'DELETE',
                                    headers: { Authorization: `Bearer ${sessionId}` },
                                  });
                                  if (!response.ok) {
                                    const data = await response.json();
                                    toast({ title: "Cannot Delete", description: data.message, variant: "destructive" });
                                    return;
                                  }
                                  queryClient.invalidateQueries({ queryKey: ['/api/categories/options/details'] });
                                  queryClient.invalidateQueries({ queryKey: ['/api/categories', 'options'] });
                                  toast({ title: "Success", description: "Category deleted" });
                                } catch {
                                  toast({ title: "Error", description: "Failed to delete category", variant: "destructive" });
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
              )}
            </div>
            <div className="px-4 pb-3 pt-2 border-t bg-amber-50 border-amber-200">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Note:</span> Changing order here only affects the default category order when creating a new model. To change the order for an existing model, go to the <span className="font-semibold">Models tab</span> and open a model's edit panel.
              </p>
            </div>
            <div className="p-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => { setShowEditCategories(false); setEditingCatId(null); }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}