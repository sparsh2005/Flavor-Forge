import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/footer";
import { RecipeCard } from "@/components/recipe-card";
import { useQuery } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, UtensilsCrossed } from "lucide-react";

export default function CategoryPage() {
  const [location] = useLocation();
  const [category, setCategory] = useState("");
  
  // Extract category from URL
  useEffect(() => {
    const pathParts = location.split('/');
    if (pathParts.length >= 3) {
      setCategory(decodeURIComponent(pathParts[pathParts.length - 1]));
    }
  }, [location]);
  
  // Fetch recipes by category
  const { data: recipes = [], isLoading, error } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes/category", category],
    queryFn: () => 
      fetch(`/api/recipes/category/${encodeURIComponent(category)}`)
        .then(res => res.json()),
    enabled: !!category,
  });
  
  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
            {category || "Category"}
          </h1>
          <p className="text-gray-600">
            {!isLoading && recipes.length > 0 && `Found ${recipes.length} recipes`}
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="ml-4 text-lg text-gray-600">Loading recipes...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">Sorry, we encountered an error while loading recipes.</p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <UtensilsCrossed className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-display font-bold text-gray-800 mb-2">
              No recipes found
            </h2>
            <p className="text-gray-600 mb-6">
              We couldn't find any recipes in this category.
              Try browsing another category or search for specific recipes.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                id={recipe.id}
                title={recipe.title}
                imageUrl={recipe.imageUrl}
                prepTime={recipe.prepTime}
                cookTime={recipe.cookTime}
                difficulty={recipe.difficulty}
                calories={recipe.calories || undefined}
                author={recipe.source || "TheMealDB"}
                rating={4.5}
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}