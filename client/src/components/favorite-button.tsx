import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  recipeId: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function FavoriteButton({
  recipeId,
  size = "md",
  variant = "outline",
  className,
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Query to check if the recipe is already favorited
  const {
    data: favorite,
    isLoading,
  } = useQuery<{ isFavorite: boolean }>({
    queryKey: ["/api/recipes", recipeId, "favorite"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && !!recipeId,
  });
  
  // Mutation to add to favorites
  const addToFavoritesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/favorites", { recipeId });
    },
    onSuccess: () => {
      toast({
        title: "Recipe added to favorites",
        description: "You can find it in your favorites list.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes", recipeId, "favorite"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add to favorites",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to remove from favorites
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/favorites/${recipeId}`);
    },
    onSuccess: () => {
      toast({
        title: "Recipe removed from favorites",
        description: "The recipe has been removed from your favorites.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes", recipeId, "favorite"] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove from favorites",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle click on the favorite button
  const handleToggleFavorite = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add recipes to your favorites.",
        variant: "destructive",
      });
      return;
    }
    
    if (favorite?.isFavorite) {
      removeFromFavoritesMutation.mutate();
    } else {
      addToFavoritesMutation.mutate();
    }
  };
  
  // Set button sizes
  const getButtonSize = () => {
    switch (size) {
      case "sm":
        return "h-8 w-8";
      case "lg":
        return "h-12 w-12";
      case "md":
      default:
        return "h-10 w-10";
    }
  };
  
  const getIconSize = () => {
    switch (size) {
      case "sm":
        return 14;
      case "lg":
        return 24;
      case "md":
      default:
        return 18;
    }
  };
  
  // Determine if the button is in a loading state
  const isButtonLoading = isLoading || 
    addToFavoritesMutation.isPending || 
    removeFromFavoritesMutation.isPending;
  
  return (
    <Button
      variant={variant}
      size="icon"
      className={cn(
        getButtonSize(),
        "rounded-full border border-muted",
        className
      )}
      disabled={isButtonLoading}
      onClick={handleToggleFavorite}
    >
      <Heart
        size={getIconSize()}
        className={cn(favorite?.isFavorite && "fill-red-500 text-red-500")}
      />
      <span className="sr-only">
        {favorite?.isFavorite ? "Remove from favorites" : "Add to favorites"}
      </span>
    </Button>
  );
}