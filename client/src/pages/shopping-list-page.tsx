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
import { Loader2, ShoppingBasket, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ShoppingListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  
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
  
  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-800">Shopping List</h1>
          
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
            <Button size="sm" onClick={() => window.location.href = "/"}>
              Browse Recipes <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="ml-auto h-7 w-7 p-0"
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteItem(item.id)}
                  className="ml-auto h-7 w-7 p-0"
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