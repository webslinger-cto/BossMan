import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Tag, 
  DollarSign, 
  Clock, 
  Package,
  Loader2,
  FolderPlus,
} from "lucide-react";
import type { PricebookItem, PricebookCategory } from "@shared/schema";

const defaultCategories = [
  "Drain Cleaning",
  "Sewer Repair",
  "Plumbing",
  "Water Heater",
  "Camera Inspection",
  "Hydro Jetting",
  "Emergency",
  "Maintenance",
];

export default function PricebookPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PricebookItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    serviceCode: "",
    basePrice: "",
    laborHours: "",
    materialsCost: "",
    unit: "each",
    isActive: true,
    isTaxable: true,
  });
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    color: "#b22222",
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<PricebookItem[]>({
    queryKey: ["/api/pricebook/items"],
  });

  const { data: categories = [] } = useQuery<PricebookCategory[]>({
    queryKey: ["/api/pricebook/categories"],
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/pricebook/items", {
        name: data.name,
        description: data.description || null,
        category: data.category,
        serviceCode: data.serviceCode || null,
        basePrice: data.basePrice || "0",
        laborHours: data.laborHours || null,
        materialsCost: data.materialsCost || null,
        unit: data.unit,
        isActive: data.isActive,
        isTaxable: data.isTaxable,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricebook/items"] });
      toast({ title: "Item created", description: "Pricebook item has been added." });
      setIsAddItemDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create item.", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await apiRequest("PATCH", `/api/pricebook/items/${id}`, {
        name: data.name,
        description: data.description || null,
        category: data.category,
        serviceCode: data.serviceCode || null,
        basePrice: data.basePrice || "0",
        laborHours: data.laborHours || null,
        materialsCost: data.materialsCost || null,
        unit: data.unit,
        isActive: data.isActive,
        isTaxable: data.isTaxable,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricebook/items"] });
      toast({ title: "Item updated", description: "Pricebook item has been updated." });
      setEditingItem(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update item.", variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pricebook/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricebook/items"] });
      toast({ title: "Item deleted", description: "Pricebook item has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof newCategory) => {
      const response = await apiRequest("POST", "/api/pricebook/categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pricebook/categories"] });
      toast({ title: "Category created", description: "New category has been added." });
      setIsAddCategoryDialogOpen(false);
      setNewCategory({ name: "", description: "", color: "#b22222" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create category.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      serviceCode: "",
      basePrice: "",
      laborHours: "",
      materialsCost: "",
      unit: "each",
      isActive: true,
      isTaxable: true,
    });
  };

  const handleEdit = (item: PricebookItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category,
      serviceCode: item.serviceCode || "",
      basePrice: String(item.basePrice),
      laborHours: item.laborHours ? String(item.laborHours) : "",
      materialsCost: item.materialsCost ? String(item.materialsCost) : "",
      unit: item.unit || "each",
      isActive: item.isActive,
      isTaxable: item.isTaxable ?? true,
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.basePrice) {
      toast({ title: "Required fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createItemMutation.mutate(formData);
    }
  };

  const allCategories = [
    ...defaultCategories,
    ...categories.filter(c => !defaultCategories.includes(c.name)).map(c => c.name),
  ];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serviceCode?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Pricebook Management</h1>
            <p className="text-muted-foreground">Manage service pricing, labor hours, and materials costs</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => setIsAddCategoryDialogOpen(true)}
              data-testid="button-add-category"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
            <Button 
              onClick={() => setIsAddItemDialogOpen(true)}
              data-testid="button-add-item"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Service Catalog
                </CardTitle>
                <CardDescription>{items.length} services in pricebook</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-search-pricebook"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48" data-testid="select-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {allCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {items.length === 0 ? (
                  <div>
                    <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No services in pricebook yet.</p>
                    <p className="text-sm">Add your first service to get started.</p>
                  </div>
                ) : (
                  <p>No services match your search criteria.</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Base Price</TableHead>
                    <TableHead className="text-right">Labor (hrs)</TableHead>
                    <TableHead className="text-right">Materials</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} data-testid={`row-pricebook-${item.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.serviceCode || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.basePrice)}</TableCell>
                      <TableCell className="text-right">{item.laborHours || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.materialsCost)}</TableCell>
                      <TableCell>
                        <Badge variant={item.isActive ? "default" : "outline"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEdit(item)}
                            data-testid={`button-edit-${item.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            data-testid={`button-delete-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddItemDialogOpen || !!editingItem} onOpenChange={(open) => {
          if (!open) {
            setIsAddItemDialogOpen(false);
            setEditingItem(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Service" : "Add New Service"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Service Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Drain Cleaning - Standard"
                    data-testid="input-service-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Service Code</Label>
                  <Input
                    value={formData.serviceCode}
                    onChange={(e) => setFormData({ ...formData, serviceCode: e.target.value })}
                    placeholder="e.g., DC-001"
                    data-testid="input-service-code"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the service"
                  data-testid="input-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {allCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                    <SelectTrigger data-testid="select-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="each">Each</SelectItem>
                      <SelectItem value="hour">Per Hour</SelectItem>
                      <SelectItem value="foot">Per Foot</SelectItem>
                      <SelectItem value="flat">Flat Rate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Base Price *
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-base-price"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Labor Hours
                  </Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={formData.laborHours}
                    onChange={(e) => setFormData({ ...formData, laborHours: e.target.value })}
                    placeholder="0.0"
                    data-testid="input-labor-hours"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Materials Cost
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.materialsCost}
                    onChange={(e) => setFormData({ ...formData, materialsCost: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-materials-cost"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddItemDialogOpen(false);
                setEditingItem(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
                data-testid="button-save-item"
              >
                {(createItemMutation.isPending || updateItemMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingItem ? "Update Service" : "Add Service"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Category Name *</Label>
                <Input
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="e.g., Specialty Services"
                  data-testid="input-category-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Brief description of the category"
                  data-testid="input-category-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createCategoryMutation.mutate(newCategory)}
                disabled={!newCategory.name || createCategoryMutation.isPending}
                data-testid="button-save-category"
              >
                {createCategoryMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}
