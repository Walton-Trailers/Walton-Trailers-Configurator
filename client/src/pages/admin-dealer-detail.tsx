import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Building2, Mail, Phone, MapPin, User, Package, DollarSign, Calendar, Users, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminOrderManageDialog } from "@/components/admin-order-manage-dialog";
import { format } from "date-fns";

// Mirrors the Dealer shape on admin-dealers.tsx. Kept local to avoid coupling
// the two pages — if the dealer schema grows, both pages get updated together.
interface Dealer {
  id: number;
  dealerId: string;
  dealerName: string;
  contactName: string;
  email: string;
  phone: string;
  territory: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  isActive: boolean;
  pricingTier: string;
  salesRepName: string | null;
  salesRepEmail: string | null;
  parentDealerId: number | null;
  establishedYear: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DealerUserRow {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  title: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

// Order row matches what /api/admin/dealers/:id/orders returns — same shape
// as /api/admin/configurations so AdminOrderManageDialog reads it directly.
interface OrderRow {
  id: number;
  dealerName: string | null;
  customerName: string | null;
  categoryName: string;
  modelName: string;
  totalPrice: number;
  status: string;
  orderNumber: string;
  repOrderNumber: string | null;
  poNumber: string | null;
  submittedAt: string | null;
  deletedAt: string | null;
  workOrderUrl: string | null;
  createdAt: string;
}

interface PricingTierOption {
  slug: string;
  displayName: string;
  discountPct: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-800",
  received: "bg-amber-100 text-amber-800",
  processing: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
};

const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function AdminDealerDetail() {
  const [, params] = useRoute<{ id: string }>("/admin/dealers/:id");
  const dealerId = params ? parseInt(params.id, 10) : NaN;

  const [orderInDialog, setOrderInDialog] = useState<any | null>(null);

  const { data: dealer, isLoading: dealerLoading, error: dealerError } = useQuery<Dealer>({
    queryKey: [`/api/admin/dealers/${dealerId}`],
    enabled: !Number.isNaN(dealerId),
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderRow[]>({
    queryKey: [`/api/admin/dealers/${dealerId}/orders`],
    enabled: !Number.isNaN(dealerId),
  });

  const { data: users = [] } = useQuery<DealerUserRow[]>({
    queryKey: [`/api/admin/dealers/${dealerId}/users`],
    enabled: !Number.isNaN(dealerId),
  });

  // For showing parent + locations: fetch the full dealer list, then filter
  // locally. Cheaper than two more dedicated endpoints.
  const { data: allDealers = [] } = useQuery<Dealer[]>({
    queryKey: ["/api/admin/dealers"],
  });

  const { data: tiers = [] } = useQuery<PricingTierOption[]>({
    queryKey: ["/api/pricing-tiers"],
  });
  const currentTier = dealer ? tiers.find((t) => t.slug === dealer.pricingTier) : undefined;

  const parent = dealer?.parentDealerId
    ? allDealers.find((d) => d.id === dealer.parentDealerId)
    : null;
  const childLocations = dealer
    ? allDealers.filter((d) => d.parentDealerId === dealer.id)
    : [];

  // Stats: ignore soft-deleted orders so the numbers match what the dealer
  // actually owes / has bought. Submitted+received+processing+completed all
  // count toward revenue; drafts don't (no firm commitment yet).
  const activeOrders = orders.filter((o) => !o.deletedAt);
  const revenue = activeOrders
    .filter((o) => o.status !== "draft")
    .reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  if (Number.isNaN(dealerId)) {
    return (
      <div className="p-8">
        <p className="text-red-600">Invalid dealer id in URL.</p>
      </div>
    );
  }

  if (dealerLoading) {
    return <p className="p-8 text-gray-500">Loading dealer…</p>;
  }

  if (dealerError || !dealer) {
    return (
      <div className="p-8">
        <Link href="/admin/dealers">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dealers
          </Button>
        </Link>
        <p className="text-red-600">Dealer not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/admin/dealers">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dealers
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{dealer.dealerName}</h1>
            {dealer.isActive ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
            ) : (
              <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">Archived</Badge>
            )}
          </div>
          <p className="font-mono text-gray-600">{dealer.dealerId}</p>
          {parent && (
            <p className="text-sm text-gray-500 mt-1">
              Location of{" "}
              <Link href={`/admin/dealers/${parent.id}`}>
                <span className="font-mono text-blue-600 hover:underline cursor-pointer">
                  {parent.dealerId}
                </span>
              </Link>{" "}
              · {parent.dealerName}
            </p>
          )}
        </div>
        <Link href={`/admin/dealers?edit=${dealer.id}`}>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeOrders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(revenue)}</p>
            <p className="text-xs text-gray-500 mt-1">Excludes drafts and deleted orders.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Portal Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-xs text-gray-500 mt-1">
              {users.filter((u) => u.isActive).length} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Primary contact
              </p>
              <p className="font-medium">{dealer.contactName || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </p>
              <p className="font-medium break-all">{dealer.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </p>
              <p className="font-medium">{dealer.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Address
              </p>
              <p className="font-medium">
                {[dealer.address, [dealer.city, dealer.state].filter(Boolean).join(", "), dealer.zipCode]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Territory</p>
              <p className="font-medium">{dealer.territory || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Year joined
              </p>
              <p className="font-medium">{dealer.establishedYear || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Pricing tier</p>
              <p className="font-medium">
                {currentTier ? `${currentTier.displayName} (${currentTier.discountPct}% off MSRP)` : dealer.pricingTier}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Sales rep</p>
              <p className="font-medium">
                {dealer.salesRepName || "—"}
                {dealer.salesRepEmail && (
                  <span className="text-gray-500"> · {dealer.salesRepEmail}</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-locations */}
      {childLocations.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              {childLocations.length} additional location{childLocations.length === 1 ? "" : "s"} under this dealer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dealer ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City / State</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {childLocations.map((loc) => (
                  <TableRow key={loc.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <Link href={`/admin/dealers/${loc.id}`}>
                        <span className="font-mono text-blue-600 hover:underline">{loc.dealerId}</span>
                      </Link>
                    </TableCell>
                    <TableCell>{loc.dealerName}</TableCell>
                    <TableCell>
                      {[loc.city, loc.state].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      {loc.isActive ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">Archived</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Portal users */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Portal Users</CardTitle>
          <CardDescription>Employees with their own login under this dealer.</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-gray-500">No additional portal users.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm text-gray-600">{u.title || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {u.lastLogin ? format(new Date(u.lastLogin), "MMM d, yyyy") : "Never"}
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">Disabled</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>
            Click an order to manage status, attach a work order, or edit notes.
            Deleted orders (dealer-side soft delete) are shown muted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <p className="text-sm text-gray-500">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-500">This dealer hasn't placed any orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Trailer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow
                    key={o.id}
                    onClick={() => setOrderInDialog(o)}
                    className={`cursor-pointer hover:bg-gray-50 ${o.deletedAt ? "opacity-50" : ""}`}
                  >
                    <TableCell className="font-mono text-sm">
                      {o.repOrderNumber || o.orderNumber}
                      {o.poNumber && (
                        <p className="text-xs text-gray-500">PO {o.poNumber}</p>
                      )}
                    </TableCell>
                    <TableCell>{o.customerName || <span className="text-gray-400">—</span>}</TableCell>
                    <TableCell>
                      <p>{o.modelName}</p>
                      <p className="text-xs text-gray-500">{o.categoryName}</p>
                    </TableCell>
                    <TableCell className="font-medium">{formatPrice(o.totalPrice)}</TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_STYLES[o.status] || "bg-gray-100 text-gray-700"} capitalize hover:opacity-100`}>
                        {o.status}
                      </Badge>
                      {o.deletedAt && <p className="text-xs text-red-600 mt-1">deleted by dealer</p>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {o.submittedAt
                        ? format(new Date(o.submittedAt), "MMM d, yyyy")
                        : <span className="text-gray-400">draft</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Existing rep-side order manage dialog. Reused so admins get the same
          status / Walton# / work-order PDF flow as on the Configurations page. */}
      <AdminOrderManageDialog
        open={orderInDialog !== null}
        onOpenChange={(open) => !open && setOrderInDialog(null)}
        order={orderInDialog}
      />
    </div>
  );
}
