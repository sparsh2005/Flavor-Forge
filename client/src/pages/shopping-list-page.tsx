import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/footer";
import { getQueryFn, queryClient, apiRequest } from "@/lib/queryClient";
import { ShoppingListItem } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ShoppingBasket, Trash2, ShoppingCart, ArrowRight, Info, Search, Apple } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

// Nutrition info interface
interface NutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

// Ingredient from Spoonacular search
interface Ingredient {
  id: number;
  name: string;
  image: string;
  amount: number;
  unit: string;
}

export default function ShoppingListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | null>(null);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ item: "", quantity: "", unit: "" });
  
  // Query to fetch the shopping list
  const {
    data: shoppingList,
    isLoading,
    error,
  } = useQuery<ShoppingListItem[]>({
    queryKey: ["/api/shopping-list"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });
  
  // Query to get nutrition data for a selected item
  const {
    data: nutritionData,
    isLoading: isLoadingNutrition,
    error: nutritionError
  } = useQuery<NutritionInfo>({
    queryKey: ["/api/shopping-list", selectedItemId, "nutrition"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!selectedItemId && !!user,
  });
  
  // Query to search ingredients
  const {
    data: ingredientSearchResults,
    isLoading: isSearchingIngredients,
    error: searchIngredientsError
  } = useQuery<Ingredient[]>({
    queryKey: ["/api/ingredients/search", searchQuery],
    queryFn: () => 
      fetch(`/api/ingredients/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to search ingredients");
          return res.json();
        }),
    enabled: searchQuery.length > 2 && isSearchDialogOpen,
  });
  
  // Mutation to link a Spoonacular ingredient ID to a shopping list item
  const linkIngredientMutation = useMutation({
    mutationFn: async ({ itemId, spoonacularId }: { itemId: number; spoonacularId: number }) => {
      await apiRequest("PUT", `/api/shopping-list/${itemId}/spoonacular`, { spoonacularId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
      toast({
        title: "Ingredient linked",
        description: "Now you can view nutritional information for this item",
      });
      setIsSearchDialogOpen(false);
      setSearchQuery("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to link ingredient",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update a shopping list item (mark as checked/unchecked)
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, checked }: { id: number; checked: boolean }) => {
      await apiRequest("PUT", `/api/shopping-list/${id}`, { checked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete a shopping list item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/shopping-list/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
      toast({
        title: "Item removed",
        description: "Item has been removed from your shopping list",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to clear the entire shopping list
  const clearShoppingListMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/shopping-list");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
      toast({
        title: "Shopping list cleared",
        description: "All items have been removed from your shopping list",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to clear shopping list",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to add a new item to the shopping list
  const addItemMutation = useMutation({
    mutationFn: async (item: { item: string; quantity: string; unit: string }) => {
      await apiRequest("POST", "/api/shopping-list", {
        ...item,
        userId: user?.id,
        quantity: item.quantity.toString() // Ensure quantity is a string as defined in schema
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
      setIsAddItemDialogOpen(false);
      setNewItem({ item: "", quantity: "", unit: "" });
      toast({
        title: "Item added",
        description: "Item has been added to your shopping list",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle toggling item checked status
  const handleToggleChecked = (id: number, currentChecked: boolean) => {
    updateItemMutation.mutate({ id, checked: !currentChecked });
  };
  
  // Handle deleting an item
  const handleDeleteItem = (id: number) => {
    deleteItemMutation.mutate(id);
  };
  
  // Handle clearing the entire shopping list
  const handleClearList = () => {
    if (window.confirm("Are you sure you want to clear your entire shopping list?")) {
      clearShoppingListMutation.mutate();
    }
  };
  
  // Group shopping list items by recipe
  const groupedItems = React.useMemo(() => {
    if (!shoppingList) return new Map();
    
    const groupedMap = new Map<number | null, ShoppingListItem[]>();
    
    // Add "uncategorized" group for items without a recipe
    groupedMap.set(null, []);
    
    shoppingList.forEach(item => {
      const recipeId = item.recipeId;
      
      if (!recipeId) {
        // Add to uncategorized group
        groupedMap.get(null)!.push(item);
        return;
      }
      
      if (!groupedMap.has(recipeId)) {
        groupedMap.set(recipeId, []);
      }
      
      groupedMap.get(recipeId)!.push(item);
    });
    
    return groupedMap;
  }, [shoppingList]);
  
  // Redirect if not logged in
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  // Handle nutrition info dialog
  const handleShowNutrition = (itemId: number) => {
    setSelectedItemId(itemId);
  };
  
  // Handle ingredient search
  const handleSearchIngredients = (itemId: number) => {
    setSelectedItemId(itemId);
    setIsSearchDialogOpen(true);
  };
  
  // Handle selecting an ingredient from search results
  const handleSelectIngredient = (ingredientId: number) => {
    setSelectedIngredientId(ingredientId);
  };
  
  // Handle linking the selected ingredient to the shopping list item
  const handleLinkIngredient = () => {
    if (selectedItemId && selectedIngredientId) {
      linkIngredientMutation.mutate({
        itemId: selectedItemId,
        spoonacularId: selectedIngredientId
      });
    }
  };
  
  // Handle adding a new item to the shopping list
  const handleAddItem = () => {
    if (newItem.item.trim()) {
      addItemMutation.mutate(newItem);
    } else {
      toast({
        title: "Invalid item",
        description: "Please enter an item name",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-800">Shopping List</h1>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setIsAddItemDialogOpen(true)}
            >
              <Apple className="mr-2 h-4 w-4" />
              Add Item
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={handleClearList}
              disabled={isLoading || clearShoppingListMutation.isPending || !shoppingList?.length}
            >
              {clearShoppingListMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Clear List
            </Button>
          </div>
        </div>
        
        {/* Add Item Dialog */}
        <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Item to Shopping List</DialogTitle>
              <DialogDescription>
                Add your own item to your shopping list
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 gap-2 items-center">
                <label htmlFor="item" className="text-right font-medium">
                  Item:
                </label>
                <Input
                  id="item"
                  value={newItem.item}
                  onChange={(e) => setNewItem({...newItem, item: e.target.value})}
                  placeholder="Tomatoes"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-2 items-center">
                <label htmlFor="quantity" className="text-right font-medium">
                  Quantity:
                </label>
                <Input
                  id="quantity"
                  type="text"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                  placeholder="2"
                  className="col-span-3"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-2 items-center">
                <label htmlFor="unit" className="text-right font-medium">
                  Unit:
                </label>
                <Input
                  id="unit"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                  placeholder="cups"
                  className="col-span-3"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddItem}
                disabled={addItemMutation.isPending || !newItem.item.trim()}
              >
                {addItemMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add to List
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Nutrition Data Dialog */}
        <Dialog open={!!selectedItemId && !isSearchDialogOpen} onOpenChange={(open) => !open && setSelectedItemId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nutrition Information</DialogTitle>
              <DialogDescription>
                {shoppingList?.find(item => item.id === selectedItemId)?.item}
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingNutrition ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : nutritionError ? (
              <div className="p-6 text-center">
                <p className="mb-4 text-muted-foreground">No nutrition data available for this item.</p>
                <Button onClick={() => handleSearchIngredients(selectedItemId!)}>
                  <Search className="mr-2 h-4 w-4" />
                  Search for Ingredient
                </Button>
              </div>
            ) : nutritionData ? (
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="bg-primary/10 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">{nutritionData.calories}</div>
                  <div className="text-sm text-muted-foreground">Calories</div>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{nutritionData.protein}g</div>
                  <div className="text-sm text-muted-foreground">Protein</div>
                </div>
                <div className="bg-red-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{nutritionData.fat}g</div>
                  <div className="text-sm text-muted-foreground">Fat</div>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{nutritionData.carbs}g</div>
                  <div className="text-sm text-muted-foreground">Carbs</div>
                </div>
              </div>
            ) : null}
            
            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={() => setSelectedItemId(null)}>
                Close
              </Button>
              {!isLoadingNutrition && !nutritionData && (
                <Button onClick={() => handleSearchIngredients(selectedItemId!)}>
                  <Search className="mr-2 h-4 w-4" />
                  Search for Ingredient
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Ingredient Search Dialog */}
        <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Find Ingredient</DialogTitle>
              <DialogDescription>
                Search for an ingredient to get nutrition information
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-2">
                <Input 
                  placeholder="Search ingredients (e.g., apple, chicken, rice)" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {isSearchingIngredients && (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              
              {searchIngredientsError && (
                <p className="text-destructive text-center text-sm">Error searching ingredients</p>
              )}
              
              {!isSearchingIngredients && ingredientSearchResults && ingredientSearchResults.length === 0 && searchQuery.length > 2 && (
                <p className="text-muted-foreground text-center text-sm">No ingredients found</p>
              )}
              
              {ingredientSearchResults && ingredientSearchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  {ingredientSearchResults.map((ingredient) => (
                    <div 
                      key={ingredient.id} 
                      className={`p-2 flex items-center cursor-pointer hover:bg-muted ${
                        selectedIngredientId === ingredient.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleSelectIngredient(ingredient.id)}
                    >
                      <div className="flex-shrink-0 w-10 h-10 mr-3">
                        <img src={ingredient.image} alt={ingredient.name} className="w-full h-full object-cover rounded" />
                      </div>
                      <div>
                        <div className="font-medium">{ingredient.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsSearchDialogOpen(false);
                setSearchQuery("");
                setSelectedIngredientId(null);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleLinkIngredient}
                disabled={!selectedIngredientId || linkIngredientMutation.isPending}
              >
                {linkIngredientMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Link Ingredient
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Tabs defaultValue="all" className="mb-8" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            {renderShoppingList(shoppingList, "all")}
          </TabsContent>
          
          <TabsContent value="pending" className="mt-4">
            {renderShoppingList(shoppingList?.filter(item => !item.checked), "pending")}
          </TabsContent>
          
          <TabsContent value="completed" className="mt-4">
            {renderShoppingList(shoppingList?.filter(item => item.checked), "completed")}
          </TabsContent>
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
  
  function renderShoppingList(items: ShoppingListItem[] | undefined, tabType: string) {
    if (isLoading) {
      return (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (error) {
      return (
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Error loading shopping list</p>
          </CardContent>
        </Card>
      );
    }
    
    if (!items || items.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-medium mb-2">Your shopping list is empty</h3>
            <p className="text-muted-foreground mb-6">
              {tabType === "all" 
                ? "Add ingredients from recipes to create your shopping list." 
                : tabType === "pending" 
                ? "All items have been checked off." 
                : "You haven't completed any items yet."}
            </p>
            <div className="flex justify-center gap-2">
              <Button size="sm" onClick={() => window.location.href = "/"}>
                Browse Recipes <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAddItemDialogOpen(true)}>
                <Apple className="mr-2 h-4 w-4" />
                Add New Item
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // For "all" tab, render grouped by recipe
    if (tabType === "all" && groupedItems.size > 0) {
      return (
        <div className="space-y-6">
          {Array.from(groupedItems.entries()).map(([recipeId, recipeItems]) => {
            if (recipeItems.length === 0) return null;
            
            return (
              <Card key={recipeId || "uncategorized"}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center">
                    <ShoppingBasket className="h-5 w-5 mr-2 text-primary" />
                    {recipeId 
                      ? recipeItems[0]?.recipeTitle || `Recipe #${recipeId}`
                      : "Uncategorized Items"}
                    
                    <Badge variant="outline" className="ml-auto">
                      {recipeItems.length} item{recipeItems.length !== 1 ? "s" : ""}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-2">
                    {recipeItems.map((item: ShoppingListItem) => (
                      <li key={item.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                        <Checkbox 
                          id={`item-${item.id}`}
                          checked={item.checked}
                          onCheckedChange={() => handleToggleChecked(item.id, item.checked)}
                          className="h-5 w-5"
                        />
                        <label 
                          htmlFor={`item-${item.id}`}
                          className={`flex-grow cursor-pointer ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                        >
                          {item.quantity} {item.unit ? `${item.unit} ` : ''}{item.item}
                        </label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShowNutrition(item.id)}
                                className="h-7 w-7 p-0"
                              >
                                <Info className="h-4 w-4 text-primary" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View nutrition info</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }
    
    // For filtered tabs, just render a list
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center">
            <ShoppingBasket className="h-5 w-5 mr-2 text-primary" />
            {tabType === "pending" ? "Items to Buy" : "Completed Items"}
            
            <Badge variant="outline" className="ml-auto">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <ul className="space-y-2">
            {items.map((item: ShoppingListItem) => (
              <li key={item.id} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                <Checkbox 
                  id={`item-${item.id}`}
                  checked={item.checked}
                  onCheckedChange={() => handleToggleChecked(item.id, item.checked)}
                  className="h-5 w-5"
                />
                <label 
                  htmlFor={`item-${item.id}`}
                  className={`flex-grow cursor-pointer ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                >
                  {item.quantity} {item.unit ? `${item.unit} ` : ''}{item.item}
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShowNutrition(item.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Info className="h-4 w-4 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View nutrition info</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteItem(item.id)}
                  className="h-7 w-7 p-0"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }
}