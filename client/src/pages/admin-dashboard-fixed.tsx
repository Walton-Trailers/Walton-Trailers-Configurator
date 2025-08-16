import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { LogOut, Users, Settings, Plus, DollarSign, Edit, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "standard"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function AdminDashboard() {
  // All hooks must be called in the same order every render
  const { user, logout, isLoading } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editData, setEditData] = useState<Partial<AdminUser>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Always call useForm hook
  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "standard",
      password: "",
    },
  });

  // Always get sessionId
  const sessionId = localStorage.getItem("admin_session");

  // Always call useQuery hooks - use enabled to control execution
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () =>
      apiRequest("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    enabled: !!user && user.role === "admin" && !!sessionId,
  });

  // Always call useMutation hooks
  const createUserMutation = useMutation({
    mutationFn: (userData: CreateUserForm) =>
      apiRequest("/api/admin/users", {
        method: "POST",
        body: userData,
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowCreateUser(false);
      toast({
        title: "Success",
        description: "User created successfully",
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: (userId: number) =>
      apiRequest(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<AdminUser> & { id: number }) =>
      apiRequest(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
        },
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setEditingUser(null);
      setEditData({});
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Effect for redirection
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/admin/login");
    }
  }, [isLoading, user, setLocation]);

  // Handler functions
  const handleLogout = async () => {
    await logout();
    setLocation("/admin/login");
  };

  const onCreateUser = async (data: CreateUserForm) => {
    createUserMutation.mutate(data);
  };

  const handleDeactivateUser = (userId: number) => {
    if (confirm("Are you sure you want to deactivate this user?")) {
      deactivateUserMutation.mutate(userId);
    }
  };

  const handleUpdateUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        ...editData,
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, return null (redirect happens in useEffect)
  if (!user) {
    return null;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Walton Trailers Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user.firstName || user.username}
                <Badge variant={user.role === "admin" ? "default" : "secondary"} className="ml-2">
                  {user.role}
                </Badge>
              </div>
              <Link href="/admin/account">
                <Button variant="ghost" size="sm" title="Account Settings">
                  <Users className="w-4 h-4" />
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Manage Walton Trailers administration</p>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">Product Management</TabsTrigger>
            {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Product Management
                  </CardTitle>
                  <CardDescription>
                    Update trailer and option pricing & details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-gray-600 mb-4">
                    <p>• Edit trailer categories and descriptions</p>
                    <p>• Manage trailer models and specifications</p>
                    <p>• Upload and manage trailer images</p>
                  </div>
                  <Link href="/admin/pricing">
                    <Button>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Update Products Catalog
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">User Management</h3>
                  <p className="text-sm text-gray-600">Create and manage admin users</p>
                </div>
                
                <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new admin user to the system
                      </DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={form.handleSubmit(onCreateUser)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            {...form.register("username")}
                            placeholder="Enter username"
                          />
                          {form.formState.errors.username && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.username.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            {...form.register("email")}
                            placeholder="Enter email"
                          />
                          {form.formState.errors.email && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            id="firstName"
                            {...form.register("firstName")}
                            placeholder="Optional"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            id="lastName"
                            {...form.register("lastName")}
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select 
                          value={form.watch("role")} 
                          onValueChange={(value: "admin" | "standard") => form.setValue("role", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard User</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          {...form.register("password")}
                          placeholder="Enter password"
                        />
                        {form.formState.errors.password && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowCreateUser(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createUserMutation.isPending}
                        >
                          {createUserMutation.isPending ? "Creating..." : "Create User"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  {usersLoading ? (
                    <div className="p-6 text-center">Loading users...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(users as AdminUser[])?.map((adminUser: AdminUser) => (
                            <tr key={adminUser.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingUser?.id === adminUser.id ? (
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="First Name"
                                      value={editData.firstName ?? adminUser.firstName ?? ""}
                                      onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                      className="w-24 h-8 text-sm"
                                    />
                                    <Input
                                      placeholder="Last Name"
                                      value={editData.lastName ?? adminUser.lastName ?? ""}
                                      onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                                      className="w-24 h-8 text-sm"
                                    />
                                  </div>
                                ) : (
                                  <div className="text-sm font-medium text-gray-900">
                                    {adminUser.firstName && adminUser.lastName
                                      ? `${adminUser.firstName} ${adminUser.lastName}`
                                      : "-"
                                    }
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingUser?.id === adminUser.id ? (
                                  <Input
                                    placeholder="Username"
                                    value={editData.username ?? adminUser.username}
                                    onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                    className="w-32 h-8 text-sm"
                                  />
                                ) : (
                                  <div className="text-sm text-gray-900">{adminUser.username}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingUser?.id === adminUser.id ? (
                                  <Input
                                    placeholder="Email"
                                    type="email"
                                    value={editData.email ?? adminUser.email}
                                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                    className="w-48 h-8 text-sm"
                                  />
                                ) : (
                                  <div className="text-sm text-gray-900">{adminUser.email}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {editingUser?.id === adminUser.id && adminUser.id !== user.id ? (
                                  <Select
                                    value={editData.role ?? adminUser.role}
                                    onValueChange={(value) => setEditData({ ...editData, role: value })}
                                  >
                                    <SelectTrigger className="w-28 h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant={adminUser.role === "admin" ? "default" : "secondary"}>
                                    {adminUser.role}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant={adminUser.isActive ? "outline" : "destructive"}>
                                  {adminUser.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(adminUser.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-2">
                                  {editingUser?.id === adminUser.id ? (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={handleUpdateUser}
                                        disabled={updateUserMutation.isPending}
                                        className="h-8"
                                      >
                                        <Save className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingUser(null);
                                          setEditData({});
                                        }}
                                        className="h-8"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setEditingUser(adminUser);
                                          setEditData({});
                                        }}
                                        className="h-8"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      
                                      {adminUser.isActive && adminUser.id !== user.id && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDeactivateUser(adminUser.id)}
                                          disabled={deactivateUserMutation.isPending}
                                          className="h-8"
                                        >
                                          Deactivate
                                        </Button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}