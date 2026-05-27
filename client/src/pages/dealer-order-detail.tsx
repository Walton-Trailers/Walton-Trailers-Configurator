import { useEffect } from "react";
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

  // Render selected options as a flat list. Shape varies (numeric ids,
  // booleans, strings) so we coerce defensively.
  const optionsList = order.selectedOptions
    ? Object.entries(order.selectedOptions).filter(([, v]) => v != null && v !== false && v !== "")
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
          <p className="text-sm text-gray-600 mt-1 font-mono">Internal ref: {order.orderNumber}</p>
          {order.poNumber && (
            <p className="text-sm text-gray-600">PO: {order.poNumber}</p>
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

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Documents
            </CardTitle>
            <CardDescription>
              Files your Walton rep has attached to this order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <DocumentRow
              label="Work order"
              url={order.workOrderUrl}
              uploadedAt={order.workOrderUploadedAt}
              fmtDate={fmtDate}
            />
            <DocumentRow
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
        {optionsList.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" /> Selected options
              </CardTitle>
              <CardDescription>What you configured when this order was built.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                {optionsList.map(([key, value]) => (
                  <li key={key} className="flex justify-between gap-4 border-b py-1 last:border-b-0">
                    <span className="text-gray-600">{key}</span>
                    <span className="text-gray-900 text-right truncate">
                      {String(value === true ? "Yes" : value)}
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

function DocumentRow({
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
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-400 italic text-xs">Not yet attached</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0 gap-3">
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
          View <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <a href={url} download className="text-gray-600 hover:text-gray-900" title="Download">
          <Download className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
