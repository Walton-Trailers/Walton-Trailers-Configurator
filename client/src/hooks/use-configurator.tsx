import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { TrailerCategory, TrailerModel } from "@shared/schema";

export function useConfigurator() {
  const [selectedCategory, setSelectedCategory] = useState<TrailerCategory | null>(null);
  const [selectedModel, setSelectedModel] = useState<TrailerModel | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, any>>({});
  const [totalPrice, setTotalPrice] = useState(0);

  const calculateTotalPrice = useCallback(() => {
    if (!selectedModel) {
      setTotalPrice(0);
      return;
    }

    // Note: TrailerModel from schema doesn't have basePrice property
    // Using a default starting price for now
    let price = 10000; // Default base price
    
    // This would need to be implemented with actual option prices
    // For now, we'll use a simplified calculation
    
    setTotalPrice(price);
  }, [selectedModel, selectedOptions]);

  const saveConfiguration = useCallback(async () => {
    if (!selectedCategory || !selectedModel) return;

    const sessionId = crypto.randomUUID();
    const config = {
      sessionId,
      categorySlug: selectedCategory.slug,
      modelId: selectedModel.id, // Use id instead of modelId
      selectedOptions,
      totalPrice,
      createdAt: new Date().toISOString()
    };

    try {
      await apiRequest('/api/configurations', {
        method: 'POST',
        body: config
      });
      localStorage.setItem('walton_trailer_config', JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }, [selectedCategory, selectedModel, selectedOptions, totalPrice]);

  const loadConfiguration = useCallback(() => {
    const saved = localStorage.getItem('walton_trailer_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        // Load saved configuration - would need to implement full restoration
        setTotalPrice(config.totalPrice || 0);
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    }
  }, []);

  return {
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
  };
}
