import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

interface DealerSaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customerInfo: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    notes: string;
  }) => Promise<void>;
}

export function DealerSaveDialog({ open, onOpenChange, onSave }: DealerSaveDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: ""
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(customerInfo);
      // Reset form after successful save
      setCustomerInfo({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        notes: ""
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save Configuration to Dealer Account</DialogTitle>
          <DialogDescription>
            Save this trailer configuration to your dealer account. You can optionally add customer information.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customerName">Customer Name (Optional)</Label>
            <Input
              id="customerName"
              value={customerInfo.customerName}
              onChange={(e) => setCustomerInfo({ ...customerInfo, customerName: e.target.value })}
              placeholder="John Doe"
              disabled={isLoading}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="customerEmail">Customer Email (Optional)</Label>
            <Input
              id="customerEmail"
              type="email"
              value={customerInfo.customerEmail}
              onChange={(e) => setCustomerInfo({ ...customerInfo, customerEmail: e.target.value })}
              placeholder="john@example.com"
              disabled={isLoading}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="customerPhone">Customer Phone (Optional)</Label>
            <Input
              id="customerPhone"
              value={customerInfo.customerPhone}
              onChange={(e) => setCustomerInfo({ ...customerInfo, customerPhone: e.target.value })}
              placeholder="(555) 123-4567"
              disabled={isLoading}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={customerInfo.notes}
              onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
              placeholder="Add any special requirements or notes..."
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}