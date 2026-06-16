import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute, useLocation } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  FileText,
  Download,
  Package,
  User as UserIcon,
  Hash,
  Truck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

interface DealerOrder {
  id: number;
  dealerId: number;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  categorySlug: string;
  categoryName: string;
  modelId: string;
  modelName: string;
  modelSpecs: any;
  selectedOptions: Record<string, any>;
  basePrice: number;
  optionsPrice: number;
  totalPrice: number;
  status: string;
  poNumber: string | null;
  repOrderNumber: string | null;
  notes: string | null;
  submittedAt: string | null;
  workOrderUrl: string | null;
  workOrderUploadedAt: string | null;
  invoiceUrl: string | null;
  invoiceUploadedAt: string | null;
  expectedDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

// Mirror of the rep-side status colors so dealer + admin views read the same.
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-800",
  received: "bg-amber-100 text-amber-800",
  processing: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  draft: "Still a quote you're iterating on. Submit to send to Walton.",
  submitted: "Sent to Walton. Your rep will assign an order number and pick it up.",
  received: "Walton has received the order and attached a work order PDF.",
  processing: "On the build floor.",
  completed: "Build is finished.",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function DealerOrderDetail() {
  const [, params] = useRoute<{ id: string }>("/dealer/orders/:id");
  const [, setLocation] = useLocation();
  const orderId = params ? parseInt(params.id, 10) : NaN;

  // Gate behind a dealer session so direct URL hits don't leak the
  // generic API error.
  useEffect(() => {
    if (!localStorage.getItem("dealer_session")) {
      setLocation("/dealer/login");
    }
  }, [setLocation]);

  const sessionId = localStorage.getItem("dealer_session");
  const { data: order, isLoading, error } = useQuery<DealerOrder>({
    queryKey: [`/api/dealer/orders/${orderId}`],
    queryFn: () =>
      apiRequest(`/api/dealer/orders/${orderId}`, {
        headers: sessionId ? { Authorization: `Bearer ${sessionId}` } : {},
      }),
    enabled: !Number.isNaN(orderId) && !!sessionId,
  });

  // Pull the full options catalog so we can resolve the option ids stored
  // in selectedOptions into human-readable names + prices. Same source the
  // dealer dashboard uses for its existing options renderer.
  interface OptionRecord {
    id: number;
    name: string;
    category: string;
    price?: number;
  }
  const { data: allOptions = [] } = useQuery<OptionRecord[]>({
    queryKey: ["/api/options/all"],
    enabled: !!sessionId,
    retry: false,
  });
  const optionsById = useMemo(() => {
    const m = new Map<number, OptionRecord>();
    for (const o of allOptions) m.set(o.id, o);
    return m;
  }, [allOptions]);

  if (Number.isNaN(orderId)) {
    return <div className="p-8 text-red-600">Invalid order id.</div>;
  }
  if (isLoading) {
    return <p className="p-8 text-gray-500">Loading order…</p>;
  }
  if (error || !order) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link href="/dealer/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>
        <p className="text-red-600">Order not found.</p>
      </div>
    );
  }

  // Friendly date formatter — handles ISO timestamps and YYYY-MM-DD dates.
  const fmtDate = (val?: string | null, includeTime = false) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    return format(d, includeTime ? "MMM d, yyyy 'at' h:mm a" : "MMM d, yyyy");
  };

  // Resolve selectedOptions into { label, value, price } rows. The stored
  // shape is { category: number | number[] | string } — numbers are option
  // ids, arrays (e.g. extras) are multi-select id lists, strings (length,
  // pulltype) pass through as-is. Numbers we can't resolve (catalog row
  // deleted / archived) fall back to "Option #<id>" rather than the raw
  // number, so the dealer never sees a bare code like "Color: 198".
  type Row = { key: string; label: string; value: string; price?: number };
  const optionsRows: Row[] = order.selectedOptions
    ? Object.entries(order.selectedOptions).flatMap<Row>(([category, value]) => {
        if (value == null || value === false || value === "") return [];
        const prettyCategory = category.replace(/([A-Z])/g, " $1").trim();
        const titleCategory = prettyCategory.charAt(0).toUpperCase() + prettyCategory.slice(1);

        // Multi-select (extras / addons).
        if (Array.isArray(value)) {
          const resolved = value
            .map((id: any) => {
              if (typeof id !== "number") return { name: String(id), price: undefined };
              const o = optionsById.get(id);
              return o ? { name: o.name, price: o.price } : { name: `Option #${id}`, price: undefined };
            });
          if (resolved.length === 0) return [];
          return resolved.map((r, i) => ({
            key: `${category}-${i}`,
            label: i === 0 ? titleCategory : "",
            value: r.name,
            price: r.price,
          }));
        }

        // Single-select option id.
        if (typeof value === "number") {
          const o = optionsById.get(value);
          return [{
            key: category,
            label: titleCategory,
            value: o?.name ?? `Option #${value}`,
            price: o?.price,
          }];
        }

        // Plain string (length, pulltype, etc.).
        return [{
          key: category,
          label: titleCategory,
          value: String(value === true ? "Yes" : value),
        }];
      })
    : [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/dealer/dashboard">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Hash className="w-7 h-7 text-gray-400" />
            {order.repOrderNumber || (
              <span className="text-gray-400 italic font-normal">Pending Walton order #</span>
            )}
          </h1>
          {order.poNumber && (
            <p className="text-sm text-gray-600 mt-1">PO: {order.poNumber}</p>
          )}
          {(order as any).dealerSignature && (
            <p className="text-sm text-gray-600 mt-1">
              Signed by: <span className="italic">{(order as any).dealerSignature}</span>
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge className={`${STATUS_STYLES[order.status] || "bg-gray-100 text-gray-700"} capitalize text-sm px-3 py-1`}>
            {order.status}
          </Badge>
          <p className="text-xs text-gray-500 max-w-xs text-right">
            {STATUS_DESCRIPTIONS[order.status]}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Key dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" /> Key dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DateRow label="Order created" value={fmtDate(order.createdAt)} />
            <DateRow
              label="Submitted to Walton"
              value={fmtDate(order.submittedAt)}
              missing="Not yet submitted"
            />
            <DateRow
              label="Expected delivery"
              value={fmtDate(order.expectedDeliveryDate)}
              missing="Your rep will set this once your build is scheduled"
              icon={<CalendarCheck className="w-4 h-4 text-green-600" />}
            />
            <DateRow label="Last updated" value={fmtDate(order.updatedAt, true)} />
          </CardContent>
        </Card>

        {/* Documents — span both columns so the embedded PDF previews have
            room to breathe. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Documents
            </CardTitle>
            <CardDescription>
              Files your Walton rep has attached to this order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DocumentBlock
              label="Work order"
              url={order.workOrderUrl}
              uploadedAt={order.workOrderUploadedAt}
              fmtDate={fmtDate}
            />
            <DocumentBlock
              label="Invoice"
              url={order.invoiceUrl}
              uploadedAt={order.invoiceUploadedAt}
              fmtDate={fmtDate}
            />
          </CardContent>
        </Card>

        {/* Trailer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" /> Trailer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold text-base">{order.modelName}</p>
            <p className="text-gray-600">{order.categoryName}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
              <span className="text-gray-500">Base price</span>
              <span className="text-right">{formatCurrency(order.basePrice)}</span>
              <span className="text-gray-500">Options</span>
              <span className="text-right">{formatCurrency(order.optionsPrice)}</span>
              <span className="text-gray-700 font-semibold border-t pt-1">Total</span>
              <span className="text-right font-semibold border-t pt-1">
                {formatCurrency(order.totalPrice)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" /> Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {order.customerName ? (
              <>
                <p className="font-medium">{order.customerName}</p>
                {order.customerEmail && (
                  <p className="text-gray-600 break-all">{order.customerEmail}</p>
                )}
                {order.customerPhone && (
                  <p className="text-gray-600">{order.customerPhone}</p>
                )}
              </>
            ) : (
              <p className="text-gray-500 italic">No customer info on this order.</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{order.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Selected options */}
        {optionsRows.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" /> Selected options
              </CardTitle>
              <CardDescription>What you configured when this order was built.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y text-sm">
                {optionsRows.map((row) => (
                  <li
                    key={row.key}
                    className="grid grid-cols-[10rem,1fr,auto] gap-4 py-1.5 items-baseline"
                  >
                    <span className="text-gray-600">{row.label}</span>
                    <span className="text-gray-900">{row.value}</span>
                    <span className="text-gray-500 tabular-nums text-right">
                      {row.price ? formatCurrency(row.price) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function DateRow({
  label,
  value,
  missing,
  icon,
}: {
  label: string;
  value: string | null;
  missing?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-gray-600 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={value ? "text-gray-900" : "text-gray-400 italic text-right text-xs max-w-[14rem]"}>
        {value || missing || "—"}
      </span>
    </div>
  );
}

function DocumentBlock({
  label,
  url,
  uploadedAt,
  fmtDate,
}: {
  label: string;
  url: string | null;
  uploadedAt: string | null;
  fmtDate: (v?: string | null, t?: boolean) => string | null;
}) {
  if (!url) {
    return (
      <div className="flex items-center justify-between py-2 border-b last:border-b-0">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-400 italic text-xs">Not yet attached</span>
      </div>
    );
  }
  return (
    <div className="border rounded-md overflow-hidden last:mb-0">
      {/* Header strip: file label + upload date on the left, action
          buttons on the right. Sits above the embedded preview. */}
      <div className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 border-b">
        <div className="min-w-0">
          <p className="font-medium">{label}</p>
          {uploadedAt && (
            <p className="text-xs text-gray-500">Attached {fmtDate(uploadedAt)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
          >
            Open in new tab <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href={url}
            download
            className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 border rounded px-2 py-1 bg-white"
            title="Download"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        </div>
      </div>
      {/* Native browser PDF viewer. 720px tall is roughly a US-letter
          page at the typical portal width without forcing extra scroll
          inside the iframe. Most modern browsers render Vercel Blob
          public PDFs inline via their built-in viewer. */}
      <iframe
        src={url}
        title={label}
        className="block w-full bg-gray-100"
        style={{ height: 720, border: 0 }}
      />
    </div>
  );
}
