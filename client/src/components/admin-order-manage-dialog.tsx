import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { FileText, Loader2, Upload, Trash2, ExternalLink, Send } from "lucide-react";

/**
 * Rep-side order management dialog. Opens from the Configurations table for
 * any dealer-type order. Lets a Walton rep:
 *   - Assign / edit the Walton order number (rep_order_number)
 *   - Move the order through the lifecycle (status select)
 *   - Upload, replace, or remove the work-order PDF (Vercel Blob)
 *   - Add internal notes
 *
 * Uploading a work order auto-flips status submitted → received on the
 * server, so reps don't usually need to touch the status dropdown.
 */
interface AdminOrderManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Order row from /api/admin/configurations. Shape is flat (joined dealer
  // info) so we read from it directly without re-fetching.
  order: any | null;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'received', label: 'Received' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
];

export function AdminOrderManageDialog({ open, onOpenChange, order }: AdminOrderManageDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Local form state mirrors the order; re-seeds whenever the dialog opens
  // with a different row.
  const [repOrderNumber, setRepOrderNumber] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [workOrderUrl, setWorkOrderUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && order) {
      setRepOrderNumber(order.repOrderNumber || "");
      setStatus(order.status || "submitted");
      setNotes(order.notes || "");
      setWorkOrderUrl(order.workOrderUrl || null);
    }
  }, [open, order]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error("No order selected");
      return apiRequest(`/api/admin/dealer-orders/${order.id}`, {
        method: "PATCH",
        body: {
          repOrderNumber: repOrderNumber.trim() || null,
          status,
          notes: notes.trim() || null,
          // workOrderUrl is included so the server can detect an explicit
          // "remove" (null) vs no change. We always send it.
          workOrderUrl,
        },
      });
    },
    onSuccess: () => {
      toast({ title: "Order updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/configurations"] });
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
  });

  // Hard-delete the order. Distinct from the dealer-side soft-delete — this
  // wipes the row entirely (and best-effort cleans up the work-order PDF).
  // Two-step confirm guards against an accidental click.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error("No order selected");
      return apiRequest(`/api/admin/dealer-orders/${order.id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Order deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/configurations"] });
      setConfirmDelete(false);
      onOpenChange(false);
    },
    onError: (err: any) =>
      toast({ title: "Delete failed", description: err?.message, variant: "destructive" }),
  });

  // Reset the confirm-delete state any time the dialog re-opens with a new row.
  useEffect(() => {
    if (open) setConfirmDelete(false);
  }, [open, order]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;
    if (file.type !== "application/pdf") {
      toast({ title: "PDF only", description: "Work orders must be PDF files.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      // Stable path keyed off the internal order number so re-uploads
      // replace the same blob instead of accumulating ghost files.
      const blob = await upload(`work-orders/${order.orderNumber}.pdf`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/blob-upload-token/work-order",
        contentType: "application/pdf",
      });
      setWorkOrderUrl(blob.url);
      toast({ title: "Uploaded", description: "Click Save to attach this to the order." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      // Clear input so re-selecting the same file re-fires onChange.
      e.target.value = "";
    }
  };

  const handleRemoveWorkOrder = () => {
    setWorkOrderUrl(null);
    toast({ title: "Removed", description: "Click Save to commit the removal." });
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Manage order
            {(order.dealerName || order.customerName) && (
              <span className="text-sm font-normal text-gray-500">
                {[order.dealerName, order.customerName].filter(Boolean).join(' · ')}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Assign the Walton order number, update status, and attach the work-order PDF.
            The dealer sees this info in their dashboard.
          </DialogDescription>
        </DialogHeader>

        {/* Read-only context */}
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded">
            <div>
              <p className="text-xs uppercase text-gray-500">Dealer</p>
              <p className="font-medium">{order.dealerName || '—'}</p>
              <p className="text-gray-600">{order.dealerId ? `ID ${order.dealerId}` : ''}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Customer</p>
              <p className="font-medium">{order.customerName || '—'}</p>
              {order.poNumber && <p className="text-gray-600">PO {order.poNumber}</p>}
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Trailer</p>
              <p className="font-medium">{order.modelName}</p>
              <p className="text-gray-600">{order.categoryName}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Total</p>
              <p className="font-medium">${Number(order.totalPrice || 0).toLocaleString()}</p>
              {order.submittedAt && (
                <p className="text-gray-600 text-xs">
                  Submitted {new Date(order.submittedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="repOrderNumber">Walton order #</Label>
              <Input
                id="repOrderNumber"
                value={repOrderNumber}
                onChange={(e) => setRepOrderNumber(e.target.value)}
                placeholder="e.g. W-2026-0412"
              />
              <p className="text-xs text-gray-500 mt-1">Shown to the dealer once saved.</p>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Auto-flips to <em>Received</em> when a work order is attached.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Internal notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the next rep should know about this order."
              rows={3}
            />
          </div>

          {/* Work-order PDF */}
          <div>
            <Label>Work order PDF</Label>
            {workOrderUrl ? (
              <div className="flex items-center gap-2 mt-2 p-3 border rounded bg-blue-50">
                <FileText className="w-5 h-5 text-blue-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Work order attached</p>
                  <a
                    href={workOrderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:underline inline-flex items-center gap-1"
                  >
                    Preview <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRemoveWorkOrder}
                  disabled={saveMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading || saveMutation.isPending}
                  />
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50">
                    {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    Replace
                  </span>
                </label>
              </div>
            ) : (
              <label className="cursor-pointer mt-2 flex items-center gap-2 p-3 border-2 border-dashed rounded hover:bg-gray-50">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading || saveMutation.isPending}
                />
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                    <span className="text-sm text-gray-600">Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Upload work order PDF</p>
                      <p className="text-xs text-gray-500">
                        Dealer will be emailed a download link. Status will move to <em>Received</em>.
                      </p>
                    </div>
                  </>
                )}
              </label>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {/* Delete is intentionally on the left so it can't be confused with
              the primary Save action on the right. Two-click confirm. */}
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-700 font-medium">Delete this order permanently?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Deleting…</>
                ) : (
                  "Yes, delete"
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={saveMutation.isPending || deleteMutation.isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete order
            </Button>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending || deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || uploading || deleteMutation.isPending || confirmDelete}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
