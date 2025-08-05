import { useState, useMemo } from "react";
import { ArrowLeft, Edit, Save, X, Archive, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFastQuery } from "@/hooks/useFastQuery";

// Minimal UI components for maximum performance
const Button = ({ children, onClick, disabled, variant = 'default', size = 'default', ...props }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors
      ${variant === 'outline' ? 'border border-gray-300 bg-white hover:bg-gray-50' : 'bg-blue-600 text-white hover:bg-blue-700'}
      ${size === 'sm' ? 'px-2 py-1 text-xs' : ''}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
    {...props}
  >
    {children}
  </button>
);

const Input = ({ className = '', ...props }: any) => (
  <input
    className={`px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    {...props}
  />
);

const Select = ({ value, onValueChange, children }: any) => (
  <select
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
  >
    {children}
  </select>
);

const SelectTrigger = ({ children }: any) => <>{children}</>;
const SelectValue = () => null;
const SelectContent = ({ children }: any) => <>{children}</>;
const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;

const Card = ({ children, className = '' }: any) => (
  <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
    {children}
  </div>
);

const Table = ({ children }: any) => (
  <div className="overflow-auto">
    <table className="w-full border-collapse">
      {children}
    </table>
  </div>
);

const TableHeader = ({ children }: any) => <thead className="bg-gray-50">{children}</thead>;
const TableBody = ({ children }: any) => <tbody className="divide-y divide-gray-200">{children}</tbody>;
const TableRow = ({ children, className = '' }: any) => <tr className={className}>{children}</tr>;
const TableHead = ({ children }: any) => <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{children}</th>;
const TableCell = ({ children, className = '' }: any) => <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;

// Fast mutations with minimal overhead
const fastMutate = async (url: string, options: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};

export default function FastPricing() {
  const [activeTab, setActiveTab] = useState("models");
  const [editingModel, setEditingModel] = useState<any>(null);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const sessionId = localStorage.getItem("admin_session");
  const queryClient = useQueryClient();

  const { data: models = [], isLoading, error: modelsError } = useFastQuery.allModels(sessionId);
  const { data: options = [], error: optionsError } = useFastQuery.allOptions(sessionId);

  // Fast filtering with memoization
  const { activeModels, archivedModels } = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = models.filter((model: any) => 
      !query || 
      model.name.toLowerCase().includes(query) ||
      model.modelId.toLowerCase().includes(query) ||
      model.categoryName.toLowerCase().includes(query)
    );
    
    return {
      activeModels: filtered.filter((m: any) => !m.isArchived),
      archivedModels: filtered.filter((m: any) => m.isArchived)
    };
  }, [models, searchQuery]);

  // Fast mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => fastMutate(`/api/models/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionId}`,
      },
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'models'] });
      setEditingModel(null);
      setEditData({});
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/models/${id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionId}` },
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'models'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => fastMutate(`/api/models/${id}/restore`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionId}` },
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'models'] }),
  });

  const handleUpdate = (model: any) => {
    const data = editData[model.id] || {};
    updateMutation.mutate({
      id: model.id,
      modelId: data.modelId ?? model.modelId,
      name: data.name ?? model.name,
      categoryId: data.categoryId ?? model.categoryId,
      basePrice: data.basePrice ?? model.basePrice,
    });
  };

  // Handle authentication errors
  if (modelsError || optionsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access the pricing management.</p>
          <Link href="/admin/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Product Management</h1>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("models")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "models"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Models
              </button>
              <button
                onClick={() => setActiveTab("options")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "options"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Options & Extras
              </button>
            </nav>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <Input
            placeholder={activeTab === "models" ? "Search models..." : "Search options..."}
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Models table */}
        {activeTab === "models" && (
          <>
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Models ({activeModels.length})</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeModels.map((model: any) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium">
                      {editingModel?.id === model.id ? (
                        <Input
                          value={editData[model.id]?.modelId ?? model.modelId}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], modelId: e.target.value }
                          })}
                        />
                      ) : (
                        model.modelId
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Input
                          value={editData[model.id]?.name ?? model.name}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], name: e.target.value }
                          })}
                        />
                      ) : (
                        model.name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Select
                          value={editData[model.id]?.categoryId?.toString() ?? model.categoryId?.toString()}
                          onValueChange={(value) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], categoryId: parseInt(value) }
                          })}
                        >
                          <SelectItem value="6">Gooseneck Trailers</SelectItem>
                          <SelectItem value="7">Car/Equipment Haulers</SelectItem>
                          <SelectItem value="8">Dump Trailers</SelectItem>
                          <SelectItem value="9">Landscape Trailers</SelectItem>
                          <SelectItem value="10">Utility Trailers</SelectItem>
                          <SelectItem value="11">Specialty Trailers</SelectItem>
                        </Select>
                      ) : (
                        model.categoryName
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <Input
                          type="number"
                          value={editData[model.id]?.basePrice ?? model.basePrice}
                          onChange={(e: any) => setEditData({
                            ...editData,
                            [model.id]: { ...editData[model.id], basePrice: parseInt(e.target.value) }
                          })}
                        />
                      ) : (
                        `$${model.basePrice?.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell>
                      {editingModel?.id === model.id ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleUpdate(model)}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingModel(null);
                              setEditData({});
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => archiveMutation.mutate(model.id)}
                            disabled={archiveMutation.isPending}
                          >
                            <Archive className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingModel(model)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                </Table>
              </div>
            </Card>

            {/* Archived section */}
            {archivedModels.length > 0 && (
              <Card className="mt-6">
                <div className="p-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchived(!showArchived)}
                    className="mb-4"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {showArchived ? 'Hide' : 'Show'} Archived ({archivedModels.length})
                  </Button>
                  
                  {showArchived && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedModels.map((model: any) => (
                          <TableRow key={model.id} className="opacity-60">
                            <TableCell>{model.modelId}</TableCell>
                            <TableCell>{model.name}</TableCell>
                            <TableCell>{model.categoryName}</TableCell>
                            <TableCell>${model.basePrice?.toLocaleString()}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => restoreMutation.mutate(model.id)}
                                disabled={restoreMutation.isPending}
                                title="Restore to active"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </Card>
            )}
          </>
        )}

        {/* Options & Extras Tab */}
        {activeTab === "options" && (
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Options & Extras ({options.length})</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options
                    .filter((option: any) => 
                      !searchQuery || 
                      option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      option.modelId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      option.category.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((option: any) => (
                    <TableRow key={option.id}>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <Input
                            value={editData[option.id]?.name ?? option.name}
                            onChange={(e: any) => setEditData({
                              ...editData,
                              [option.id]: { ...editData[option.id], name: e.target.value }
                            })}
                          />
                        ) : (
                          option.name
                        )}
                      </TableCell>
                      <TableCell>{option.modelId}</TableCell>
                      <TableCell>{option.category}</TableCell>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <Input
                            type="number"
                            value={editData[option.id]?.price ?? option.price}
                            onChange={(e: any) => setEditData({
                              ...editData,
                              [option.id]: { ...editData[option.id], price: parseInt(e.target.value) }
                            })}
                          />
                        ) : (
                          `$${option.price?.toLocaleString()}`
                        )}
                      </TableCell>
                      <TableCell>
                        {editingOption?.id === option.id ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                // Handle option update logic here
                                setEditingOption(null);
                                setEditData({});
                              }}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingOption(null);
                                setEditData({});
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingOption(option)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}