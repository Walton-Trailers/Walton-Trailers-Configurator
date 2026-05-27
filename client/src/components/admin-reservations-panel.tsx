import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Save } from "lucide-react";
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
  createdAt: string;
  updatedAt: string;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "released", label: "Released" },
  { value: "cancelled", label: "Cancelled" },
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

  function open(r: ReservationRow) {
    setEditing(r);
    setDraftStatus(r.status);
    setDraftRepNotes(r.repNotes ?? "");
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
        body: { status: draftStatus, repNotes: draftRepNotes },
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
                {reservations.map((r) => (
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
