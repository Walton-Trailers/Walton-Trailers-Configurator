import type { TrailerModel } from "@shared/schema";

export function generatePDF(
  model: TrailerModel, 
  selectedOptions: Record<string, any>, 
  totalPrice: number
) {
  // This is a simplified PDF generation function
  // In a real application, you would use a library like jsPDF or PDFKit

  const content = `
WALTON TRAILERS SPECIFICATION SHEET

Model: ${model.name}
GVWR: ${model.gvwr}
Payload: ${model.payload}
Deck Size: ${model.deckSize}
Axles: ${model.axles}

Base Price: $${model.basePrice.toLocaleString()}
Total MSRP: $${totalPrice.toLocaleString()}

Standard Features:
${model.features.map(feature => `• ${feature}`).join('\n')}

Configuration Date: ${new Date().toLocaleDateString()}
  `;

  // Create a blob and download it
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${model.modelId}-specification.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
