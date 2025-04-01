import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/footer";
import { RecipeCard } from "@/components/recipe-card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Loader2, Trash2, Edit } from "lucide-react";
import { useState } from "react";

export default function MyRecipesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipeToDelete, setRecipeToDelete] = useState<number | null>(null);

  const {
    data: recipes = [],
    isLoading,
    isError,
  } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes/user"],
    enabled: !!user,
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/recipes/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Recipe deleted",
        description: "Your recipe has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/top"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/recent"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (id: number) => {
    setRecipeToDelete(id);
  };

  const confirmDelete = () => {
    if (recipeToDelete) {
      deleteRecipeMutation.mutate(recipeToDelete);
      setRecipeToDelete(null);
    }
  };

  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-gray-800">My Recipes</h1>
              <p className="text-gray-600">Manage your culinary creations</p>
            </div>
            <Link href="/add-recipe">
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add New Recipe
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Failed to load your recipes. Please try again.</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/recipes/user"] })}
                variant="outline"
              >
                Retry
              </Button>
            </div>
          ) : recipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recipes.map((recipe) => (
                <div key={recipe.id} className="relative">
                  <RecipeCard
                    id={recipe.id}
                    title={recipe.title}
                    imageUrl={recipe.imageUrl}
                    prepTime={recipe.prepTime}
                    cookTime={recipe.cookTime}
                    difficulty={recipe.difficulty}
                    calories={recipe.calories}
                    author={user?.name || "You"}
                    createdAt={recipe.createdAt}
                  />
                  <div className="absolute top-4 left-4 flex space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white"
                      asChild
                    >
                      <Link href={`/edit-recipe/${recipe.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white text-destructive hover:text-destructive"
                      onClick={() => handleDelete(recipe.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <div className="mb-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <ChefHat className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-display font-bold text-gray-800 mb-2">No recipes yet</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                You haven't created any recipes yet. Start sharing your culinary creations with the community!
              </p>
              <Link href="/add-recipe">
                <Button>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Your First Recipe
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={recipeToDelete !== null} onOpenChange={(open) => !open && setRecipeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your recipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              {deleteRecipeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

function ChefHat(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
      <line x1="6" x2="18" y1="17" y2="17" />
    </svg>
  );
}
