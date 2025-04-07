import React from "react";
import { useMutation } from "@tanstack/react-query";
import { ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface AddToShoppingListButtonProps {
  recipeId: number;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function AddToShoppingListButton({
  recipeId,
  className,
  variant = "default",
  size = "default",
}: AddToShoppingListButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Mutation to add all ingredients from a recipe to the shopping list
  const addToShoppingListMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/recipes/${recipeId}/add-to-shopping-list`, {});
    },
    onSuccess: () => {
      toast({
        title: "Added to shopping list",
        description: "All ingredients have been added to your shopping list.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/shopping-list"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add to shopping list",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle adding ingredients to shopping list
  const handleAddToShoppingList = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add ingredients to your shopping list.",
        variant: "destructive",
      });
      return;
    }
    
    addToShoppingListMutation.mutate();
  };
  
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={handleAddToShoppingList}
      disabled={addToShoppingListMutation.isPending}
    >
      {addToShoppingListMutation.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ShoppingBag className="mr-2 h-4 w-4" />
      )}
      Add to Shopping List
    </Button>
  );
}