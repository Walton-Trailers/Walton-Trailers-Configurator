import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import CategorySelection from "@/components/configurator/category-selection";
import ModelSelection from "@/components/configurator/model-selection";
import Customization from "@/components/configurator/customization";
import Summary from "@/components/configurator/summary";
import ProgressBar from "@/components/configurator/progress-bar";
import PriceDisplay from "@/components/configurator/price-display";
import { useConfigurator } from "@/hooks/use-configurator";
import type { TrailerCategory } from "@shared/schema";

export default function Configurator() {
  const [currentStep, setCurrentStep] = useState(1);
  const { 
    selectedCategory, 
    selectedModel, 
    selectedOptions, 
    totalPrice,
    setSelectedCategory,
    setSelectedModel,
    setSelectedOptions,
    calculateTotalPrice,
    saveConfiguration,
    loadConfiguration
  } = useConfigurator();

  const { data: categories, isLoading } = useQuery<TrailerCategory[]>({
    queryKey: ['/api/categories'],
  });

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  useEffect(() => {
    calculateTotalPrice();
  }, [selectedModel, selectedOptions, calculateTotalPrice]);

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">W</span>
              </div>
              <h1 className="text-xl font-semibold">Walton Trailers</h1>
            </div>
            
            <ProgressBar currentStep={currentStep} />
            
            <PriceDisplay price={totalPrice} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        {currentStep === 1 && (
          <CategorySelection
            categories={categories || []}
            selectedCategory={selectedCategory}
            onCategorySelect={(category) => {
              setSelectedCategory(category);
              setCurrentStep(2);
            }}
          />
        )}
        
        {currentStep === 2 && selectedCategory && (
          <ModelSelection
            categorySlug={selectedCategory.slug}
            selectedModel={selectedModel}
            onModelSelect={(model) => {
              setSelectedModel(model);
              setCurrentStep(3);
            }}
            onBack={() => setCurrentStep(1)}
          />
        )}
        
        {currentStep === 3 && selectedModel && (
          <Customization
            model={selectedModel}
            selectedOptions={selectedOptions}
            onOptionsChange={setSelectedOptions}
            onBack={() => setCurrentStep(2)}
            onContinue={() => setCurrentStep(4)}
            onSave={saveConfiguration}
            totalPrice={totalPrice}
          />
        )}
        
        {currentStep === 4 && selectedModel && (
          <Summary
            model={selectedModel}
            selectedOptions={selectedOptions}
            totalPrice={totalPrice}
            onBack={() => setCurrentStep(3)}
          />
        )}
      </main>
    </div>
  );
}
