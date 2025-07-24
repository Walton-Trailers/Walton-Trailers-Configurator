import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TrailerModel, TrailerOption } from "@shared/schema";

interface CustomizationProps {
  model: TrailerModel;
  selectedOptions: Record<string, any>;
  onOptionsChange: (options: Record<string, any>) => void;
  onBack: () => void;
  onContinue: () => void;
  onSave: () => void;
  totalPrice: number;
}

export default function Customization({ 
  model, 
  selectedOptions, 
  onOptionsChange, 
  onBack, 
  onContinue,
  onSave,
  totalPrice 
}: CustomizationProps) {
  const { toast } = useToast();
  
  const { data: options, isLoading } = useQuery<TrailerOption[]>({
    queryKey: ['/api/models', model.modelId, 'options'],
  });

  if (isLoading) {
    return (
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading customization options...</p>
          </div>
        </div>
      </div>
    );
  }

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
    
    onOptionsChange(newOptions);
  };

  const handleSave = () => {
    onSave();
    toast({
      title: "Configuration Saved",
      description: "Your trailer configuration has been saved successfully.",
    });
  };

  const groupedOptions = options?.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = [];
    }
    acc[option.category].push(option);
    return acc;
  }, {} as Record<string, TrailerOption[]>) || {};

  const categoryNames: Record<string, string> = {
    tires: 'Tire Options',
    ramps: 'Ramp Options',
    color: 'Color Options',
    extras: 'Additional Options',
    deck: 'Deck Length',
    walls: 'Wall Height',
    winch: 'Winch Options'
  };

  const getSelectedOptionsDisplay = () => {
    const items = [];
    items.push({ name: 'Base Model', price: model.basePrice });

    Object.entries(selectedOptions).forEach(([category, selected]) => {
      const categoryOptions = groupedOptions[category] || [];
      
      if (Array.isArray(selected)) {
        selected.forEach((optionId: number) => {
          const option = categoryOptions.find(opt => opt.id === optionId);
          if (option && option.price !== 0) {
            items.push({ name: option.name, price: option.price });
          }
        });
      } else if (selected !== undefined) {
        const option = categoryOptions.find(opt => opt.id === selected);
        if (option && option.price !== 0) {
          items.push({ name: option.name, price: option.price });
        }
      }
    });

    return items;
  };

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-primary hover:text-primary/80 mb-4 flex items-center mx-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Models
          </Button>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Customize Your {model.name}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Personalize your trailer with our extensive range of options and upgrades.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Selected Model Preview */}
          <div className="lg:col-span-2">
            <Card className="bg-card mb-8">
              <CardContent className="p-8">
                <img 
                  src={model.imageUrl} 
                  alt={model.name}
                  className="w-full h-64 object-cover rounded-xl mb-6"
                />
                <h3 className="text-2xl font-semibold mb-4">{model.name}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">GVWR:</span>
                    <div className="font-medium">{model.gvwr}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payload:</span>
                    <div className="font-medium">{model.payload}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deck Size:</span>
                    <div className="font-medium">{model.deckSize}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Axles:</span>
                    <div className="font-medium">{model.axles}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customization Options */}
            <div className="space-y-8">
              {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
                <Card key={category} className="bg-card">
                  <CardContent className="p-8">
                    <h4 className="text-xl font-semibold mb-6">
                      {categoryNames[category] || category}
                    </h4>
                    
                    {categoryOptions[0]?.isMultiSelect ? (
                      <div className="space-y-4">
                        {categoryOptions.map((option) => (
                          <div key={option.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:border-border/80 transition-colors">
                            <div className="flex items-center">
                              <Checkbox
                                id={`option-${option.id}`}
                                checked={selectedOptions[category]?.includes(option.id) || false}
                                onCheckedChange={(checked) => 
                                  handleOptionChange(category, option.id, true, checked as boolean)
                                }
                                className="mr-4"
                              />
                              <Label htmlFor={`option-${option.id}`} className="font-medium cursor-pointer">
                                {option.name}
                              </Label>
                            </div>
                            <span className="text-primary font-semibold">
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
                        <div className="space-y-4">
                          {categoryOptions.map((option) => (
                            <div key={option.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:border-border/80 transition-colors">
                              <div className="flex items-center">
                                <RadioGroupItem
                                  value={option.id.toString()}
                                  id={`option-${option.id}`}
                                  className="mr-4"
                                />
                                <Label htmlFor={`option-${option.id}`} className="font-medium cursor-pointer">
                                  {option.name}
                                </Label>
                              </div>
                              <span className="text-primary font-semibold">
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
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="lg:col-span-1">
            <Card className="bg-card sticky top-24">
              <CardContent className="p-8">
                <h3 className="text-xl font-semibold mb-6">Configuration Summary</h3>
                
                <div className="space-y-4 mb-6">
                  {getSelectedOptionsDisplay().map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span className={index === 0 ? "font-medium" : ""}>{item.name}</span>
                      <span className={`font-medium ${index === 0 ? "" : "text-primary"}`}>
                        {index === 0 ? `$${item.price.toLocaleString()}` :
                         item.price > 0 ? `+$${item.price.toLocaleString()}` :
                         `$${item.price.toLocaleString()}`}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t border-border pt-4 mb-6">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total MSRP</span>
                    <span className="text-primary price-animate">${totalPrice.toLocaleString()}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={onContinue}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 mb-3"
                >
                  Continue to Summary
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleSave}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
