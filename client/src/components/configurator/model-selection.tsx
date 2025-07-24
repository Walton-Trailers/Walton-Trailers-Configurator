import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { TrailerModel } from "@shared/schema";

interface ModelSelectionProps {
  categorySlug: string;
  selectedModel: TrailerModel | null;
  onModelSelect: (model: TrailerModel) => void;
  onBack: () => void;
}

export default function ModelSelection({ 
  categorySlug, 
  selectedModel, 
  onModelSelect, 
  onBack 
}: ModelSelectionProps) {
  const { data: models, isLoading } = useQuery<TrailerModel[]>({
    queryKey: ['/api/categories', categorySlug, 'models'],
  });

  if (isLoading) {
    return (
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading models...</p>
          </div>
        </div>
      </div>
    );
  }

  const categoryNames: Record<string, string> = {
    dump: 'Dump Trailers',
    gooseneck: 'Gooseneck Trailers',
    tilt: 'Tilt Equipment Trailers',
    hauler: 'Car/Equipment Haulers',
    landscape: 'Landscape Trailers',
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
            Back to Categories
          </Button>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {categoryNames[categorySlug] || 'Trailers'}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect model for your specific needs. All models include 
            our industry-leading warranty and quality construction.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {models?.map((model) => (
            <motion.div
              key={model.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className="bg-card hover:bg-card/80 transition-all duration-300 cursor-pointer group"
                onClick={() => onModelSelect(model)}
              >
                <CardContent className="p-8">
                  <img 
                    src={model.imageUrl} 
                    alt={model.name}
                    className="w-full h-64 object-cover rounded-xl mb-6 group-hover:scale-105 transition-transform duration-300"
                  />
                  <h3 className="text-2xl font-semibold mb-4">{model.name}</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
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
                  
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">
                          ${model.basePrice.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Starting MSRP</div>
                      </div>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
