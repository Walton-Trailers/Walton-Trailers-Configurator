import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Search, Package, RefreshCw, BookmarkPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Airtable record shape from /api/dealer/inventory — minimal pass-through
// so we don't have to keep this in sync with whatever columns Walton adds
// to the inventory table in Airtable later. Server proxies the raw fields
// object verbatim.
interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

// Fallback column order used only when the server doesn't ship an
// explicit fieldOrder (e.g. AIRTABLE_INVENTORY_FIELDS not set in
// Vercel). When the env var IS set, the server returns fieldOrder
// matching the env var verbatim and that wins absolutely — the
// admin picks the column layout, the client honors it.
const PREFERRED_COLUMN_ORDER = [
  "Stock #",
  "Stock Number",
  "Model",
  "Year",
  "Category",
  "Length",
  "GVWR",
  "Color",
  "Status",
  "Price",
  "MSRP",
  "Dealer Price",
  "Location",
  "Notes",
];

// Airtable's cellFormat=string flattens multi-attachment fields into
// repeated "filename.ext (https://…)" entries joined by newlines. Detect
// that shape so the table can render real clickable links instead of a
// wall of raw URL text. Returns null when the value doesn't look like
// attachments — caller falls back to plain text rendering.
function parseAttachments(value: unknown): { name: string; url: string }[] | null {
  if (typeof value !== "string") return null;
  const matches: { name: string; url: string }[] = [];
  // Capture each "<name> (<url>)" pair. URL may contain anything except
  // a closing paren since Airtable encodes those.
  const re = /([^\n()]+?)\s*\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    matches.push({ name: m[1].trim(), url: m[2] });
  }
  return matches.length > 0 ? matches : null;
}

function formatCellText(value: any): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        typeof v === "object" && v !== null && "url" in v ? v.url : String(v),
      )
      .join(", ");
  }
  if (typeof value === "object") {
    if ("filename" in value) return String((value as any).filename);
    if ("url" in value) return String((value as any).url);
    return JSON.stringify(value);
  }
  return String(value);
}

export default function DealerInventory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  // Modal state for Reserve Now. Holds the row the dealer clicked plus
  // the form fields. Reset on close so re-opening for a different unit
  // starts clean.
  const [reserveTarget, setReserveTarget] = useState<AirtableRecord | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [reserveNote, setReserveNote] = useState("");
  const sessionId = typeof window !== "undefined" ? localStorage.getItem("dealer_session") : null;

  // Gate behind a dealer session so direct URL hits don't 401-loop.
  useEffect(() => {
    if (!sessionId) setLocation("/dealer/login");
  }, [sessionId, setLocation]);

  const { data, isLoading, error, isFetching } = useQuery<{
    records: AirtableRecord[];
    fieldOrder?: string[];
    cached: boolean;
  }>({
    queryKey: ["/api/dealer/inventory"],
    queryFn: () =>
      apiRequest("/api/dealer/inventory", {
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    enabled: !!sessionId,
    // Inventory doesn't change minute-to-minute; keep the result on screen
    // while the background refresh happens.
    staleTime: 60_000,
  });

  const records = data?.records ?? [];

  // POSTs the unit details to the server which emails the dealer's
  // sales rep (and CCs the dealer). No DB write here — the rep does
  // the actual hold in Airtable on their side.
  const reserveMutation = useMutation({
    mutationFn: async () => {
      if (!reserveTarget) throw new Error("No unit selected");
      return apiRequest("/api/dealer/inventory/reserve", {
        method: "POST",
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
        body: {
          recordId: reserveTarget.id,
          fields: reserveTarget.fields,
          customerName: customerName.trim() || null,
          note: reserveNote.trim() || null,
        },
      });
    },
    onSuccess: (resp: any) => {
      toast({
        title: "Reservation request sent",
        description: `Your rep (${resp?.repEmail || "Walton"}) will reach out shortly.`,
      });
      setReserveTarget(null);
      setCustomerName("");
      setReserveNote("");
    },
    onError: (err: any) =>
      toast({ title: "Couldn't send request", description: err?.message, variant: "destructive" }),
  });

  // Server-provided fieldOrder reflects the AIRTABLE_INVENTORY_FIELDS
  // env var verbatim, so the admin picks the column layout in Vercel
  // and we honor it absolutely. Fall back to the legacy preferred-then-
  // alphabetical heuristic only when the server didn't ship an order
  // (i.e. env var unset).
  const columns = useMemo(() => {
    if (data?.fieldOrder && data.fieldOrder.length > 0) return data.fieldOrder;
    const seen = new Set<string>();
    for (const r of records) {
      for (const k of Object.keys(r.fields || {})) seen.add(k);
    }
    const ordered: string[] = [];
    for (const c of PREFERRED_COLUMN_ORDER) {
      if (seen.has(c)) {
        ordered.push(c);
        seen.delete(c);
      }
    }
    const remaining = Array.from(seen).sort((a, b) => a.localeCompare(b));
    return [...ordered, ...remaining];
  }, [records, data?.fieldOrder]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      Object.values(r.fields || {}).some((v) => formatCellText(v).toLowerCase().includes(q)),
    );
  }, [records, search]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/dealer/dashboard">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="w-7 h-7 text-gray-400" /> Inventory
          </h1>
          <p className="text-gray-600 mt-1">
            Trailers currently available from Walton. Updates roughly every minute.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/dealer/inventory"] })}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>{records.length} item{records.length === 1 ? "" : "s"}</CardTitle>
              <CardDescription>Click a row to copy its stock number.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search any field…"
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-12 text-gray-500">Loading inventory…</p>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-2">Couldn't load inventory.</p>
              <p className="text-sm text-gray-600">{(error as any)?.message}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {records.length === 0
                  ? "No inventory available right now."
                  : `No items match "${search}".`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((c) => (
                      <TableHead key={c} className="whitespace-nowrap">{c}</TableHead>
                    ))}
                    <TableHead className="whitespace-nowrap text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        // Pick the first plausible "stock number" field, else
                        // the record id, and drop it on the clipboard. Quiet
                        // helper — no toast on every click.
                        const stock = r.fields["Stock #"] ?? r.fields["Stock Number"] ?? r.id;
                        navigator.clipboard?.writeText(String(stock)).catch(() => {});
                      }}
                    >
                      {columns.map((c) => {
                        const raw = r.fields[c];
                        const attachments = parseAttachments(raw);
                        return (
                          <TableCell key={c} className="align-top">
                            {attachments ? (
                              <div className="flex flex-col gap-1">
                                {attachments.map((a, i) => (
                                  <a
                                    key={i}
                                    href={a.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all"
                                  >
                                    {a.name}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              formatCellText(raw)
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="align-top text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReserveTarget(r);
                            setCustomerName("");
                            setReserveNote("");
                          }}
                        >
                          <BookmarkPlus className="w-4 h-4 mr-1.5" /> Reserve Now
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reserve Now modal. Captures optional customer name + free-text
          note, then POSTs the whole row (stock, model, etc.) to the
          server so the rep gets an email with everything they need to
          hold the unit. No DB write — the rep does the actual hold in
          Airtable / their workflow once they see the email. */}
      <Dialog open={reserveTarget !== null} onOpenChange={(o) => !o && setReserveTarget(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Reserve this unit</DialogTitle>
            <DialogDescription>
              We'll email your Walton rep with the unit details + anything you
              add below. They'll reach out to confirm the hold.
            </DialogDescription>
          </DialogHeader>

          {reserveTarget && (
            <div className="rounded-md border bg-gray-50 p-3 text-sm space-y-1">
              {(() => {
                // Show a compact summary of the picked row so the dealer
                // can sanity-check before sending. Falls back gracefully
                // when the table doesn't have these specific fields.
                const f = reserveTarget.fields;
                const stock = f["Stock #"] ?? f["Stock Number"];
                const model = f["Model"] ?? f["Trailer"];
                const year = f["Year"];
                return (
                  <>
                    {stock && (
                      <p>
                        <span className="text-gray-500">Stock #:</span>{" "}
                        <span className="font-medium">{String(stock)}</span>
                      </p>
                    )}
                    {model && (
                      <p>
                        <span className="text-gray-500">Model:</span>{" "}
                        <span className="font-medium">{String(model)}</span>
                        {year ? <span className="text-gray-600"> · {String(year)}</span> : null}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="customerName">Customer name (optional)</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Who is this for?"
              />
            </div>
            <div>
              <Label htmlFor="reserveNote">Note to your rep (optional)</Label>
              <Textarea
                id="reserveNote"
                value={reserveNote}
                onChange={(e) => setReserveNote(e.target.value)}
                placeholder="Delivery timing, special requests, etc."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReserveTarget(null)} disabled={reserveMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => reserveMutation.mutate()} disabled={reserveMutation.isPending}>
              {reserveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><BookmarkPlus className="w-4 h-4 mr-2" /> Send Reserve Request</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
