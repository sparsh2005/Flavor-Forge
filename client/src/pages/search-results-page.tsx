import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/footer";
import { RecipeCard } from "@/components/recipe-card";
import { useQuery } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, SearchX } from "lucide-react";

export default function SearchResultsPage() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Extract search query from URL
  useEffect(() => {
    try {
      console.log('Current location:', location);
      const parts = location.split('?');
      console.log('URL parts:', parts);
      
      if (parts.length > 1) {
        const queryParams = new URLSearchParams(parts[1]);
        const q = queryParams.get("q");
        console.log('Query parameter "q":', q);
        
        if (q) {
          setSearchQuery(q);
        } else {
          console.warn('No search query found in URL params');
        }
      } else {
        console.warn('No query string in URL:', location);
      }
    } catch (err) {
      console.error('Error parsing search URL:', err);
    }
  }, [location]);
  
  // Fetch search results
  const { data: searchResults = [], isLoading, error } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes/search", searchQuery],
    queryFn: async () => {
      console.log(`Searching for: ${searchQuery}`);
      const url = `/api/recipes/search?q=${encodeURIComponent(searchQuery)}`;
      console.log(`Fetching from: ${url}`);
      
      try {
        const res = await fetch(url);
        console.log(`Search response status: ${res.status}`);
        
        if (!res.ok) {
          throw new Error(`Search request failed with status ${res.status}`);
        }
        
        const data = await res.json();
        console.log(`Received ${data.length} search results`);
        return data;
      } catch (err) {
        console.error('Error in search query:', err);
        throw err;
      }
    },
    enabled: !!searchQuery,
  });
  
  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
            {searchQuery ? `Search Results for "${searchQuery}"` : "Search Results"}
          </h1>
          <p className="text-gray-600">
            {!isLoading && searchResults.length > 0 && `Found ${searchResults.length} recipes`}
          </p>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="ml-4 text-lg text-gray-600">Searching for recipes...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">Sorry, we encountered an error while searching.</p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-16">
            <SearchX className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-display font-bold text-gray-800 mb-2">
              No recipes found
            </h2>
            <p className="text-gray-600 mb-6">
              We couldn't find any recipes matching your search.
              Try using different keywords or browse our categories.
            </p>
            <Button onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {searchResults.map(recipe => (
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