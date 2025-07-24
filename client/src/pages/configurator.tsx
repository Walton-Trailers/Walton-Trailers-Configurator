import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Download, Mail, MapPin, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TrailerCategory, TrailerModel, TrailerOption } from "@shared/schema";

export default function Configurator() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<TrailerCategory | null>(null);
  const [selectedModel, setSelectedModel] = useState<TrailerModel | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});
  const [totalPrice, setTotalPrice] = useState(0);

  const { data: categories, isLoading } = useQuery<TrailerCategory[]>({
    queryKey: ['/api/categories'],
  });

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading configurator...</p>
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

  const currentTrailerImage = selectedModel?.imageUrl || selectedCategory?.imageUrl || 
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
      {/* Tesla-style Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md z-50 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-6">
              <div className="text-2xl font-bold tracking-wide">WALTON</div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8 text-sm">
              <div className={`px-3 py-1 rounded-full transition-colors ${currentStep >= 1 ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                Category
              </div>
              <div className={`px-3 py-1 rounded-full transition-colors ${currentStep >= 2 ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                Model
              </div>
              <div className={`px-3 py-1 rounded-full transition-colors ${currentStep >= 3 ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                Configure
              </div>
              <div className={`px-3 py-1 rounded-full transition-colors ${currentStep >= 4 ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                Order
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-zinc-500">Starting at</div>
              <div className="text-xl font-semibold">${totalPrice.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Tesla-style Main Layout */}
      <div className="pt-16 min-h-screen flex">
        {/* Left Panel - Image */}
        <div className="w-1/2 h-screen sticky top-16 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
          <img 
            src={currentTrailerImage}
            alt="Trailer"
            className="w-full h-full object-cover transition-all duration-500"
          />
        </div>

        {/* Right Panel - Configuration */}
        <div className="w-1/2 p-8 overflow-y-auto">
          {/* Step 1: Category Selection */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <h1 className="text-4xl font-bold mb-4">Choose Your Trailer</h1>
                <p className="text-zinc-600 dark:text-zinc-400 text-lg">
                  Select from our premium line of commercial trailers
                </p>
              </div>

              <div className="space-y-4">
                {categories?.map((category) => (
                  <Card 
                    key={category.id}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                      selectedCategory?.id === category.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                    onClick={() => handleCategorySelect(category)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
                          <p className="text-zinc-600 dark:text-zinc-400 mb-4">{category.description}</p>
                          <div className="text-lg font-medium">Starting at ${category.startingPrice.toLocaleString()}</div>
                        </div>
                        <ArrowRight className="w-6 h-6 text-zinc-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Model Selection */}
          {currentStep === 2 && selectedCategory && (
            <div className="space-y-8">
              <div className="flex items-center space-x-4 mb-6">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
              
              <div>
                <h1 className="text-4xl font-bold mb-4">{selectedCategory.name}</h1>
                <p className="text-zinc-600 dark:text-zinc-400 text-lg">
                  Choose the perfect model for your needs
                </p>
              </div>

              <div className="space-y-4">
                {models?.map((model) => (
                  <Card 
                    key={model.id}
                    className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                      selectedModel?.id === model.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }`}
                    onClick={() => handleModelSelect(model)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-3">{model.name}</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-zinc-500">GVWR: </span>
                              <span className="font-medium">{model.gvwr}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Payload: </span>
                              <span className="font-medium">{model.payload}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Deck: </span>
                              <span className="font-medium">{model.deckSize}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Axles: </span>
                              <span className="font-medium">{model.axles}</span>
                            </div>
                          </div>
                          <div className="text-lg font-semibold">${model.basePrice.toLocaleString()}</div>
                        </div>
                        <ArrowRight className="w-6 h-6 text-zinc-400 ml-4" />
                      </div>
                    </CardContent>
                  </Card>
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
                  Order Now
                </Button>
              </div>
              
              <div>
                <h1 className="text-4xl font-bold mb-2">{selectedModel.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-zinc-600 dark:text-zinc-400">
                  <span>{selectedModel.gvwr}</span>
                  <span>•</span>
                  <span>{selectedModel.payload}</span>
                  <span>•</span>
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
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4 capitalize">
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
                              <Label htmlFor={`option-${option.id}`} className="font-medium cursor-pointer">
                                {option.name}
                              </Label>
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
                                <Label htmlFor={`option-${option.id}`} className="font-medium cursor-pointer">
                                  {option.name}
                                </Label>
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
            <div className="space-y-8">
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
                <h1 className="text-4xl font-bold mb-4">Your Configuration</h1>
                <p className="text-zinc-600 dark:text-zinc-400 text-lg">
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
                  
                  <Separator className="my-6" />
                  
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total MSRP</span>
                    <span>${totalPrice.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => {
                    toast({
                      title: "Quote Request Sent",
                      description: "A dealer will contact you within 24 hours.",
                    });
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-6"
                >
                  <Mail className="w-5 h-5 mr-2" />
                  Request Quote
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="py-6"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download Spec Sheet
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
