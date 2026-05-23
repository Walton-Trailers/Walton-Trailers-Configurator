import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";

interface PricingTier {
  id: number;
  slug: string;
  displayName: string;
  discountPct: number;
  displayOrder: number;
}

interface Dealer {
  id: number;
  pricingTier: string;
}

export default function AdminPricingTiers() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editing, setEditing] = useState<PricingTier | null>(null);
  const [form, setForm] = useState({
    slug: "",
    displayName: "",
    discountPct: "0",
    displayOrder: "0",
  });

  const { data: tiers = [], isLoading } = useQuery<PricingTier[]>({
    queryKey: ["/api/pricing-tiers"],
  });

  // Dealer counts per tier — admin uses this to know which tiers are in use
  // before considering deletion.
  const { data: dealers = [] } = useQuery<Dealer[]>({
    queryKey: ["/api/admin/dealers"],
  });
  const dealersOnTier = (slug: string) => dealers.filter((d) => d.pricingTier === slug).length;

  const resetForm = () =>
    setForm({ slug: "", displayName: "", discountPct: "0", displayOrder: "0" });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) =>
      apiRequest("/api/admin/pricing-tiers", {
        method: "POST",
        body: {
          slug: data.slug,
          displayName: data.displayName,
          discountPct: Number(data.discountPct),
          displayOrder: Number(data.displayOrder),
        },
      }),
    onSuccess: () => {
      toast({ title: "Tier created" });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-tiers"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) =>
      toast({ title: "Couldn't create tier", description: err?.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof form }) =>
      apiRequest(`/api/admin/pricing-tiers/${id}`, {
        method: "PATCH",
        body: {
          displayName: data.displayName,
          discountPct: Number(data.discountPct),
          displayOrder: Number(data.displayOrder),
        },
      }),
    onSuccess: () => {
      toast({ title: "Tier updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-tiers"] });
      setEditing(null);
      resetForm();
    },
    onError: (err: any) =>
      toast({ title: "Couldn't update tier", description: err?.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest(`/api/admin/pricing-tiers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Tier deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing-tiers"] });
    },
    onError: (err: any) =>
      toast({
        title: "Couldn't delete tier",
        // Server returns a friendly message when dealers still reference it.
        description: err?.message,
        variant: "destructive",
      }),
  });

  const startEdit = (t: PricingTier) => {
    setEditing(t);
    setForm({
      slug: t.slug,
      displayName: t.displayName,
      discountPct: String(t.discountPct),
      displayOrder: String(t.displayOrder),
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Pricing Tiers</h1>
            <p className="text-gray-600 mt-2">
              Dealer discount tiers off MSRP. Each dealer is assigned a tier on their account.
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Tier
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-500 py-4">Loading…</p>
          ) : tiers.length === 0 ? (
            <p className="text-gray-500 py-4">No tiers yet. Click "Add Tier" to create one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Dealers on tier</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.displayOrder}</TableCell>
                    <TableCell className="font-medium">{t.displayName}</TableCell>
                    <TableCell className="text-sm text-gray-500 font-mono">{t.slug}</TableCell>
                    <TableCell>{t.discountPct}% off MSRP</TableCell>
                    <TableCell>{dealersOnTier(t.slug)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const count = dealersOnTier(t.slug);
                          const msg =
                            count > 0
                              ? `${count} dealer${count === 1 ? '' : 's'} are on "${t.displayName}". Reassign them first.`
                              : `Delete tier "${t.displayName}"? This cannot be undone.`;
                          if (count > 0) {
                            toast({ title: "Can't delete", description: msg, variant: "destructive" });
                            return;
                          }
                          if (window.confirm(msg)) deleteMutation.mutate(t.id);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Tier Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Pricing Tier</DialogTitle>
            <DialogDescription>
              New tiers can be assigned to dealers on the Dealer Management page.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="diamond"
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase, no spaces. Used internally.</p>
              </div>
              <div>
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Diamond"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountPct">Discount % *</Label>
                <Input
                  id="discountPct"
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPct}
                  onChange={(e) => setForm({ ...form, discountPct: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first.</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tier Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Pricing Tier</DialogTitle>
            <DialogDescription>
              Changing the discount % affects every dealer on this tier immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Slug</Label>
                <Input value={form.slug} disabled className="bg-gray-50" />
                <p className="text-xs text-gray-500 mt-1">Slug isn't editable.</p>
              </div>
              <div>
                <Label htmlFor="edit-displayName">Display Name *</Label>
                <Input
                  id="edit-displayName"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-discountPct">Discount % *</Label>
                <Input
                  id="edit-discountPct"
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPct}
                  onChange={(e) => setForm({ ...form, discountPct: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-displayOrder">Display Order</Label>
                <Input
                  id="edit-displayOrder"
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                editing && updateMutation.mutate({ id: editing.id, data: form })
              }
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
