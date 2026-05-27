import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Mail, Search, ShieldCheck, User as UserIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Walton internal staff (admin_users). Distinct from dealers and dealer-users.
interface Employee {
  id: number;
  username?: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
}

interface DealerSlim {
  id: number;
  dealerId: string;
  dealerName: string;
  state: string | null;
  isActive: boolean;
}

export default function AdminEmployees() {
  const { toast } = useToast();
  const { data: employees = [], isLoading } = useQuery<Employee[]>({
    queryKey: ["/api/admin/users"],
  });

  const [managing, setManaging] = useState<Employee | null>(null);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/admin">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Employees</h1>
        <p className="text-gray-600 mt-2">
          Walton staff with admin portal access. Assign dealer accounts so each
          account manager has a focused list to work from. (Assignments are
          informational for now — they don't restrict what employees can see.)
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading employees…</p>
      ) : employees.length === 0 ? (
        <p className="text-gray-500">No employees found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.map((e) => (
            <EmployeeCard key={e.id} employee={e} onManage={() => setManaging(e)} />
          ))}
        </div>
      )}

      <AssignmentsDialog
        employee={managing}
        onClose={() => setManaging(null)}
        onSaved={() => {
          toast({ title: "Assignments saved" });
          setManaging(null);
        }}
      />
    </div>
  );
}

function EmployeeCard({ employee, onManage }: { employee: Employee; onManage: () => void }) {
  // Per-card assignment count so admins can see at a glance who covers what.
  // Fetched lazily per card (low total cardinality — Walton has a small team).
  const { data: assignedIds = [] } = useQuery<number[]>({
    queryKey: [`/api/admin/users/${employee.id}/dealer-assignments`],
  });

  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.email;
  const initials =
    (employee.firstName?.[0] || "") + (employee.lastName?.[0] || "") ||
    employee.email[0]?.toUpperCase() ||
    "?";

  return (
    <Card className={!employee.isActive ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-tan/30 text-brand-tan flex items-center justify-center font-semibold text-lg flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">{fullName}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {employee.role === "admin" ? (
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                  <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                </Badge>
              ) : (
                <Badge variant="outline">
                  <UserIcon className="w-3 h-3 mr-1" /> Standard
                </Badge>
              )}
              {!employee.isActive && (
                <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">Disabled</Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-600 flex items-center gap-1 mb-3 break-all">
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          {employee.email}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm">
            <span className="font-semibold">{assignedIds.length}</span>{" "}
            <span className="text-gray-600">assigned dealer{assignedIds.length === 1 ? "" : "s"}</span>
          </p>
          <Button size="sm" variant="outline" onClick={onManage}>
            Manage access
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AssignmentsDialog({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const open = employee !== null;
  const { data: dealers = [] } = useQuery<DealerSlim[]>({
    queryKey: ["/api/admin/dealers"],
    enabled: open,
  });
  const { data: assigned = [] } = useQuery<number[]>({
    queryKey: employee ? [`/api/admin/users/${employee.id}/dealer-assignments`] : ["assignments-disabled"],
    enabled: open && employee !== null,
  });

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  // Re-seed selection from the server response whenever the dialog opens or
  // the assigned list arrives. Local state lets the admin toggle multiple
  // checkboxes before saving.
  useEffect(() => {
    if (open) setSelected(new Set(assigned));
  }, [open, assigned]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...dealers].sort((a, b) => a.dealerName.localeCompare(b.dealerName));
    if (!q) return sorted;
    return sorted.filter(
      (d) =>
        d.dealerName.toLowerCase().includes(q) ||
        d.dealerId.toLowerCase().includes(q) ||
        (d.state || "").toLowerCase().includes(q),
    );
  }, [dealers, search]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!employee) throw new Error("No employee selected");
      return apiRequest(`/api/admin/users/${employee.id}/dealer-assignments`, {
        method: "PUT",
        body: { dealerIds: Array.from(selected) },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${employee?.id}/dealer-assignments`] });
      onSaved();
    },
  });

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Dealer access for {employee?.firstName} {employee?.lastName}
          </DialogTitle>
          <DialogDescription>
            Check the dealer accounts this employee should be responsible for.
            Saved immediately; you can change it any time.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, ID, or state…"
            className="pl-8"
          />
        </div>

        <div className="flex-1 overflow-y-auto border rounded-md">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No dealers match the filter.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((d) => {
                const checked = selected.has(d.id);
                return (
                  <li
                    key={d.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                      !d.isActive ? "opacity-60" : ""
                    }`}
                    onClick={() => toggle(d.id)}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(d.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{d.dealerName}</p>
                      <p className="text-xs text-gray-500 font-mono">{d.dealerId}{d.state ? ` · ${d.state}` : ""}</p>
                    </div>
                    {!d.isActive && (
                      <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">Archived</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="text-xs text-gray-500">
          {selected.size} selected · {dealers.length} total
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              "Save Assignments"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
