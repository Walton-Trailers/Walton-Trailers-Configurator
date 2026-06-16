import { useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Save, FileText, ExternalLink, Upload, Trash2 } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReservationRow {
  id: number;
  dealerId: number;
  dealerName: string | null;
  dealerCode: string | null;
  airtableRecordId: string | null;
  stockNumber: string | null;
  model: string | null;
  customerName: string | null;
  note: string | null;
  repNotes: string | null;
  snapshotFields: Record<string, any> | null;
  status: string;
  statusChangedAt: string | null;
  documentUrl: string | null;
  documentUploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "released", label: "Released" },
  { value: "cancelled", label: "Cancelled" },
];

// Stage filter chips at the top of the panel — mirrors the lifecycle
// chips on the Dealer Configurations tab so admins read both views the
// same way. "all" is the default landing filter.
// Cancelled reservations are hidden from the admin view entirely. A rep can
// still set a reservation to Cancelled via the edit dialog, which then removes
// it from this table.
type StageFilter = "all" | "requested" | "confirmed" | "released";
const STAGE_CHIPS: Array<{ key: StageFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "confirmed", label: "Confirmed" },
  { key: "released", label: "Released" },
];

// Same color tones the dealer-side Reserved tab uses so dealers and
// reps read the badges the same way.
function statusTone(status: string): string {
  if (status === "confirmed") return "bg-green-100 text-green-800";
  if (status === "released" || status === "cancelled") return "bg-gray-200 text-gray-700";
  return "bg-amber-100 text-amber-800";
}

export function AdminReservationsPanel() {
  const { toast } = useToast();
  const sessionId = typeof window !== "undefined" ? localStorage.getItem("admin_session") : null;

  const { data: reservations = [], isLoading } = useQuery<ReservationRow[]>({
    queryKey: ["/api/admin/reservations"],
    queryFn: () =>
      apiRequest("/api/admin/reservations", {
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    enabled: !!sessionId,
  });

  const [editing, setEditing] = useState<ReservationRow | null>(null);
  const [draftStatus, setDraftStatus] = useState<string>("requested");
  const [draftRepNotes, setDraftRepNotes] = useState<string>("");
  const [draftDocumentUrl, setDraftDocumentUrl] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");

  // Counts run against the unfiltered list so chips show the true
  // lifecycle distribution regardless of which one is active.
  // Hide cancelled reservations from the admin table entirely.
  const activeReservations = reservations.filter((r) => r.status !== "cancelled");
  const counts: Record<StageFilter, number> = {
    all: activeReservations.length,
    requested: activeReservations.filter((r) => r.status === "requested").length,
    confirmed: activeReservations.filter((r) => r.status === "confirmed").length,
    released: activeReservations.filter((r) => r.status === "released").length,
  };
  const visibleReservations =
    stageFilter === "all"
      ? activeReservations
      : activeReservations.filter((r) => r.status === stageFilter);

  function open(r: ReservationRow) {
    setEditing(r);
    setDraftStatus(r.status);
    setDraftRepNotes(r.repNotes ?? "");
    setDraftDocumentUrl(r.documentUrl ?? null);
  }
  function close() {
    setEditing(null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No reservation selected");
      return apiRequest(`/api/admin/reservations/${editing.id}`, {
        method: "PATCH",
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
        body: { status: draftStatus, repNotes: draftRepNotes, documentUrl: draftDocumentUrl },
      });
    },
    onSuccess: () => {
      toast({ title: "Reservation updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
      close();
    },
    onError: (err: any) =>
      toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
  });

  // Inline status select on each row — saves immediately without
  // opening the full edit dialog. The dialog is for when the rep also
  // wants to leave internal notes.
  const inlineStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/admin/reservations/${id}`, {
        method: "PATCH",
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
        body: { status },
      }),
    onSuccess: () => {
      toast({ title: "Status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reservations"] });
    },
    onError: (err: any) =>
      toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
  });

  // Upload a work-order / document PDF for the reservation, then attach it on
  // Save. Reuses the generic PDF blob-upload token endpoint.
  const handleDocUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    if (file.type !== "application/pdf") {
      toast({ title: "PDF only", description: "Documents must be PDF files.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    setUploadingDoc(true);
    try {
      const blob = await upload(`reservation-docs/${editing.id}.pdf`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/blob-upload-token/work-order",
        contentType: "application/pdf",
      });
      setDraftDocumentUrl(blob.url);
      toast({ title: "Uploaded", description: "Click Save to attach it to the reservation." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message, variant: "destructive" });
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservations</CardTitle>
        <CardDescription>
          Inventory holds dealers requested via the View Inventory page. Move a
          row through Requested → Confirmed once you've held the unit in
          Airtable, then to Released when the dealer takes delivery (or
          Cancelled if it falls through).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-gray-500">Loading reservations…</p>
        ) : reservations.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No reservations yet.</p>
        ) : (
          <>
            {/* Stage filter chips — same visual treatment as the Dealer
                Configurations tab so admins jump between status buckets
                with a familiar gesture. */}
            <div className="flex flex-wrap gap-2 mb-4">
              {STAGE_CHIPS.map((chip) => {
                const active = stageFilter === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setStageFilter(chip.key)}
                    className={
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
                      (active
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-400")
                    }
                  >
                    {chip.label}
                    <span
                      className={
                        "inline-flex items-center justify-center min-w-[20px] px-1.5 rounded-full text-[10px] " +
                        (active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600")
                      }
                    >
                      {counts[chip.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {visibleReservations.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                No reservations in this stage.
              </p>
            ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Production ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleReservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.dealerName || "—"}</p>
                        <p className="text-xs text-gray-500 font-mono">{r.dealerCode || ""}</p>
                      </div>
                    </TableCell>
                    {/* Production ID + model live in the same cell so the
                        rep sees the full identity of the reserved unit. */}
                    <TableCell>
                      <div className="font-mono">
                        {r.stockNumber || <span className="text-gray-400 italic">—</span>}
                      </div>
                      {r.model && (
                        <div className="text-xs text-gray-500 mt-0.5">{r.model}</div>
                      )}
                    </TableCell>
                    <TableCell>{r.customerName || <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${statusTone(r.status)}`}>
                          {r.status}
                        </span>
                        <select
                          aria-label="Change status"
                          value={r.status}
                          onChange={(e) =>
                            inlineStatusMutation.mutate({ id: r.id, status: e.target.value })
                          }
                          disabled={inlineStatusMutation.isPending}
                          className="h-7 px-2 rounded border border-input bg-background text-xs"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {format(new Date(r.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => open(r)}>
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
            )}
          </>
        )}
      </CardContent>

      {/* Edit dialog — used when the rep wants to add internal notes or
          double-check the dealer's original request before saving. */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editing?.stockNumber || editing?.model || `Reservation #${editing?.id}`}
            </DialogTitle>
            <DialogDescription>
              {editing?.dealerName} {editing?.dealerCode ? `(${editing.dealerCode})` : ""}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md bg-gray-50 p-3 space-y-1">
                <div className="grid grid-cols-[110px,1fr] gap-1">
                  <span className="text-gray-500">Production ID</span>
                  <span>{editing.stockNumber || "—"}</span>
                  <span className="text-gray-500">Model</span>
                  <span>{editing.model || "—"}</span>
                  <span className="text-gray-500">Customer</span>
                  <span>{editing.customerName || "—"}</span>
                  <span className="text-gray-500">Requested</span>
                  <span>{format(new Date(editing.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
                  {editing.airtableRecordId && (
                    <>
                      <span className="text-gray-500">Airtable</span>
                      <span className="font-mono text-xs">{editing.airtableRecordId}</span>
                    </>
                  )}
                </div>
              </div>

              {editing.note && (
                <div>
                  <Label>Dealer's note</Label>
                  <p className="rounded border bg-white p-2 text-gray-800 whitespace-pre-wrap">
                    {editing.note}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={draftStatus}
                  onChange={(e) => setDraftStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="repNotes">Internal notes (rep only)</Label>
                <Textarea
                  id="repNotes"
                  value={draftRepNotes}
                  onChange={(e) => setDraftRepNotes(e.target.value)}
                  placeholder="What you did with this hold. Not shown to the dealer."
                  rows={4}
                />
              </div>

              <div>
                <Label>Work order / document (PDF — shown to the dealer)</Label>
                {draftDocumentUrl ? (
                  <div className="flex items-center gap-2 mt-2 p-3 border rounded bg-blue-50">
                    <FileText className="w-5 h-5 text-blue-700 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">Document attached</p>
                      <a
                        href={draftDocumentUrl}
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
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDraftDocumentUrl(null)}
                      disabled={uploadingDoc}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer mt-2 flex items-center gap-2 p-3 border-2 border-dashed rounded hover:bg-gray-50">
                    {uploadingDoc ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="text-sm text-gray-600">
                      {uploadingDoc ? "Uploading…" : "Upload a PDF for the dealer to view"}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleDocUpload}
                      disabled={uploadingDoc}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
