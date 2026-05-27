import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  User as UserIcon,
  Loader2,
  Search,
  KeyRound,
  Save,
  Power,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface Employee {
  id: number;
  username?: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface DealerSlim {
  id: number;
  dealerId: string;
  dealerName: string;
  state: string | null;
  isActive: boolean;
}

export default function AdminEmployeeDetail() {
  const [, params] = useRoute<{ id: string }>("/admin/employees/:id");
  const employeeId = params ? parseInt(params.id, 10) : NaN;
  const { toast } = useToast();
  const { user: currentUser } = useAdminAuth();
  const isSelf = currentUser?.id === employeeId;

  const { data: employee, isLoading, error } = useQuery<Employee>({
    queryKey: [`/api/admin/users/${employeeId}`],
    enabled: !Number.isNaN(employeeId),
  });

  if (Number.isNaN(employeeId)) {
    return <div className="p-8 text-red-600">Invalid employee id in URL.</div>;
  }

  if (isLoading) return <p className="p-8 text-gray-500">Loading employee…</p>;

  if (error || !employee) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <BackLink />
        <p className="text-red-600">Employee not found.</p>
      </div>
    );
  }

  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.email;
  const initials =
    (employee.firstName?.[0] || "") + (employee.lastName?.[0] || "") ||
    employee.email[0]?.toUpperCase() ||
    "?";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <BackLink />

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-brand-tan/30 text-brand-tan flex items-center justify-center font-semibold text-2xl flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold">{fullName}</h1>
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
            {employee.isActive ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
            ) : (
              <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">Disabled</Badge>
            )}
            {isSelf && <Badge variant="outline">You</Badge>}
          </div>
          <p className="text-gray-600 mt-1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> {employee.email}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Last login:{" "}
            {employee.lastLogin ? format(new Date(employee.lastLogin), "MMM d, yyyy 'at' h:mm a") : "Never"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProfileCard employee={employee} isSelf={isSelf} />
        <PasswordCard employee={employee} />
        <StatusCard employee={employee} isSelf={isSelf} />
        <DealerAssignmentsCard employee={employee} />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin">
      <Button variant="ghost" size="sm" className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
    </Link>
  );
}

function ProfileCard({ employee, isSelf }: { employee: Employee; isSelf: boolean }) {
  const { toast } = useToast();
  const { user: currentUser } = useAdminAuth();
  const canPromote = currentUser?.role === "admin";

  // Local edit state seeded from server, only sent when the admin clicks Save
  // so they can revert by navigating away.
  const [form, setForm] = useState({
    firstName: employee.firstName ?? "",
    lastName: employee.lastName ?? "",
    email: employee.email,
    role: employee.role,
  });

  // Re-seed if the employee record refetches (e.g. after another mutation).
  useEffect(() => {
    setForm({
      firstName: employee.firstName ?? "",
      lastName: employee.lastName ?? "",
      email: employee.email,
      role: employee.role,
    });
  }, [employee.id, employee.firstName, employee.lastName, employee.email, employee.role]);

  const mutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/admin/users/${employee.id}`, {
        method: "PATCH",
        body: form,
      }),
    onSuccess: () => {
      toast({ title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${employee.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) =>
      toast({ title: "Update failed", description: err?.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Name, email, and role.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">Used as the login.</p>
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            disabled={!canPromote || isSelf}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:bg-gray-100"
          >
            <option value="standard">Standard</option>
            <option value="admin">Admin</option>
          </select>
          {!canPromote && (
            <p className="text-xs text-gray-500 mt-1">Only admins can change roles.</p>
          )}
          {isSelf && (
            <p className="text-xs text-gray-500 mt-1">You can't change your own role.</p>
          )}
        </div>
        <div className="pt-2">
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save profile</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PasswordCard({ employee }: { employee: Employee }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/admin/users/${employee.id}`, {
        method: "PATCH",
        body: { password },
      }),
    onSuccess: () => {
      toast({ title: "Password changed" });
      setPassword("");
    },
    onError: (err: any) =>
      toast({ title: "Password change failed", description: err?.message, variant: "destructive" }),
  });

  const tooShort = password.length > 0 && password.length < 8;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Set a new password for this user. Pick something they'll know — they can
          change it themselves after first login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          {tooShort && <p className="text-xs text-red-600 mt-1">Password must be at least 8 characters.</p>}
        </div>
        <div className="pt-1">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || password.length < 8}
            variant="outline"
          >
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</>
            ) : (
              <><KeyRound className="w-4 h-4 mr-2" /> Set password</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusCard({ employee, isSelf }: { employee: Employee; isSelf: boolean }) {
  const { toast } = useToast();

  // PATCH handles both directions; the legacy DELETE-as-deactivate path is
  // skipped so reactivation goes through the same mutation.
  const mutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/admin/users/${employee.id}`, {
        method: "PATCH",
        body: { isActive: !employee.isActive },
      }),
    onSuccess: () => {
      toast({
        title: employee.isActive ? "Account disabled" : "Account enabled",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${employee.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (err: any) =>
      toast({ title: "Status change failed", description: err?.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account status</CardTitle>
        <CardDescription>
          Disabling an account immediately blocks login but preserves the user
          record and any dealer assignments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || isSelf}
          variant={employee.isActive ? "destructive" : "default"}
        >
          {mutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</>
          ) : employee.isActive ? (
            <><PowerOff className="w-4 h-4 mr-2" /> Disable account</>
          ) : (
            <><Power className="w-4 h-4 mr-2" /> Enable account</>
          )}
        </Button>
        {isSelf && (
          <p className="text-xs text-gray-500 mt-2">You can't disable your own account.</p>
        )}
      </CardContent>
    </Card>
  );
}

function DealerAssignmentsCard({ employee }: { employee: Employee }) {
  const { toast } = useToast();

  const { data: dealers = [] } = useQuery<DealerSlim[]>({
    queryKey: ["/api/admin/dealers"],
  });
  const { data: assigned = [] } = useQuery<number[]>({
    queryKey: [`/api/admin/users/${employee.id}/dealer-assignments`],
  });

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [dirty, setDirty] = useState(false);

  // Re-seed from server until the admin touches the form. Once dirty we keep
  // their pending edits so a background invalidation doesn't clobber them.
  useEffect(() => {
    if (!dirty) setSelected(new Set(assigned));
  }, [assigned, dirty]);

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

  const mutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/admin/users/${employee.id}/dealer-assignments`, {
        method: "PUT",
        body: { dealerIds: Array.from(selected) },
      }),
    onSuccess: () => {
      toast({ title: "Assignments saved" });
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${employee.id}/dealer-assignments`] });
    },
    onError: (err: any) =>
      toast({ title: "Save failed", description: err?.message, variant: "destructive" }),
  });

  const toggle = (id: number) => {
    setDirty(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Admin role doesn't need assignments (they see everything anyway), but we
  // still let admins toggle so the data exists for if/when they're demoted.
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Dealer access</CardTitle>
        <CardDescription>
          {employee.role === "admin"
            ? "Admins already see every dealer. Assignments here are kept for if this user is ever demoted to Standard."
            : "Standard users only see dealers checked below. Saving applies immediately."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by name, ID, or state…"
            className="pl-8"
          />
        </div>

        <div className="border rounded-md max-h-80 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No dealers match the filter.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((d) => {
                const checked = selected.has(d.id);
                // The row is the click target. The Checkbox is presentational
                // here — `pointer-events-none` keeps it from firing its own
                // onCheckedChange, which would cancel the row's toggle by
                // firing the handler twice in a single click.
                return (
                  <li
                    key={d.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                      !d.isActive ? "opacity-60" : ""
                    }`}
                    onClick={() => toggle(d.id)}
                  >
                    <Checkbox checked={checked} className="pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{d.dealerName}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {d.dealerId}{d.state ? ` · ${d.state}` : ""}
                      </p>
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

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {selected.size} selected · {dealers.length} total
          </p>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !dirty}
          >
            {mutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              "Save assignments"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
