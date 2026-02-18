import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Download, Mail, MapPin, RotateCcw, Info, X, Users, Phone, Building, Building2, Save, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getOptionInfo } from "@/lib/trailer-option-info";
import waltonLogo from "@/assets/walton-logo-white.png";
import { DealerSaveDialog } from "@/components/dealer-save-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrailerSeries } from "@shared/schema";

// Color mapping for trailer colors
const getColorHex = (colorName: string): string => {
  const colorMap: Record<string, string> = {
    'black': '#1a1a1a',
    'white': '#ffffff', 
    'red': '#dc2626',
    'blue': '#2563eb',
    'green': '#16a34a',
    'gray': '#6b7280',
    'grey': '#6b7280',
    'silver': '#9ca3af',
    'yellow': '#eab308',
    'orange': '#ea580c',
    'brown': '#a16207',
    'tan': '#d2b48c',
    'beige': '#f5f5dc',
    'navy': '#1e3a8a',
    'maroon': '#7f1d1d',
    'purple': '#7c3aed',
    'pink': '#ec4899',
    'teal': '#0d9488',
    'lime': '#65a30d',
    'gold': '#ca8a04'
  };
  
  const normalizedName = colorName.toLowerCase().trim();
  return colorMap[normalizedName] || '#4b5563'; // Default gray if color not found
};

// Quote form schema
const quoteFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  zipCode: z.string().min(1, "Zip/postal code is required"),
  mobile: z.string().min(1, "Mobile number is required"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().optional(),
  comments: z.string().optional(),
  optIn: z.boolean().default(false),
  ageVerification: z.boolean().refine(val => val === true, "You must verify that you are over 16 years of age")
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;

// Import the response types that match our API
interface TrailerCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  startingPrice: number;
  orderIndex: number;
}

interface TrailerModel {
  id: number;
  categoryId: number;
  modelId?: string;
  name: string;
  gvwr?: string;
  payload?: string;
  deckSize?: string;
  axles?: string;
  basePrice?: number;
  imageUrl: string;
  features?: string[];
  lengthGvwr?: Record<string, string> | null;
  lengthPayload?: Record<string, string> | null;
  lengthDeckSize?: Record<string, string> | null;
  lengthOptions?: string[] | null;
  lengthPrice?: Record<string, number> | null;
  pulltypeOptions?: Record<string, string> | null;
  isArchived?: boolean;
  // Additional properties for PDF generation compatibility
  series?: string | null;
  seriesId?: number | null;
  modelSeries?: string;
  pullType?: string | null;
  gvwrRange?: string | null;
  deckHeight?: string | null;
  overallWidth?: string | null;
  lengthRange?: string | null;
  standardFeatures?: string[];
}

interface TrailerOption {
  id: number;
  modelId: string;
  category: string;
  name: string;
  price: number;
  isMultiSelect: boolean;
  isDefault?: boolean; // Whether this is the default option in its category
  payload?: number; // Optional payload for certain options
  hexColor?: string; // Hex color value for color options (renamed from hex_color by API)
  primerPrice?: number; // Primer price for color options
}

// Option Info Modal Component
function OptionInfoModal({ optionName, children }: { optionName: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const optionInfo = getOptionInfo(optionName);

  if (!optionInfo) {
    return <>{children}</>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <Info className="w-4 h-4 text-gray-400 hover:text-blue-500" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-semibold text-gray-900">
            {optionInfo.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {optionInfo.imageUrl && (
            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <img 
                src={optionInfo.imageUrl} 
                alt={optionInfo.title}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          )}
          
          <div>
            <p className="text-gray-700 text-base leading-relaxed mb-4">
              {optionInfo.description}
            </p>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Benefits</h4>
            <ul className="space-y-2">
              {optionInfo.benefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {optionInfo.specifications && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Specifications</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(optionInfo.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 font-medium">{key}:</span>
                      <span className="text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button 
              onClick={() => setOpen(false)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Configurator() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<TrailerCategory | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<TrailerSeries | null>(null);
  const [selectedModel, setSelectedModel] = useState<TrailerModel | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});
  const [selectedPrimer, setSelectedPrimer] = useState<Record<string, boolean>>({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [hoveredCategory, setHoveredCategory] = useState<TrailerCategory | null>(null);
  const [hoveredModel, setHoveredModel] = useState<TrailerModel | null>(null);
  const [showCustomQuoteModal, setShowCustomQuoteModal] = useState(false);
  const [customQuoteForm, setCustomQuoteForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    city: "",
    state: "",
    zipCode: "",
    requirements: ""
  });
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [isDealerLoggedIn, setIsDealerLoggedIn] = useState(false);
  const [showDealerSaveDialog, setShowDealerSaveDialog] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  // Quote form
  const quoteForm = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      zipCode: "",
      mobile: "",
      email: "",
      company: "",
      comments: "",
      optIn: false,
      ageVerification: false
    }
  });

  const { data: categories, isLoading, error } = useQuery<TrailerCategory[]>({
    queryKey: ['/api/categories'],
  });

  // Check if dealer is logged in
  useEffect(() => {
    const dealerSession = localStorage.getItem("dealer_session");
    setIsDealerLoggedIn(!!dealerSession);
  }, []);

  // Save order mutation for dealers
  const saveOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest("/api/dealer/orders", {
        method: "POST",
        body: orderData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "The configuration has been saved to your dealer account. Redirecting to your dashboard...",
      });
      setShowDealerSaveDialog(false);
      
      // Invalidate dealer orders query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/dealer/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dealer/profile"] });
      
      // Redirect to dealer dashboard after successful save
      setTimeout(() => {
        setLocation("/dealer/dashboard");
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const handleDealerSaveConfiguration = async (customerInfo: any) => {
    if (!selectedModel || !selectedCategory) return;

    // Create complete options object including defaults for single-select only
    const completeOptions: Record<string, any> = {};
    
    if (options) {
      const allCategories = [...new Set(options.map(opt => opt.category))];
      
      allCategories.forEach(category => {
        const categoryOptions = options.filter(opt => opt.category === category);
        if (categoryOptions.length > 0) {
          const selectedOptionId = selectedOptions[category];
          const isMultiSelect = categoryOptions[0]?.isMultiSelect || category === 'extras';
          
          // For multi-select: only save if explicitly selected
          // For single-select: save selected value or default to first option
          if (selectedOptionId) {
            completeOptions[category] = selectedOptionId;
          } else if (!isMultiSelect) {
            // Only add default for single-select options
            completeOptions[category] = categoryOptions[0].id;
          }
          // If multi-select and nothing selected, don't add to completeOptions
        }
      });
    }

    await saveOrderMutation.mutateAsync({
      customerName: customerInfo.customerName || null,
      customerEmail: customerInfo.customerEmail || null,
      customerPhone: customerInfo.customerPhone || null,
      categorySlug: selectedCategory.slug,
      categoryName: selectedCategory.name,
      modelId: selectedModel.modelId,
      modelName: selectedModel.name,
      modelSpecs: {
        gvwr: getDynamicGvwr(),
        payload: getDynamicPayload(),
        deckSize: getDynamicDeckSize(),
        axles: selectedModel.axles
      },
      selectedOptions: completeOptions,
      basePrice: selectedModel.basePrice || 0,
      optionsPrice: totalPrice - (selectedModel.basePrice || 0),
      totalPrice: totalPrice,
      notes: customerInfo.notes || null
    });
  };



  const { data: models } = useQuery<TrailerModel[]>({
    queryKey: ['/api/categories', selectedCategory?.slug, 'models'],
    enabled: !!selectedCategory?.slug
  });

  const { data: options } = useQuery<TrailerOption[]>({
    queryKey: ['/api/models', selectedModel?.modelId, 'options'],
    enabled: !!selectedModel?.modelId
  });

  // Fetch series for any selected category (dynamic)
  const { data: categorySeries, isLoading: isSeriesLoading } = useQuery<any[]>({
    queryKey: ['/api/categories', selectedCategory?.slug, 'series'],
    enabled: !!selectedCategory?.slug
  });

  // Fetch models by selected series (database-driven filtering)
  const { data: seriesModels } = useQuery<TrailerModel[]>({
    queryKey: ['/api/series', selectedSeries?.id, 'models'],
    enabled: !!selectedSeries?.id
  });

  // Calculate total price
  useEffect(() => {
    if (!selectedModel) {
      setTotalPrice(0);
      return;
    }

    let price = selectedModel.basePrice || 0;
    
    if (options && Object.keys(selectedOptions).length > 0) {
      Object.entries(selectedOptions).forEach(([category, selected]) => {
        // Handle custom pull options
        if (category === 'pullOption' && selected === 'Gooseneck') {
          price = (price || 0) + 2500;
        } else {
          // Handle database options
          const categoryOptions = options.filter(opt => opt.category === category);
          
          if (Array.isArray(selected)) {
            selected.forEach((optionId: number) => {
              const option = categoryOptions.find(opt => opt.id === optionId);
              if (option) {
                // Check if this is a multi-select option and multiply by quantity
                if (option.isMultiSelect) {
                  const quantity = selectedOptions[`${category}_${optionId}_qty`] || 1;
                  price = (price || 0) + (option.price || 0) * quantity;
                } else {
                  price = (price || 0) + (option.price || 0);
                }
              }
            });
          } else if (selected !== undefined) {
            const option = categoryOptions.find(opt => opt.id === selected);
            if (option) price = (price || 0) + (option.price || 0);
          }
        }
      });
    }
    
    // Add primer costs for selected primers
    if (options && Object.keys(selectedPrimer).length > 0) {
      Object.entries(selectedPrimer).forEach(([category, isPrimerSelected]) => {
        if (isPrimerSelected) {
          // Find the selected color option for this category
          const categoryOptions = options.filter(opt => opt.category === category);
          // Use explicitly selected option, or fall back to default (first option)
          const selectedColorOption = selectedOptions[category]
            ? categoryOptions.find(opt => opt.id === selectedOptions[category])
            : categoryOptions.find(opt => opt.isDefault) || categoryOptions[0];
          
          // Add primer price if the color option has one
          if (selectedColorOption && selectedColorOption.primerPrice && selectedColorOption.primerPrice > 0) {
            price = (price || 0) + selectedColorOption.primerPrice;
          }
        }
      });
    }
    
    setTotalPrice(price);
  }, [selectedModel, selectedOptions, selectedPrimer, options]);

  // Calculate dynamic payload based on selected length option
  const getDynamicPayload = () => {
    if (!selectedModel || !options) {
      return selectedModel?.payload || 'N/A';
    }

    // If model has length-specific payload data, use it
    if (selectedModel.lengthPayload) {
      const lengthOptions = options.filter(opt => opt.category === 'length');
      
      // Determine which length option to use
      let targetLengthOption;
      if (selectedOptions.length) {
        // Use explicitly selected length
        targetLengthOption = lengthOptions.find(opt => opt.id === selectedOptions.length);
      } else if (lengthOptions.length > 0) {
        // Use default (first) length option when no length is explicitly selected
        targetLengthOption = lengthOptions[0];
      }
      
      if (targetLengthOption) {
        // Parse lengthPayload data (it might be string or object)
        let lengthPayloadData = selectedModel.lengthPayload;
        if (typeof lengthPayloadData === 'string') {
          try {
            lengthPayloadData = JSON.parse(lengthPayloadData);
          } catch (e) {
            console.warn('Failed to parse lengthPayload data:', e);
            return selectedModel?.payload || 'N/A';
          }
        }

        // Get payload for the target length
        const payloadForLength = lengthPayloadData[targetLengthOption.name];
        if (payloadForLength) {
          return payloadForLength;
        }
      }
    }

    // Default to model payload
    return selectedModel?.payload || 'N/A';
  };

  // Calculate dynamic deck size based on selected length option
  const getDynamicDeckSize = () => {
    if (!selectedModel || !options) {
      return 'N/A';
    }

    // If model has length-specific deck size data, use it
    if (selectedModel.lengthDeckSize) {
      const lengthOptions = options.filter(opt => opt.category === 'length');
      
      // Determine which length option to use
      let targetLengthOption;
      if (selectedOptions.length) {
        // Use explicitly selected length
        targetLengthOption = lengthOptions.find(opt => opt.id === selectedOptions.length);
      } else if (lengthOptions.length > 0) {
        // Use default (first) length option when no length is explicitly selected
        targetLengthOption = lengthOptions[0];
      }
      
      if (targetLengthOption) {
        // Parse lengthDeckSize data (it might be string or object)
        let lengthDeckSizeData = selectedModel.lengthDeckSize;
        if (typeof lengthDeckSizeData === 'string') {
          try {
            lengthDeckSizeData = JSON.parse(lengthDeckSizeData);
          } catch (e) {
            console.warn('Failed to parse lengthDeckSize data:', e);
            return 'N/A';
          }
        }

        // Get deck size for the target length
        const deckSizeForLength = lengthDeckSizeData[targetLengthOption.name];
        if (deckSizeForLength) {
          return deckSizeForLength;
        }
      }
    }

    // Default fallback
    return 'N/A';
  };

  // Calculate dynamic GVWR based on selected length option
  const getDynamicGvwr = () => {
    if (!selectedModel || !options) {
      return selectedModel?.gvwr || 'N/A';
    }

    // If model has length-specific GVWR data, use it
    if (selectedModel.lengthGvwr) {
      const lengthOptions = options.filter(opt => opt.category === 'length');
      
      // Determine which length option to use
      let targetLengthOption;
      if (selectedOptions.length) {
        // Use explicitly selected length
        targetLengthOption = lengthOptions.find(opt => opt.id === selectedOptions.length);
      } else if (lengthOptions.length > 0) {
        // Use default (first) length option when no length is explicitly selected
        targetLengthOption = lengthOptions[0];
      }
      
      if (targetLengthOption) {
        // Parse lengthGvwr data (it might be string or object)
        let lengthGvwrData = selectedModel.lengthGvwr;
        if (typeof lengthGvwrData === 'string') {
          try {
            lengthGvwrData = JSON.parse(lengthGvwrData);
          } catch (e) {
            console.warn('Failed to parse lengthGvwr data:', e);
            return selectedModel?.gvwr || 'N/A';
          }
        }

        // Get GVWR for the target length
        const gvwrForLength = lengthGvwrData[targetLengthOption.name];
        if (gvwrForLength) {
          return gvwrForLength;
        }
      }
    }

    // Default to model gvwr
    return selectedModel?.gvwr || 'N/A';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading configurator...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading configurator: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No categories available</p>
        </div>
      </div>
    );
  }

  const handleCategorySelect = (category: TrailerCategory) => {
    setSelectedCategory(category);
    setSelectedModel(null);
    setSelectedOptions({});
    setCurrentStep(2);
  };

  const handleSeriesSelect = (series: TrailerSeries) => {
    setSelectedSeries(series);
    setCurrentStep(3); // New step for product listing
  };

  const handleModelSelect = (model: TrailerModel) => {
    setSelectedModel(model);
    // Initialize with default values for pull options
    const defaultOptions: Record<string, any> = {};
    
    // Set default pull option
    defaultOptions.pullOption = 'Bumper';
    
    setSelectedOptions(defaultOptions);
    setCurrentStep(4);
  };

  const handleModelChange = (model: TrailerModel) => {
    setSelectedModel(model);
    // Initialize with default values for pull options
    const defaultOptions: Record<string, any> = {};
    
    // Set default pull option
    defaultOptions.pullOption = 'Bumper';
    
    setSelectedOptions(defaultOptions);
  };

  const handleOptionChange = (category: string, optionId: string | number, isMultiSelect: boolean, checked: boolean) => {
    const newOptions = { ...selectedOptions };
    
    if (isMultiSelect) {
      if (!newOptions[category]) {
        newOptions[category] = [];
      }
      if (checked) {
        newOptions[category] = [...newOptions[category], optionId];
      } else {
        newOptions[category] = newOptions[category].filter((id: string | number) => id !== optionId);
      }
    } else {
      if (checked) {
        newOptions[category] = optionId;
      }
    }
    
    setSelectedOptions(newOptions);
  };

  const handleDownloadPDF = () => {
    if (!selectedModel) return;
    
    const content = `
WALTON TRAILERS SPECIFICATION SHEET

Model: ${selectedModel.name}
GVWR: ${getDynamicGvwr()}
Payload: ${getDynamicPayload()}
Deck Size: ${getDynamicDeckSize()}
Axles: ${selectedModel.axles}

Base Price: $${selectedModel.basePrice.toLocaleString()}
Total MSRP: $${totalPrice.toLocaleString()}

Standard Features:
${selectedModel.features.map(feature => `• ${feature}`).join('\n')}

Configuration Date: ${new Date().toLocaleDateString()}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedModel.modelId}-specification.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "PDF Downloaded",
      description: "Your trailer specification sheet has been downloaded.",
    });
  };

  const handleQuoteSubmit = async (data: QuoteFormData) => {
    try {
      setIsSubmittingQuote(true);
      
      // Build complete selectedOptions with defaults for single-select categories
      const completeSelectedOptions: Record<string, any> = { ...selectedOptions };
      
      if (options && options.length > 0) {
        const allCategories = [...new Set(options.map(opt => opt.category))];
        
        allCategories.forEach(category => {
          const categoryOptions = options.filter(opt => opt.category === category);
          if (categoryOptions.length === 0) return;
          
          // Skip if this is a multi-select category and wasn't explicitly selected
          // Multi-select categories (like extras) only save if explicitly chosen
          if (category.toLowerCase().includes('extra')) {
            // Keep only if explicitly selected
            if (!completeSelectedOptions[category] || 
                (Array.isArray(completeSelectedOptions[category]) && completeSelectedOptions[category].length === 0)) {
              delete completeSelectedOptions[category];
            }
            return;
          }
          
          // For single-select categories, add default if not already selected
          if (!completeSelectedOptions[category]) {
            // Find default option (marked as isDefault) or use first option
            const defaultOption = categoryOptions.find(opt => opt.isDefault) || categoryOptions[0];
            if (defaultOption) {
              completeSelectedOptions[category] = defaultOption.id;
            }
          }
        });
      }
      
      const quoteData = {
        ...data,
        // Flatten configuration data to match database schema
        categoryId: selectedCategory?.id,
        categoryName: selectedCategory?.name,
        modelId: selectedModel?.modelId,
        modelName: selectedModel?.name,
        selectedOptions: completeSelectedOptions,
        totalPrice,
        trailerSpecs: selectedModel ? {
          gvwr: getDynamicGvwr(),
          payload: getDynamicPayload(),
          deckSize: getDynamicDeckSize(),
          axles: selectedModel.axles
        } : null
      };

      await apiRequest('/api/quotes', {
        method: 'POST',
        body: quoteData
      });

      toast({
        title: "Quote Request Sent!",
        description: "Thank you for your request. A dealer will contact you within 24 hours with your custom quote.",
      });

      setShowQuoteModal(false);
      quoteForm.reset();
      
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Error",
        description: "There was an issue submitting your quote request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const currentTrailerImage = selectedModel?.imageUrl || 
    hoveredModel?.imageUrl ||
    hoveredCategory?.imageUrl || 
    selectedCategory?.imageUrl || 
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";

  return (
    <div className="min-h-screen bg-white text-gray-900 font-medium">
      {/* Tesla-style Header */}
      <header className="fixed top-0 left-0 right-0 bg-black z-50 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="relative flex items-center justify-center h-16 md:h-20">
            <div className="flex flex-col items-center">
              <a 
                href="https://waltontrailers.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity duration-200"
              >
                <img 
                  src={waltonLogo} 
                  alt="Walton Trailers" 
                  className="h-8 md:h-11 lg:h-14 w-auto object-contain max-w-[150px] md:max-w-[180px] lg:max-w-[220px]"
                />
              </a>
              {isDealerLoggedIn && (
                <div className="text-xs text-gray-400 font-normal mt-1">
                  Dealer Configuration
                </div>
              )}
            </div>
            
            <div className="absolute right-0 flex md:hidden items-center space-x-2">
              <button 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${currentStep > 1 ? 'cursor-pointer hover:scale-110' : ''}`} 
                style={currentStep >= 1 ? { backgroundColor: '#c1af89' } : { backgroundColor: '#6B7280' }}
                onClick={() => {
                  if (currentStep > 1) {
                    setCurrentStep(1);
                    setSelectedCategory(null);
                    setSelectedSeries(null);
                    setSelectedModel(null);
                    setSelectedOptions({});
                  }
                }}
                disabled={currentStep === 1}
              />
              <button 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${currentStep > 2 ? 'cursor-pointer hover:scale-110' : ''}`} 
                style={currentStep >= 2 ? { backgroundColor: '#c1af89' } : { backgroundColor: '#6B7280' }}
                onClick={() => {
                  if (currentStep > 2 && selectedCategory) {
                    setCurrentStep(2);
                    setSelectedSeries(null);
                    setSelectedModel(null);
                    setSelectedOptions({});
                  }
                }}
                disabled={currentStep <= 2 || !selectedCategory}
              />
              <button 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${currentStep > 3 ? 'cursor-pointer hover:scale-110' : ''}`} 
                style={currentStep >= 3 ? { backgroundColor: '#c1af89' } : { backgroundColor: '#6B7280' }}
                onClick={() => {
                  if (currentStep > 3 && selectedCategory && selectedSeries) {
                    setCurrentStep(3);
                    setSelectedModel(null);
                    setSelectedOptions({});
                  }
                }}
                disabled={currentStep <= 3 || !selectedCategory || !selectedSeries}
              />
              <button 
                className={`w-3 h-3 rounded-full transition-all duration-300`} 
                style={currentStep >= 4 ? { backgroundColor: '#c1af89' } : { backgroundColor: '#6B7280' }}
                disabled={true}
              />
            </div>
            
            
          </div>
        </div>
      </header>
      {/* Main Content */}
      <div className="pt-16 md:pt-20 min-h-screen">
        {/* Step 1: Category Selection - Full Width Layout */}
        {currentStep === 1 && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4 tracking-tight">
                Choose Your Trailer
              </h1>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-4 md:px-0">
                Select from our premium line of commercial trailers designed for professionals
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories?.map((category, index) => (
                <div
                  key={category.id}
                  className="animate-in slide-in-from-bottom duration-700 h-full"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <button
                    className="w-full h-full text-left group relative overflow-hidden rounded-md border border-gray-200 bg-white hover:border-gray-300 hover:shadow-xl transition-all duration-500 hover:scale-[1.02]"
                    onClick={() => handleCategorySelect(category)}
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex flex-col h-full">
                      {/* Top - Image */}
                      <div className="w-full h-32 md:h-36 relative overflow-hidden rounded-t-md">
                        <img 
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
                      </div>
                      
                      {/* Bottom - Content */}
                      <div className="w-full p-4 md:p-5 flex-1 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2 md:mb-3">
                          <h3 className="text-lg md:text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                            {category.name}
                          </h3>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                        
                        <p className="text-gray-600 mb-3 md:mb-4 leading-relaxed text-sm line-clamp-2 md:line-clamp-none">
                          {category.description}
                        </p>
                        
                        <div className="text-sm md:text-base font-semibold text-blue-600">
                          Starting at ${category.startingPrice.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            {/* Subtle CTA for custom quotes */}
            <div className="text-center mt-8 md:mt-16 mb-4 md:mb-8 px-4">
              <p className="text-xs md:text-sm text-gray-500">
                Don't see your desired trailer type? 
                <span 
                  className="ml-1 text-gray-600 hover:text-blue-600 transition-colors duration-300 cursor-pointer block md:inline"
                  onClick={() => setShowCustomQuoteModal(true)}
                >
                  Contact Walton Trailers for a custom quote
                </span>
              </p>
            </div>

            {/* Custom Quote Modal */}
            <Dialog open={showCustomQuoteModal} onOpenChange={setShowCustomQuoteModal}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Request a Custom Trailer Quote</DialogTitle>
                  <DialogDescription>
                    Tell us about your specific trailer needs and we'll provide a custom quote.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={customQuoteForm.firstName}
                        onChange={(e) => setCustomQuoteForm({ ...customQuoteForm, firstName: e.target.value })}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={customQuoteForm.lastName}
                        onChange={(e) => setCustomQuoteForm({ ...customQuoteForm, lastName: e.target.value })}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={customQuoteForm.email}
                        onChange={(e) => setCustomQuoteForm({ ...customQuoteForm, email: e.target.value })}
                        placeholder="john@example.com"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={customQuoteForm.phone}
                        onChange={(e) => setCustomQuoteForm({ ...customQuoteForm, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Company (Optional)</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="company"
                        value={customQuoteForm.company}
                        onChange={(e) => setCustomQuoteForm({ ...customQuoteForm, company: e.target.value })}
                        placeholder="Acme Corp"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Location *</Label>
                    <div className="grid grid-cols-6 gap-2">
                      <div className="col-span-3">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="city"
                            value={customQuoteForm.city}
                            onChange={(e) => setCustomQuoteForm({ ...customQuoteForm, city: e.target.value })}
                            placeholder="City"
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Input
                          id="state"
                          value={customQuoteForm.state}
                          onChange={(e) => setCustomQuoteForm({ ...customQuoteForm, state: e.target.value.toUpperCase() })}
                          placeholder="State"
                          maxLength={2}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          id="zipCode"
                          value={customQuoteForm.zipCode}
                          onChange={(e) => setCustomQuoteForm({ ...customQuoteForm, zipCode: e.target.value })}
                          placeholder="ZIP Code"
                          pattern="[0-9]{5}(-[0-9]{4})?"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="requirements">Trailer Requirements *</Label>
                    <Textarea
                      id="requirements"
                      value={customQuoteForm.requirements}
                      onChange={(e) => setCustomQuoteForm({ ...customQuoteForm, requirements: e.target.value })}
                      placeholder="Please describe your specific trailer needs, including type, size, features, and any special requirements..."
                      className="min-h-[120px]"
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomQuoteModal(false)}
                    disabled={isSubmittingQuote}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      // Validate required fields
                      if (!customQuoteForm.firstName || !customQuoteForm.lastName || !customQuoteForm.email || 
                          !customQuoteForm.phone || !customQuoteForm.city || !customQuoteForm.state || 
                          !customQuoteForm.zipCode || !customQuoteForm.requirements) {
                        toast({
                          title: "Missing Information",
                          description: "Please fill in all required fields.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      // Validate email format
                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(customQuoteForm.email)) {
                        toast({
                          title: "Invalid Email",
                          description: "Please enter a valid email address.",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      setIsSubmittingQuote(true);
                      
                      try {
                        await apiRequest("/api/custom-quotes", {
                          method: "POST",
                          body: customQuoteForm
                        });
                        
                        toast({
                          title: "Quote Request Submitted",
                          description: "We've received your custom trailer quote request. Our team will contact you within 24-48 hours.",
                        });
                        
                        // Reset form and close modal
                        setCustomQuoteForm({
                          firstName: "",
                          lastName: "",
                          email: "",
                          phone: "",
                          company: "",
                          city: "",
                          state: "",
                          zipCode: "",
                          requirements: ""
                        });
                        setShowCustomQuoteModal(false);
                      } catch (error) {
                        toast({
                          title: "Submission Failed",
                          description: "Unable to submit your quote request. Please try again or call us directly.",
                          variant: "destructive"
                        });
                      } finally {
                        setIsSubmittingQuote(false);
                      }
                    }}
                    disabled={isSubmittingQuote}
                  >
                    {isSubmittingQuote ? "Submitting..." : "Submit Quote Request"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Step 2: Model Type Selection - Full Width Layout */}
        {currentStep === 2 && selectedCategory && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <button 
                onClick={() => setCurrentStep(1)}
                className="flex items-center text-blue-600 hover:text-blue-700 transition-colors duration-300 font-medium"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Categories
              </button>
            </div>
            
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4 tracking-tight">
                {selectedCategory.name}
              </h1>
              <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-4 md:px-0">
                Choose between our professional model lines
              </p>
            </div>

            {/* Dynamic Series Selection for any Category */}
            {isSeriesLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading series options...</p>
              </div>
            ) : categorySeries && categorySeries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {categorySeries.map((series, index) => (
                    <div key={series.id} className="animate-in slide-in-from-bottom duration-700" style={{ animationDelay: `${index * 150}ms` }}>
                      <button
                        className="w-full text-left group relative overflow-hidden rounded-md border border-gray-200 bg-white hover:border-gray-300 hover:shadow-xl transition-all duration-500 hover:scale-[1.02]"
                        onClick={() => handleSeriesSelect(series)}
                      >
                        <div className="flex flex-col">
                          {/* Top - Image */}
                          <div className="w-full h-48 md:h-56 relative overflow-hidden rounded-t-md">
                            {series.imageUrl ? (
                              <>
                                <img 
                                  src={series.imageUrl}
                                  alt={series.name}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
                              </>
                            ) : (
                              <div className="w-full h-full bg-orange-500 flex items-center justify-center">
                                <div className="text-white text-2xl md:text-3xl font-bold tracking-wider">
                                  {series.name.toUpperCase()}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Bottom - Content */}
                          <div className="w-full p-6 md:p-8">
                            <div className="flex items-center justify-between mb-3 md:mb-4">
                              <h3 className="text-xl md:text-2xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                                {series.name}
                              </h3>
                              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-300" />
                            </div>
                            
                            <p className="text-gray-600 mb-4 md:mb-6 leading-relaxed">
                              {series.description || 'Professional flatbed trailer for your hauling needs.'}
                            </p>
                            
                            <div className="text-lg md:text-xl font-semibold text-blue-600">
                              Starting at ${series.basePrice ? series.basePrice.toLocaleString() : '10,000'}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No series available for this category.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Product Listing - Selected Series Models */}
        {currentStep === 3 && selectedCategory && selectedSeries && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            {/* Mobile/Tablet Image - Sticky Top */}
            <div className="lg:hidden sticky top-16 md:top-20 z-10 bg-gray-100 h-48 md:h-64">
              <div className="relative w-full h-full p-4 flex items-center justify-center">
                <div className="text-4xl font-bold text-gray-600 tracking-wider">
                  MODEL TEST
                </div>
              </div>
            </div>

            {/* Desktop Image Panel - Fixed */}
            <div className="hidden lg:block lg:fixed left-0 top-20 w-[65%] h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden z-10 bg-gray-100">
              <div className="relative w-full h-full max-w-5xl max-h-[80vh] mx-auto my-auto p-8 flex items-center justify-center">
                <div className="text-6xl font-bold text-gray-600 tracking-wider">
                  MODEL TEST
                </div>
              </div>
            </div>

            {/* Product Details Panel - Responsive */}
            <div className="flex-1 lg:ml-[65%] lg:w-[35%] bg-white">
              <div className="max-w-md mx-auto py-6 md:py-8 lg:py-12 px-4 md:px-6 pb-40">
                
                {/* Back Button */}
                <div className="flex items-center justify-between mb-6">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedModel(null); // Reset model selection
                      setCurrentStep(2);      // Go back to series selection
                    }}
                    className="hover:bg-gray-100 text-amber-600"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setCurrentStep(4)}
                    className="bg-black text-white hover:bg-gray-800 px-6"
                    disabled={!selectedModel}
                  >
                    Proceed
                  </Button>
                </div>

                {/* Product Title */}
                <div className="mb-6">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                    {selectedSeries?.displayName || selectedSeries?.name}
                  </h1>
                  <p className="text-gray-600 text-base">
                    {selectedSeries?.description || 'Professional grade trailers for your needs'}
                  </p>
                </div>

                {/* Key Specs - Dynamic based on selected model only */}
                {seriesModels && seriesModels.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{getDynamicGvwr()}</div>
                      <div className="text-sm text-gray-500">GVWR</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{getDynamicPayload()}</div>
                      <div className="text-sm text-gray-500">Payload</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{getDynamicDeckSize()}</div>
                      <div className="text-sm text-gray-500">Deck Size</div>
                    </div>
                  </div>
                )}

                {/* Choose Your Model */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Model</h2>
                  
                  {/* Database-driven models filtered by series */}
                  {seriesModels && seriesModels.length > 0 ? (
                    seriesModels.map((model, index) => (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model)}
                        onMouseEnter={() => setHoveredModel(model)}
                        onMouseLeave={() => setHoveredModel(null)}
                        className={`w-full p-4 rounded-lg border text-left transition-all duration-200 mb-3 ${
                          selectedModel?.id === model.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-medium text-gray-900">{model.name}</div>
                          <div className="font-bold text-gray-900">
                            ${model.basePrice?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </button>
                    ))
                  ) : selectedSeries && seriesModels !== undefined ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No Models Available</p>
                    </div>
                  ) : null}
                </div>
                
                {/* Length Options - Moved above Standard Features */}
                {options && options.length > 0 && (
                  (() => {
                    const lengthOptions = options.filter(opt => opt.category === 'length');
                    if (lengthOptions.length === 0) return null;
                    
                    return (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Length Options</h4>
                        <div className="space-y-2">
                          <Select
                            value={selectedOptions['length']?.toString() || lengthOptions[0]?.id.toString()}
                            onValueChange={(value) => {
                              const parsedValue = value.startsWith('length_') ? value : parseInt(value);
                              handleOptionChange('length', parsedValue, false, true);
                            }}
                          >
                            <SelectTrigger className="w-full" data-testid="input-length">
                              <SelectValue placeholder="Select length" />
                            </SelectTrigger>
                            <SelectContent>
                              {lengthOptions.map((option) => {
                                // Parse pulltype data from selectedModel
                                let pulltypeOptions: Record<string, string> = {};
                                if ((selectedModel as any)?.pulltypeOptions) {
                                  try {
                                    const pulltypeData = (selectedModel as any).pulltypeOptions;
                                    pulltypeOptions = typeof pulltypeData === 'string' ? 
                                      JSON.parse(pulltypeData) : 
                                      pulltypeData || {};
                                  } catch (e) {
                                    console.warn('Failed to parse pulltype options:', e);
                                  }
                                }
                                
                                // Find pulltype for this length option
                                const pulltype = pulltypeOptions[option.name] || '';
                                
                                const formattedPrice = option.price === 0 ? 'Included' : 
                                                      option.price > 0 ? `$${option.price.toLocaleString()}` : 
                                                      `$${option.price.toLocaleString()}`;
                                
                                return (
                                  <SelectItem 
                                    key={option.id} 
                                    value={option.id.toString()}
                                    data-testid={`row-length-${option.id}`}
                                  >
                                    <div className="flex items-center justify-between w-full gap-3">
                                      <span>{`${option.name}${pulltype ? ` - ${pulltype}` : ''}`}</span>
                                      <span className="text-gray-400">{formattedPrice}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Additional Options */}
                <div className="mb-6">

                  {/* Additional Options */}
                  {options && options.length > 0 && (
                    <div className="mt-6 pb-20">
                      {Object.entries(
                        options.reduce((acc, option) => {
                          // Exclude 'length' category since it's now above Standard Features
                          if (option.category !== 'length') {
                            if (!acc[option.category]) acc[option.category] = [];
                            acc[option.category].push(option);
                          }
                          return acc;
                        }, {} as Record<string, TrailerOption[]>)
                      ).sort(([categoryA], [categoryB]) => {
                        // Define custom order: color first, then others, extras last (length removed since it's separate)
                        const order = { 'color': 0, 'extras': 999 };
                        const orderA = order[categoryA] !== undefined ? order[categoryA] : 50;
                        const orderB = order[categoryB] !== undefined ? order[categoryB] : 50;
                        
                        if (orderA !== orderB) return orderA - orderB;
                        return categoryA.localeCompare(categoryB); // Alphabetical for same priority
                      }).map(([category, categoryOptions]) => (
                        <div key={category} className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            {category === 'tires' ? 'Tire Options' : 
                             category === 'ramps' ? 'Ramp Options' : 
                             category === 'color' ? 'Color Options' : 
                             category === 'extras' ? 'Additional Options' : 
                             category === 'deck' ? 'Deck Length' : 
                             category === 'walls' ? 'Wall Height' : 
                             category === 'winch' ? 'Winch Options' : 
                             category === 'jack' ? 'Jack Options' :
                             // Capitalize first letter for any unmapped categories
                             category.charAt(0).toUpperCase() + category.slice(1) + ' Options'}
                          </h4>
                          
                          {categoryOptions[0]?.isMultiSelect || category === 'extras' ? (
                            <div className="space-y-2">
                              {categoryOptions.map((option) => (
                                <div key={option.id} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`option-${option.id}`}
                                      checked={selectedOptions[category]?.includes(option.id) || false}
                                      onCheckedChange={(checked) => 
                                        handleOptionChange(category, option.id, true, checked as boolean)
                                      }
                                    />
                                    <Label htmlFor={`option-${option.id}`} className="text-sm cursor-pointer">
                                      {option.name}
                                    </Label>
                                    
                                    {option.isMultiSelect && (selectedOptions[category]?.includes(option.id)) && (
                                      <select
                                        className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded"
                                        value={selectedOptions[`${category}_${option.id}_qty`] || 1}
                                        onChange={(e) => {
                                          const quantity = parseInt(e.target.value);
                                          setSelectedOptions(prev => ({
                                            ...prev,
                                            [`${category}_${option.id}_qty`]: quantity
                                          }));
                                        }}
                                        data-testid={`select-quantity-${option.id}`}
                                      >
                                        {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                                          <option key={num} value={num}>{num}</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-600">
                                    {option.price === 0 ? 'Included' : 
                                     option.isMultiSelect && (selectedOptions[category]?.includes(option.id)) ? 
                                       `$${(option.price * (selectedOptions[`${category}_${option.id}_qty`] || 1)).toLocaleString()}` :
                                     option.price > 0 ? `$${option.price.toLocaleString()}` : 
                                     `$${option.price.toLocaleString()}`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : category.toLowerCase() === 'color' ? (
                            <>
                              <div className="flex flex-wrap justify-center gap-4">
                                {categoryOptions.map((option) => {
                                  const isSelected = selectedOptions[category]?.toString() === option.id.toString() || 
                                                   (!selectedOptions[category] && categoryOptions[0]?.id === option.id);
                                  const colorHex = option.hexColor || getColorHex(option.name);
                                  
                                  return (
                                    <div key={option.id} className="flex flex-col items-center text-center">
                                      <button
                                        onClick={() => handleOptionChange(category, option.id, false, true)}
                                        className={`w-16 h-16 rounded-full border-4 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                          isSelected 
                                            ? 'border-black shadow-lg' 
                                            : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                        style={{ 
                                          backgroundColor: colorHex,
                                          boxShadow: colorHex === '#ffffff' ? 'inset 0 0 0 1px #e5e7eb' : undefined
                                        }}
                                        title={`${option.name} - ${option.price === 0 ? 'Included' : 
                                          option.price > 0 ? `$${option.price.toLocaleString()}` : 
                                          `$${option.price.toLocaleString()}`}`}
                                      >
                                        {isSelected && (
                                          <div className="w-full h-full rounded-full flex items-center justify-center">
                                            <div 
                                              className={`w-3 h-3 rounded-full ${
                                                colorHex === '#ffffff' || colorHex === '#f5f5dc' || colorHex === '#d2b48c' 
                                                  ? 'bg-black' 
                                                  : 'bg-white'
                                              }`}
                                            />
                                          </div>
                                        )}
                                      </button>
                                      <div className="mt-1">
                                        <div className="text-xs font-medium">{option.name}</div>
                                        <div className="text-xs text-gray-500">
                                          {option.price === 0 ? 'Included' : 
                                           option.price > 0 ? `$${option.price.toLocaleString()}` : 
                                           `$${option.price.toLocaleString()}`}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {(() => {
                                const selectedColorOption = selectedOptions[category]
                                  ? categoryOptions.find(opt => opt.id === selectedOptions[category])
                                  : categoryOptions.find(opt => opt.isDefault) || categoryOptions[0];
                                
                                if (selectedColorOption && selectedColorOption.primerPrice && selectedColorOption.primerPrice > 0) {
                                  const isSelected = selectedPrimer[category] || false;
                                  return (
                                    <div className="mt-4 flex justify-center">
                                      <button
                                        onClick={() => setSelectedPrimer({ 
                                          ...selectedPrimer, 
                                          [category]: !isSelected 
                                        })}
                                        className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                                          isSelected
                                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                        }`}
                                        data-testid={`button-primer-${category}`}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <div className={`w-4 h-4 border-2 rounded ${
                                            isSelected 
                                              ? 'bg-blue-500 border-blue-500' 
                                              : 'border-gray-300'
                                          }`}>
                                            {isSelected && (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                              </div>
                                            )}
                                          </div>
                                          <span className="font-medium">Add Primer?</span>
                                          <span className="text-sm">
                                            ${selectedColorOption.primerPrice.toLocaleString()}
                                          </span>
                                        </div>
                                      </button>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          ) : (
                            <div className="space-y-2">
                              <Select
                                value={selectedOptions[category]?.toString() || categoryOptions[0]?.id.toString()}
                                onValueChange={(value) => {
                                  const parsedValue = parseInt(value);
                                  handleOptionChange(category, isNaN(parsedValue) ? value : parsedValue, false, true);
                                }}
                              >
                                <SelectTrigger className="w-full" data-testid={`input-${category}`}>
                                  <SelectValue placeholder={`Select ${category}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {categoryOptions.map((option) => {
                                    const formattedPrice = option.price === 0 ? 'Included' : 
                                                          option.price > 0 ? `$${option.price.toLocaleString()}` : 
                                                          `$${option.price.toLocaleString()}`;
                                    return (
                                      <SelectItem 
                                        key={option.id} 
                                        value={option.id.toString()}
                                        data-testid={`row-${category}-${option.id}`}
                                      >
                                        <div className="flex items-center justify-between w-full gap-3">
                                          <span>{option.name}</span>
                                          <span className="text-gray-400">{formattedPrice}</span>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Steps 4+ - Responsive Layout */}
        {currentStep > 3 && (
          <div className="flex flex-col lg:flex-row min-h-screen">
            {/* Mobile/Tablet Image - Sticky Top */}
            <div className="lg:hidden sticky top-16 md:top-20 z-10 bg-gray-50 h-48 md:h-64">
              <div className="relative w-full h-full p-4">
                <img 
                  src={currentTrailerImage}
                  alt="Trailer"
                  className="w-full h-full object-contain drop-shadow-lg"
                />
              </div>
            </div>

            {/* Desktop Image Panel - Fixed */}
            <div className="hidden lg:block lg:fixed left-0 top-20 w-[65%] h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden z-10 bg-gray-50">
              <div className="relative w-full h-full max-w-5xl max-h-[80vh] mx-auto my-auto p-8">
                <img 
                  src={currentTrailerImage}
                  alt="Trailer"
                  className="w-full h-full object-contain transition-all duration-500 ease-out drop-shadow-xl"
                />
              </div>
            </div>

            {/* Configuration Panel - Responsive */}
            <div className="flex-1 lg:ml-[65%] lg:w-[35%] bg-white">
              <div className="max-w-md mx-auto py-6 md:py-8 lg:py-12 px-4 md:px-6">


          {/* Step 4: Order Summary */}
          {currentStep === 4 && selectedModel && (
            <div className="space-y-8 pb-48">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentStep(3)}
                  className="hover:bg-gray-100"
                  style={{ color: '#C1AF89' }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
              
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">Your Configuration</h1>
                <p className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg">
                  Review your configuration and request a quote
                </p>
              </div>

              <Card className="border border-zinc-200 dark:border-zinc-700">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">{selectedModel.name}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                    <div>
                      <span className="text-zinc-500">GVWR: </span>
                      <span className="font-medium">{getDynamicGvwr()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Payload: </span>
                      <span className="font-medium">{getDynamicPayload()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Deck: </span>
                      <span className="font-medium">{getDynamicDeckSize()}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Axles: </span>
                      <span className="font-medium">{selectedModel.axles}</span>
                    </div>
                  </div>

                  {/* Selected Options */}
                  {options && options.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-base font-semibold mb-3 text-zinc-900">Selected Options</h4>
                      <div className="space-y-2">
                        {/* Display all options including defaults */}
                        {(() => {
                          const allCategories = [...new Set(options.map(opt => opt.category))];
                          return allCategories.map(category => {
                            const categoryOptions = options.filter(opt => opt.category === category);
                            if (categoryOptions.length === 0) return null;
                            
                            // Get selected option or default to first option
                            const selectedOptionId = selectedOptions[category];
                            
                            // Handle multi-select categories (like extras)
                            if (Array.isArray(selectedOptionId)) {
                              const selectedCategoryOptions = categoryOptions.filter(opt => selectedOptionId.includes(opt.id));
                              return selectedCategoryOptions.map(option => (
                                <div key={option.id} className="flex justify-between py-1 text-sm">
                                  <span className="text-zinc-700">{option.name}</span>
                                  <span className="font-medium text-zinc-600">
                                    {option.price === 0 ? 'Included' : 
                                     option.price > 0 ? `$${option.price.toLocaleString()}` : 
                                     `$${option.price.toLocaleString()}`}
                                  </span>
                                </div>
                              ));
                            }
                            
                            // Handle single-select categories
                            const selectedOption = selectedOptionId 
                              ? categoryOptions.find(opt => opt.id === selectedOptionId)
                              : categoryOptions[0]; // Default to first option
                            
                            if (!selectedOption) return null;
                            
                            return (
                              <div key={selectedOption.id} className="flex justify-between py-1 text-sm">
                                <span className="text-zinc-700">{selectedOption.name}</span>
                                <span className="font-medium text-zinc-600">
                                  {selectedOption.price === 0 ? 'Included' : 
                                   selectedOption.price > 0 ? `$${selectedOption.price.toLocaleString()}` : 
                                   `$${selectedOption.price.toLocaleString()}`}
                                </span>
                              </div>
                            );
                          });
                        })()}
                        
                        {/* Display primer selections */}
                        {Object.entries(selectedPrimer).map(([category, isSelected]) => {
                          if (!isSelected) return null;
                          
                          const categoryOptions = options?.filter(opt => opt.category === category) || [];
                          const selectedColorOption = categoryOptions.find(opt => 
                            selectedOptions[category]?.toString() === opt.id.toString() || 
                            (!selectedOptions[category] && categoryOptions[0]?.id === opt.id)
                          );
                          
                          if (selectedColorOption && selectedColorOption.primerPrice && selectedColorOption.primerPrice > 0) {
                            return (
                              <div key={`primer-${category}`} className="flex justify-between py-1 text-sm">
                                <span className="text-zinc-700">Primer ({selectedColorOption.name})</span>
                                <span className="font-medium text-zinc-600">
                                  ${selectedColorOption.primerPrice.toLocaleString()}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      const { generateConfigurationPDF } = await import("@/lib/pdf-generator");
                      if (selectedModel && options) {
                        // Create complete options object including defaults
                        const completeOptions: Record<string, any> = {};
                        const allCategories = [...new Set(options.map(opt => opt.category))];
                        
                        allCategories.forEach(category => {
                          const categoryOptions = options.filter(opt => opt.category === category);
                          if (categoryOptions.length > 0) {
                            const selectedOptionId = selectedOptions[category];
                            const selectedOption = selectedOptionId 
                              ? categoryOptions.find(opt => 
                                  Array.isArray(selectedOptionId) 
                                    ? selectedOptionId.includes(opt.id)
                                    : opt.id === selectedOptionId
                                )
                              : categoryOptions[0]; // Default to first option
                            
                            if (selectedOption) {
                              completeOptions[category] = selectedOption.id;
                            }
                          }
                        });
                        
                        generateConfigurationPDF(selectedModel, completeOptions, totalPrice, options);
                      }
                      toast({
                        title: "PDF Downloaded",
                        description: "Your configuration summary has been downloaded as a PDF.",
                      });
                    } catch (error) {
                      toast({
                        title: "Download Failed",
                        description: "Unable to generate PDF. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="py-4 md:py-6 text-sm md:text-base min-h-[48px]"
                >
                  <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Spec Sheet
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    window.location.href = "https://waltontrailers.com/locate-a-dealer/";
                  }}
                  className="py-4 md:py-6 text-sm md:text-base min-h-[48px]"
                >
                  <Building2 className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Find Dealer
                </Button>
              </div>

              {/* Save Configuration for Dealers */}
              {isDealerLoggedIn && (
                <Button
                  onClick={() => setShowDealerSaveDialog(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 md:py-6 text-sm md:text-base min-h-[48px] mt-4"
                >
                  <Save className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Save Configuration to Dealer Account
                </Button>
              )}
            </div>
          )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Tesla-style pricing display - show on steps 3 and 4 */}
      {(currentStep === 3 || currentStep === 4) && selectedModel && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="lg:ml-[65%] lg:w-[35%] w-full">
            <div className="max-w-md mx-auto px-4 md:px-6">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-t-lg shadow-lg">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-2xl md:text-3xl font-bold">
                          ${totalPrice.toLocaleString()}
                        </div>
                        <div className="text-xs md:text-sm text-zinc-500">Vehicle Price</div>
                      </div>
                      <button 
                        onClick={() => setShowPricingModal(true)}
                        className="ml-1 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      >
                        <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-zinc-400" />
                      </button>
                    </div>
                    {isDealerLoggedIn ? (
                      <Button 
                        onClick={() => setShowDealerSaveDialog(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 md:px-8 py-2 md:py-3 text-sm md:text-base"
                      >
                        <Save className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        Save Configuration
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setShowQuoteModal(true)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 md:px-8 py-2 md:py-3 text-sm md:text-base"
                      >
                        Request A Quote
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Fixed Employee and Dealer Portal Buttons - Mobile Friendly */}
      <div className={`fixed left-4 z-[60] flex gap-2 pointer-events-auto transition-all duration-200 ${
        (currentStep === 3 || currentStep === 4) && selectedModel 
          ? 'bottom-24 md:bottom-4' // Above pricing section on mobile only, normal position on tablet+
          : 'bottom-4' // Normal position when no pricing section
      }`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/admin/login'}
          className="bg-white/10 hover:bg-white/20 border border-gray-200/30 hover:border-gray-300/50 text-gray-500 hover:text-gray-700 transition-all duration-200 text-xs px-3 py-2 opacity-50 hover:opacity-80 cursor-pointer"
        >
          <Users className="w-3 h-3 mr-1.5" />
          <span className="hidden md:inline">Employees</span>
          <span className="md:hidden">Staff</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/dealer/login'}
          className="bg-white/10 hover:bg-white/20 border border-gray-200/30 hover:border-gray-300/50 text-gray-500 hover:text-gray-700 transition-all duration-200 text-xs px-3 py-2 opacity-50 hover:opacity-80 cursor-pointer"
        >
          <Building2 className="w-3 h-3 mr-1.5" />
          <span className="hidden md:inline">Dealers</span>
          <span className="md:hidden">Dealers</span>
        </Button>
      </div>

      {/* Dealer Save Dialog */}
      <DealerSaveDialog
        open={showDealerSaveDialog}
        onOpenChange={setShowDealerSaveDialog}
        onSave={handleDealerSaveConfiguration}
      />

      {/* Pricing Configuration Modal */}
      <Dialog open={showPricingModal} onOpenChange={setShowPricingModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-xl font-semibold">
              Configuration Summary
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const { generateConfigurationPDF } = await import("@/lib/pdf-generator");
                  if (selectedModel && options) {
                    // Create complete options object including defaults
                    const completeOptions: Record<string, any> = {};
                    const allCategories = [...new Set(options.map(opt => opt.category))];
                    
                    allCategories.forEach(category => {
                      const categoryOptions = options.filter(opt => opt.category === category);
                      if (categoryOptions.length > 0) {
                        const selectedOptionId = selectedOptions[category];
                        const selectedOption = selectedOptionId 
                          ? categoryOptions.find(opt => 
                              Array.isArray(selectedOptionId) 
                                ? selectedOptionId.includes(opt.id)
                                : opt.id === selectedOptionId
                            )
                          : categoryOptions[0]; // Default to first option
                        
                        if (selectedOption) {
                          completeOptions[category] = selectedOption.id;
                        }
                      }
                    });
                    
                    generateConfigurationPDF(selectedModel, completeOptions, totalPrice, options);
                  }
                  toast({
                    title: "PDF Downloaded",
                    description: "Your configuration summary has been downloaded as a PDF.",
                  });
                } catch (error) {
                  toast({
                    title: "Download Failed",
                    description: "Unable to generate PDF. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </DialogHeader>
          
          {selectedModel && (
            <div className="space-y-6">
              {/* Trailer Image */}
              <div className="w-full h-48 bg-gray-50 rounded-lg flex items-center justify-center">
                <img 
                  src={currentTrailerImage}
                  alt={selectedModel.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              
              {/* Model Information */}
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedModel.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-zinc-600">
                  <div>
                    <span className="font-medium">GVWR:</span> {getDynamicGvwr()}
                  </div>
                  <div>
                    <span className="font-medium">Payload:</span> {getDynamicPayload()}
                  </div>
                  <div>
                    <span className="font-medium">Deck Size:</span> {getDynamicDeckSize()}
                  </div>
                  <div>
                    <span className="font-medium">Axles:</span> {selectedModel.axles}
                  </div>
                </div>
              </div>

              {/* Selected Options */}
              {(Object.keys(selectedOptions).length > 0 || Object.keys(selectedPrimer).some(key => selectedPrimer[key])) && (
                <div>
                  <h4 className="text-base font-semibold mb-3">Selected Options</h4>
                  <div className="space-y-2">
                    {/* Display regular options */}
                    {Object.entries(selectedOptions).map(([category, optionIds]) => {
                      const categoryOptions = options?.filter(opt => opt.category === category) || [];
                      const selectedCategoryOptions = Array.isArray(optionIds) 
                        ? categoryOptions.filter(opt => optionIds.includes(opt.id))
                        : categoryOptions.filter(opt => opt.id === optionIds);
                      
                      return selectedCategoryOptions.map(option => (
                        <div key={option.id} className="flex justify-between py-1 text-sm">
                          <span>{option.name}</span>
                          <span className="font-medium">
                            {option.price === 0 ? 'Included' : 
                             option.price > 0 ? `$${option.price.toLocaleString()}` : 
                             `$${option.price.toLocaleString()}`}
                          </span>
                        </div>
                      ));
                    })}
                    
                    {/* Display primer selections */}
                    {Object.entries(selectedPrimer).map(([category, isSelected]) => {
                      if (!isSelected) return null;
                      
                      const categoryOptions = options?.filter(opt => opt.category === category) || [];
                      const selectedColorOption = categoryOptions.find(opt => 
                        selectedOptions[category]?.toString() === opt.id.toString() || 
                        (!selectedOptions[category] && categoryOptions[0]?.id === opt.id)
                      );
                      
                      if (selectedColorOption && selectedColorOption.primerPrice && selectedColorOption.primerPrice > 0) {
                        return (
                          <div key={`primer-${category}`} className="flex justify-between py-1 text-sm">
                            <span>Primer ({selectedColorOption.name})</span>
                            <span className="font-medium">
                              ${selectedColorOption.primerPrice.toLocaleString()}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm">Base Price</span>
                  <span className="text-sm">${selectedModel.basePrice.toLocaleString()}</span>
                </div>
                {Object.entries(selectedOptions).map(([category, optionIds]) => {
                  const categoryOptions = options?.filter(opt => opt.category === category) || [];
                  const selectedCategoryOptions = Array.isArray(optionIds) 
                    ? categoryOptions.filter(opt => optionIds.includes(opt.id))
                    : categoryOptions.filter(opt => opt.id === optionIds);
                  
                  return selectedCategoryOptions.map(option => (
                    option.price !== 0 && (
                      <div key={option.id} className="flex justify-between items-center mb-2">
                        <span className="text-sm text-zinc-600">{option.name}</span>
                        <span className="text-sm">
                          {option.price > 0 ? `$${option.price.toLocaleString()}` : 
                           `$${option.price.toLocaleString()}`}
                        </span>
                      </div>
                    )
                  ));
                })}
                
                {/* Display primer pricing in breakdown */}
                {Object.entries(selectedPrimer).map(([category, isSelected]) => {
                  if (!isSelected) return null;
                  
                  const categoryOptions = options?.filter(opt => opt.category === category) || [];
                  const selectedColorOption = categoryOptions.find(opt => 
                    selectedOptions[category]?.toString() === opt.id.toString() || 
                    (!selectedOptions[category] && categoryOptions[0]?.id === opt.id)
                  );
                  
                  if (selectedColorOption && selectedColorOption.primerPrice && selectedColorOption.primerPrice > 0) {
                    return (
                      <div key={`pricing-primer-${category}`} className="flex justify-between items-center mb-2">
                        <span className="text-sm text-zinc-600">Primer ({selectedColorOption.name})</span>
                        <span className="text-sm">
                          ${selectedColorOption.primerPrice.toLocaleString()}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
                <div className="border-t pt-2 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total MSRP</span>
                    <span className="text-lg font-bold">${totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quote Request Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request A Quote</DialogTitle>
            <DialogDescription>
              Get a personalized quote for your {selectedModel?.name} trailer configuration.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...quoteForm}>
            <form onSubmit={quoteForm.handleSubmit(handleQuoteSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={quoteForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={quoteForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={quoteForm.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip/Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={quoteForm.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={quoteForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={quoteForm.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={quoteForm.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Comments or Requests</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special requirements or questions..."
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 pt-2">
                <FormField
                  control={quoteForm.control}
                  name="optIn"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-xs text-gray-600">
                          <strong>Opt In:</strong> By providing your email address, you may receive future communications about updates, 
                          incentives and special offers from Walton Trailers or its parent, subsidiary or affiliated companies 
                          or one of their authorized dealers or representatives.
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={quoteForm.control}
                  name="ageVerification"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-xs text-gray-600">
                          By clicking on SUBMIT, you verify that you are over 16 years of age. *
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="text-xs text-gray-500">
                  <p>By submitting your mobile phone number, you also acknowledge that Walton Trailers or its parent, 
                  subsidiary or affiliated companies or one of their authorized dealers or representatives may send you 
                  commercial text messages. Such contact may use automated technology.</p>
                  <p className="mt-2">You are not required to agree to this as a condition of purchasing any property, goods, or services.</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowQuoteModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmittingQuote}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  {isSubmittingQuote ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
