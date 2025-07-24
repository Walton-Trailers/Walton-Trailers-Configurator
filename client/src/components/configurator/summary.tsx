import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Download, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generatePDF } from "@/lib/pdf-generator";
import type { TrailerModel } from "@shared/schema";

interface SummaryProps {
  model: TrailerModel;
  selectedOptions: Record<string, any>;
  totalPrice: number;
  onBack: () => void;
}

export default function Summary({ 
  model, 
  selectedOptions, 
  totalPrice, 
  onBack 
}: SummaryProps) {
  const { toast } = useToast();

  const handleRequestQuote = () => {
    toast({
      title: "Quote Request Sent",
      description: "A dealer will contact you within 24 hours with pricing and availability.",
    });
  };

  const handleDownloadPDF = () => {
    try {
      generatePDF(model, selectedOptions, totalPrice);
      toast({
        title: "PDF Downloaded",
        description: "Your trailer specification sheet has been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFindDealers = () => {
    toast({
      title: "Dealer Locator",
      description: "Dealer locator functionality would integrate with Google Maps API.",
    });
  };

  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="text-primary hover:text-primary/80 mb-4 flex items-center mx-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customization
          </Button>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Configuration Complete
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Review your configuration and request a quote from an authorized Walton dealer.
          </p>
        </div>

        <Card className="bg-card mb-8">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <img 
                  src={model.imageUrl} 
                  alt={model.name}
                  className="w-full h-64 object-cover rounded-xl"
                />
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-4">{model.name}</h3>
                <div className="space-y-3 mb-6">
                  <div>
                    <span className="text-muted-foreground">GVWR:</span>
                    <span className="font-medium ml-2">{model.gvwr}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payload:</span>
                    <span className="font-medium ml-2">{model.payload}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Deck Size:</span>
                    <span className="font-medium ml-2">{model.deckSize}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Axles:</span>
                    <span className="font-medium ml-2">{model.axles}</span>
                  </div>
                </div>
                <Card className="bg-background">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-primary">
                      ${totalPrice.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      MSRP including selected options
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card mb-8">
          <CardContent className="p-8">
            <h3 className="text-xl font-semibold mb-6">Selected Options</h3>
            <div className="space-y-3">
              {model.features.map((feature, index) => (
                <div key={index} className="flex justify-between">
                  <span>{feature}</span>
                  <span className="text-primary">Standard</span>
                </div>
              ))}
              {/* Add selected options here based on selectedOptions */}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Button 
            onClick={handleRequestQuote}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-8 flex items-center justify-center"
          >
            <Mail className="w-5 h-5 mr-2" />
            Request Quote
          </Button>
          <Button 
            variant="outline"
            onClick={handleDownloadPDF}
            className="font-medium py-4 px-8 flex items-center justify-center"
          >
            <Download className="w-5 h-5 mr-2" />
            Download PDF Spec
          </Button>
        </div>

        <div className="text-center">
          <h4 className="text-lg font-semibold mb-4">Find a Dealer Near You</h4>
          <p className="text-muted-foreground mb-6">
            Connect with authorized Walton dealers for personalized service and expert advice.
          </p>
          <Button 
            variant="secondary"
            onClick={handleFindDealers}
            className="py-3 px-6"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Find Dealers
          </Button>
        </div>
      </div>
    </section>
  );
}
