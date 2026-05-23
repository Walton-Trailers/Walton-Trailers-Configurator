import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface SubmitOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Saves the configuration as a draft, then promotes it to submitted with
  // the customer/PO details captured here. The parent handles the actual
  // POST + email side effects.
  onSubmit: (data: { customerName: string; poNumber: string }) => Promise<void>;
  // Pre-fill values — used when converting an existing quote that already
  // has a customer name attached.
  defaultCustomerName?: string;
  defaultPoNumber?: string;
}

export function SubmitOrderDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultCustomerName = "",
  defaultPoNumber = "",
}: SubmitOrderDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ customerName: defaultCustomerName, poNumber: defaultPoNumber });

  // Re-seed the form whenever the dialog opens with new defaults (e.g. the
  // user clicked Convert on a different quote row).
  useEffect(() => {
    if (open) setForm({ customerName: defaultCustomerName, poNumber: defaultPoNumber });
  }, [open, defaultCustomerName, defaultPoNumber]);

  const reset = () => setForm({ customerName: defaultCustomerName, poNumber: defaultPoNumber });

  const handleSubmit = async () => {
    if (!form.customerName.trim()) return;
    setIsLoading(true);
    try {
      await onSubmit({
        customerName: form.customerName.trim(),
        poNumber: form.poNumber.trim(),
      });
      reset();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Submit Order to Walton</DialogTitle>
          <DialogDescription>
            This will send the order to your Walton sales rep and lock it
            from further edits. Save as a quote instead if you're still
            working with the customer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="submit-customerName">Customer Name *</Label>
            <Input
              id="submit-customerName"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              placeholder="John Smith"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="submit-poNumber">PO / Reference # (optional)</Label>
            <Input
              id="submit-poNumber"
              value={form.poNumber}
              onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
              placeholder="e.g. PO-2026-0142"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !form.customerName.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit Order"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
