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
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getOptionInfo } from "@/lib/trailer-option-info";
import waltonLogo from "@/assets/walton-logo.png";
import { DealerSaveDialog } from "@/components/dealer-save-dialog";
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
  modelId: string;
  category: string;
  name: string;
  price: number;
  isMultiSelect: boolean;
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
  const [selectedModel, setSelectedModel] = useState<TrailerModel | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});
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

    await saveOrderMutation.mutateAsync({
      customerName: customerInfo.customerName || null,
      customerEmail: customerInfo.customerEmail || null,
      customerPhone: customerInfo.customerPhone || null,
      categorySlug: selectedCategory.slug,
      categoryName: selectedCategory.name,
      modelId: selectedModel.modelId,
      modelName: selectedModel.name,
      modelSpecs: {
        gvwr: selectedModel.gvwr,
        payload: selectedModel.payload,
        deckSize: selectedModel.deckSize,
        axles: selectedModel.axles
      },
      selectedOptions: selectedOptions,
      basePrice: selectedModel.basePrice,
      optionsPrice: totalPrice - selectedModel.basePrice,
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

  // Calculate total price
  useEffect(() => {
    if (!selectedModel) {
      setTotalPrice(0);
      return;
    }

    let price = selectedModel.basePrice;
    
    if (options && Object.keys(selectedOptions).length > 0) {
      Object.entries(selectedOptions).forEach(([category, selected]) => {
        const categoryOptions = options.filter(opt => opt.category === category);
        
        if (Array.isArray(selected)) {
          selected.forEach((optionId: number) => {
            const option = categoryOptions.find(opt => opt.id === optionId);
            if (option) price += option.price;
          });
        } else if (selected !== undefined) {
          const option = categoryOptions.find(opt => opt.id === selected);
          if (option) price += option.price;
        }
      });
    }
    
    setTotalPrice(price);
  }, [selectedModel, selectedOptions, options]);

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

  const handleModelSelect = (model: TrailerModel) => {
    setSelectedModel(model);
    setSelectedOptions({});
    setCurrentStep(3);
  };

  const handleOptionChange = (category: string, optionId: number, isMultiSelect: boolean, checked: boolean) => {
    const newOptions = { ...selectedOptions };
    
    if (isMultiSelect) {
      if (!newOptions[category]) {
        newOptions[category] = [];
      }
      if (checked) {
        newOptions[category] = [...newOptions[category], optionId];
      } else {
        newOptions[category] = newOptions[category].filter((id: number) => id !== optionId);
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
GVWR: ${selectedModel.gvwr}
Payload: ${selectedModel.payload}
Deck Size: ${selectedModel.deckSize}
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

  const currentTrailerImage = selectedModel?.imageUrl || 
    hoveredModel?.imageUrl ||
    hoveredCategory?.imageUrl || 
    selectedCategory?.imageUrl || 
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";

  return (
    <div className="min-h-screen bg-white text-gray-900 font-medium">
      {/* Tesla-style Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-xl z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center">
              <img 
                src={waltonLogo} 
                alt="Walton Trailers" 
                className="h-6 md:h-8 lg:h-10 w-auto object-contain max-w-[120px] md:max-w-[150px] lg:max-w-[180px]"
                style={{ filter: 'brightness(0) saturate(100%)' }}
              />
            </div>
            
            {/* Mobile progress indicator - horizontal dots */}
            <div className="flex md:hidden items-center space-x-2">
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${currentStep >= 4 ? 'bg-blue-600' : 'bg-gray-300'}`} />
            </div>
            
            {/* Desktop progress indicator */}
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className={`px-4 py-2 rounded-full transition-all duration-300 ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                Category
              </div>
              <div className={`px-4 py-2 rounded-full transition-all duration-300 ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                Model
              </div>
              <div className={`px-4 py-2 rounded-full transition-all duration-300 ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                Options
              </div>
              <div className={`px-4 py-2 rounded-full transition-all duration-300 ${currentStep >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                Order
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xs md:text-sm text-gray-500 font-normal">Est. Price</div>
              <div className="text-lg md:text-2xl font-semibold text-blue-600 transition-all duration-500">
                ${totalPrice.toLocaleString()}
              </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories?.map((category, index) => (
                <div
                  key={category.id}
                  className="animate-in slide-in-from-bottom duration-700"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <button
                    className="w-full text-left group relative overflow-hidden rounded-3xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-xl transition-all duration-500 hover:scale-[1.02]"
                    onClick={() => handleCategorySelect(category)}
                    onMouseEnter={() => setHoveredCategory(category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex flex-col">
                      {/* Top - Image */}
                      <div className="w-full h-32 md:h-36 relative overflow-hidden rounded-t-3xl">
                        <img 
                          src={category.imageUrl}
                          alt={category.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10"></div>
                      </div>
                      
                      {/* Bottom - Content */}
                      <div className="w-full p-4 md:p-5">
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

        {/* Steps 2+ - Responsive Layout */}
        {currentStep > 1 && (
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
              <div className="max-w-lg mx-auto py-6 md:py-8 lg:py-12 px-4 md:px-6">

          {/* Step 2: Model Selection */}
          {currentStep === 2 && selectedCategory && (
            <div className="space-y-12 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center text-blue-600 hover:text-blue-700 transition-colors duration-300 font-medium"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Categories
                </button>
              </div>
              
              <div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-6 tracking-tight leading-tight">
                  {selectedCategory.name}
                </h1>
                <p className="text-gray-600 text-base md:text-lg lg:text-xl leading-relaxed">
                  Choose the perfect model for your specific requirements
                </p>
              </div>

              <div className="space-y-4">
                {models?.map((model, index) => (
                  <div
                    key={model.id}
                    className="animate-in slide-in-from-right duration-500"
                    style={{ animationDelay: `${index * 150}ms` }}
                  >
                    <button
                      className={`w-full text-left p-4 md:p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                        selectedModel?.id === model.id 
                          ? 'border-blue-500 bg-blue-50 shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      onClick={() => handleModelSelect(model)}
                      onMouseEnter={() => setHoveredModel(model)}
                      onMouseLeave={() => setHoveredModel(null)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl lg:text-2xl font-semibold mb-3 md:mb-4 text-gray-900">{model.name}</h3>
                          <div className="grid grid-cols-2 gap-3 md:gap-6 text-sm md:text-base mb-4 md:mb-6">
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-gray-500 text-xs md:text-sm font-medium uppercase tracking-wide">GVWR</div>
                              <div className="font-semibold text-gray-900">{model.gvwr}</div>
                            </div>
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-gray-500 text-xs md:text-sm font-medium uppercase tracking-wide">Payload</div>
                              <div className="font-semibold text-gray-900">{model.payload}</div>
                            </div>
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-gray-500 text-xs md:text-sm font-medium uppercase tracking-wide">Deck Size</div>
                              <div className="font-semibold text-gray-900">{model.deckSize}</div>
                            </div>
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-gray-500 text-xs md:text-sm font-medium uppercase tracking-wide">Axles</div>
                              <div className="font-semibold text-gray-900">{model.axles}</div>
                            </div>
                          </div>
                          <div className="text-lg md:text-xl lg:text-2xl font-bold text-blue-600">${model.basePrice.toLocaleString()}</div>
                        </div>
                        <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-gray-400 ml-3 md:ml-6 transition-transform duration-300 group-hover:translate-x-1 flex-shrink-0" />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 3 && selectedModel && options && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentStep(2)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(4)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8"
                >
                  Proceed
                </Button>
              </div>
              
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">{selectedModel.name}</h1>
                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm text-zinc-600 dark:text-zinc-400">
                  <span>{selectedModel.gvwr}</span>
                  <span className="hidden md:inline">•</span>
                  <span>{selectedModel.payload}</span>
                  <span className="hidden md:inline">•</span>
                  <span>{selectedModel.deckSize}</span>
                </div>
              </div>

              {/* Options grouped by category */}
              {Object.entries(
                options.reduce((acc, option) => {
                  if (!acc[option.category]) acc[option.category] = [];
                  acc[option.category].push(option);
                  return acc;
                }, {} as Record<string, TrailerOption[]>)
              ).map(([category, categoryOptions]) => (
                <Card key={category} className="border border-zinc-200 dark:border-zinc-700">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 capitalize">
                      {category === 'tires' ? 'Tire Options' : 
                       category === 'ramps' ? 'Ramp Options' : 
                       category === 'color' ? 'Color Options' : 
                       category === 'extras' ? 'Additional Options' : 
                       category === 'deck' ? 'Deck Length' : 
                       category === 'walls' ? 'Wall Height' : 
                       category === 'winch' ? 'Winch Options' : category}
                    </h3>
                    
                    {categoryOptions[0]?.isMultiSelect ? (
                      <div className="space-y-3">
                        {categoryOptions.map((option) => (
                          <div key={option.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id={`option-${option.id}`}
                                checked={selectedOptions[category]?.includes(option.id) || false}
                                onCheckedChange={(checked) => 
                                  handleOptionChange(category, option.id, true, checked as boolean)
                                }
                              />
                              <div className="flex items-center">
                                <Label htmlFor={`option-${option.id}`} className="font-medium cursor-pointer">
                                  {option.name}
                                </Label>
                                <OptionInfoModal optionName={option.name}>
                                  <div />
                                </OptionInfoModal>
                              </div>
                            </div>
                            <span className="font-medium">
                              {option.price === 0 ? 'Included' : 
                               option.price > 0 ? `+$${option.price.toLocaleString()}` : 
                               `$${option.price.toLocaleString()}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <RadioGroup
                        value={selectedOptions[category]?.toString() || categoryOptions[0]?.id.toString()}
                        onValueChange={(value) => 
                          handleOptionChange(category, parseInt(value), false, true)
                        }
                      >
                        <div className="space-y-3">
                          {categoryOptions.map((option) => (
                            <div key={option.id} className="flex items-center justify-between py-2">
                              <div className="flex items-center space-x-3">
                                <RadioGroupItem
                                  value={option.id.toString()}
                                  id={`option-${option.id}`}
                                />
                                <div className="flex items-center">
                                  <Label htmlFor={`option-${option.id}`} className="font-medium cursor-pointer">
                                    {option.name}
                                  </Label>
                                  <OptionInfoModal optionName={option.name}>
                                    <div />
                                  </OptionInfoModal>
                                </div>
                              </div>
                              <span className="font-medium">
                                {option.price === 0 ? 'Included' : 
                                 option.price > 0 ? `+$${option.price.toLocaleString()}` : 
                                 `$${option.price.toLocaleString()}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Price Summary */}
              <Card className="bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <CardContent className="p-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg">Total MSRP</span>
                    <span className="text-2xl font-bold">${totalPrice.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Order Summary */}
          {currentStep === 4 && selectedModel && (
            <div className="space-y-8 pb-32">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentStep(3)}
                  className="text-blue-500 hover:text-blue-600"
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
                      <span className="font-medium">{selectedModel.gvwr}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Payload: </span>
                      <span className="font-medium">{selectedModel.payload}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Deck: </span>
                      <span className="font-medium">{selectedModel.deckSize}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Axles: </span>
                      <span className="font-medium">{selectedModel.axles}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="py-4 md:py-6 text-sm md:text-base min-h-[48px]"
                >
                  <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Spec Sheet
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setLocation("/dealer/login");
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

      {/* Fixed Tesla-style pricing display - only show on step 4 */}
      {currentStep === 4 && selectedModel && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-2xl md:text-3xl font-bold">
                    ${totalPrice.toLocaleString()}
                  </div>
                  <div className="text-xs md:text-sm text-zinc-500">Vehicle Price</div>
                </div>
                <ChevronDown className="w-4 h-4 md:w-5 md:h-5 text-zinc-400 ml-1" />
              </div>
              <Button 
                onClick={() => {
                  toast({
                    title: "Quote Request Sent",
                    description: "A dealer will contact you within 24 hours.",
                  });
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 md:px-8 py-2 md:py-3 text-sm md:text-base"
              >
                Order Now
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Fixed Employee and Dealer Portal Buttons - Mobile Friendly */}
      <div className="fixed left-4 bottom-4 z-40 flex gap-2">
        <Link href="/admin/login">
          <Button
            variant="ghost"
            size="sm"
            className="bg-white/80 md:bg-white/20 backdrop-blur-sm hover:bg-white/90 md:hover:bg-white/40 border border-gray-200 md:border-0 hover:border-gray-300 md:hover:border-gray-200 text-gray-600 md:text-gray-400 hover:text-gray-800 md:hover:text-gray-600 transition-all duration-500 text-xs px-3 py-2 md:py-1.5 opacity-90 md:opacity-60 hover:opacity-100 shadow-sm md:shadow-none"
          >
            <Users className="w-3 h-3 mr-1.5" />
            <span className="hidden md:inline">Employees</span>
            <span className="md:hidden">Staff</span>
          </Button>
        </Link>
        <Link href="/dealer/login">
          <Button
            variant="ghost"
            size="sm"
            className="bg-white/80 md:bg-white/20 backdrop-blur-sm hover:bg-white/90 md:hover:bg-white/40 border border-gray-200 md:border-0 hover:border-gray-300 md:hover:border-gray-200 text-gray-600 md:text-gray-400 hover:text-gray-800 md:hover:text-gray-600 transition-all duration-500 text-xs px-3 py-2 md:py-1.5 opacity-90 md:opacity-60 hover:opacity-100 shadow-sm md:shadow-none"
          >
            <Building2 className="w-3 h-3 mr-1.5" />
            <span className="hidden md:inline">Dealers</span>
            <span className="md:hidden">Dealers</span>
          </Button>
        </Link>
      </div>

      {/* Dealer Save Dialog */}
      <DealerSaveDialog
        open={showDealerSaveDialog}
        onOpenChange={setShowDealerSaveDialog}
        onSave={handleDealerSaveConfiguration}
      />
    </div>
  );
}
