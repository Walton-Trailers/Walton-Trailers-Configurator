import jsPDF from 'jspdf';
import type { TrailerModel } from "@shared/schema";

interface TrailerOption {
  id: number;
  name: string;
  price: number;
  category: string;
}

export function generateConfigurationPDF(
  model: TrailerModel,
  selectedOptions: Record<string, any>,
  totalPrice: number,
  options: TrailerOption[] = []
) {
  const pdf = new jsPDF();
  
  // Header
  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("WALTON TRAILERS", 20, 25);
  
  pdf.setFontSize(16);
  pdf.text("Configuration Summary", 20, 35);
  
  // Date
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 25);
  
  // Model Information
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Trailer Specifications", 20, 50);
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  let yPosition = 60;
  
  pdf.text(`Model: ${model.name}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`GVWR: ${model.gvwr}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Payload: ${model.payload}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Deck Size: ${model.deckSize}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Axles: ${model.axles}`, 20, yPosition);
  yPosition += 15;
  
  // Selected Options
  const selectedOptionsArray = Object.entries(selectedOptions).flatMap(([category, optionIds]) => {
    const categoryOptions = options.filter(opt => opt.category === category) || [];
    return Array.isArray(optionIds) 
      ? categoryOptions.filter(opt => optionIds.includes(opt.id))
      : categoryOptions.filter(opt => opt.id === optionIds);
  });
  
  if (selectedOptionsArray.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Selected Options", 20, yPosition);
    yPosition += 10;
    
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    
    selectedOptionsArray.forEach(option => {
      const priceText = option.price === 0 ? 'Included' : 
                       option.price > 0 ? `+$${option.price.toLocaleString()}` : 
                       `$${option.price.toLocaleString()}`;
      
      pdf.text(`• ${option.name}`, 20, yPosition);
      pdf.text(priceText, 150, yPosition);
      yPosition += 6;
    });
    
    yPosition += 10;
  }
  
  // Pricing Breakdown
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Pricing Breakdown", 20, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  
  // Base price
  pdf.text(`Base Price`, 20, yPosition);
  pdf.text(`$${model.basePrice.toLocaleString()}`, 150, yPosition);
  yPosition += 6;
  
  // Option prices
  selectedOptionsArray.forEach(option => {
    if (option.price !== 0) {
      pdf.text(`${option.name}`, 20, yPosition);
      const priceText = option.price > 0 ? `+$${option.price.toLocaleString()}` : 
                       `$${option.price.toLocaleString()}`;
      pdf.text(priceText, 150, yPosition);
      yPosition += 6;
    }
  });
  
  // Line separator
  pdf.line(20, yPosition + 2, 190, yPosition + 2);
  yPosition += 10;
  
  // Total
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text(`Total MSRP`, 20, yPosition);
  pdf.text(`$${totalPrice.toLocaleString()}`, 150, yPosition);
  
  // Footer
  yPosition += 20;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("This is a preliminary configuration. Final pricing may vary.", 20, yPosition);
  pdf.text("Contact your authorized Walton dealer for a formal quote.", 20, yPosition + 6);
  
  // Download the PDF
  pdf.save(`${model.modelId || 'trailer'}-configuration.pdf`);
}

// Backward compatibility with existing code
export function generatePDF(
  model: TrailerModel, 
  selectedOptions: Record<string, any>, 
  totalPrice: number
) {
  generateConfigurationPDF(model, selectedOptions, totalPrice, []);
}
