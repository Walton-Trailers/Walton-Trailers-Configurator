import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import type { TrailerCategory } from "@shared/schema";

interface CategorySelectionProps {
  categories: TrailerCategory[];
  selectedCategory: TrailerCategory | null;
  onCategorySelect: (category: TrailerCategory) => void;
}

export default function CategorySelection({ 
  categories, 
  selectedCategory, 
  onCategorySelect 
}: CategorySelectionProps) {
  return (
    <section className="py-20 slide-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Choose Your Trailer Category
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Select from our premium line of commercial trailers designed for 
            professionals who demand quality and reliability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category) => (
            <motion.div
              key={category.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className="bg-card hover:bg-card/80 transition-all duration-300 cursor-pointer group h-full"
                onClick={() => onCategorySelect(category)}
              >
                <CardContent className="p-8">
                  <img 
                    src={category.imageUrl} 
                    alt={category.name}
                    className="w-full h-48 object-cover rounded-xl mb-6 group-hover:scale-105 transition-transform duration-300"
                  />
                  <h3 className="text-2xl font-semibold mb-4">{category.name}</h3>
                  <p className="text-muted-foreground mb-4">{category.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-primary font-medium">
                      Starting at ${category.startingPrice.toLocaleString()}
                    </span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
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
