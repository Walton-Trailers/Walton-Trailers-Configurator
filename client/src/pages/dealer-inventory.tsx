import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Search, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// Heuristic for which columns to surface first. Anything else still
// renders, just after these. Sorted alphabetically as a fallback so the
// view is stable across reloads.
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

function formatCell(value: any): string {
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        typeof v === "object" && v !== null && "url" in v ? v.url : String(v),
      )
      .join(", ");
  }
  if (typeof value === "object") {
    // Airtable attachment object → just show the filename.
    if ("filename" in value) return String((value as any).filename);
    if ("url" in value) return String((value as any).url);
    return JSON.stringify(value);
  }
  return String(value);
}

export default function DealerInventory() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const sessionId = typeof window !== "undefined" ? localStorage.getItem("dealer_session") : null;

  // Gate behind a dealer session so direct URL hits don't 401-loop.
  useEffect(() => {
    if (!sessionId) setLocation("/dealer/login");
  }, [sessionId, setLocation]);

  const { data, isLoading, error, isFetching } = useQuery<{ records: AirtableRecord[]; cached: boolean }>({
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

  // Compute the union of field keys across all records so the table
  // header reflects everything Walton has in Airtable, not just what
  // happened to be on the first row. Reorder so preferred columns lead.
  const columns = useMemo(() => {
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
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      Object.values(r.fields || {}).some((v) => formatCell(v).toLowerCase().includes(q)),
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
                      {columns.map((c) => (
                        <TableCell key={c} className="align-top">
                          {formatCell(r.fields[c])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
