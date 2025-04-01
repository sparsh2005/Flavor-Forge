import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/footer";
import { RecipeCard } from "@/components/recipe-card";
import { CategoryItem } from "@/components/category-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  ChefHat, 
  Coffee, 
  Utensils, 
  UtensilsCrossed, 
  Cake, 
  Wine, 
  Salad,
  Search as SearchIcon,
  Beef,
  Fish,
  Egg,
  Soup,
  Cookie
} from "lucide-react";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [_, navigate] = useLocation();
  
  const { data: topRecipes = [], isLoading: topRecipesLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes/top"],
  });
  
  const { data: recentRecipes = [], isLoading: recentRecipesLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes/recent"],
  });
  
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<string[]>({
    queryKey: ["/api/categories"],
  });
  
  // Icon mapping for categories
  const categoryIcons: Record<string, any> = {
    'Beef': Beef,
    'Chicken': ChefHat,
    'Dessert': Cake,
    'Lamb': Utensils,
    'Miscellaneous': UtensilsCrossed,
    'Pasta': Soup,
    'Pork': Salad,
    'Seafood': Fish,
    'Side': Coffee,
    'Starter': Egg, 
    'Vegan': Wine,
    'Vegetarian': Salad,
    'Breakfast': Coffee,
    'Goat': Utensils,
    'Lunch': Utensils,
    'Dinner': UtensilsCrossed,
    'Beverages': Wine,
    'Cookies': Cookie
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recipes/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#ffeae0] to-[#e1f7f5] py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Discover & Share Amazing Recipes
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Find inspiration for your next meal from our collection of delicious recipes 
              created by food lovers like you.
            </p>
            
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-dark" size={18} />
              <Input
                type="text"
                placeholder="Search for recipes, ingredients, or cuisines..."
                className="w-full pl-10 pr-24 py-6 rounded-lg bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                Search
              </Button>
            </form>
          </div>
        </div>
        
        <div className="hidden md:block absolute bottom-0 left-0 w-32 h-32 opacity-20">
          <ChefHat className="text-primary" size={120} />
        </div>
        <div className="hidden md:block absolute top-10 right-10 w-20 h-20 opacity-20">
          <Cake className="text-secondary" size={80} />
        </div>
      </section>

      {/* Top Recipes Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-10">
            <h2 className="font-display text-3xl font-bold text-gray-800">Top Recipes</h2>
            <Link href="/">
              <a className="text-primary font-medium flex items-center hover:underline">
                View all <span className="ml-1">→</span>
              </a>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {topRecipesLoading ? (
              // Show skeleton loading state
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg h-56 mb-4"></div>
                  <div className="bg-gray-200 h-4 w-16 rounded mb-2"></div>
                  <div className="bg-gray-200 h-6 rounded mb-2"></div>
                  <div className="bg-gray-200 h-4 w-32 rounded"></div>
                </div>
              ))
            ) : topRecipes.length > 0 ? (
              topRecipes.map(recipe => (
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
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No recipes found. Be the first to add one!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recently Added Section */}
      <section className="py-16 bg-neutral-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-10">
            <h2 className="font-display text-3xl font-bold text-gray-800">Recently Added</h2>
            <Link href="/">
              <a className="text-primary font-medium flex items-center hover:underline">
                View all <span className="ml-1">→</span>
              </a>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentRecipesLoading ? (
              // Show skeleton loading state
              Array(3).fill(0).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg h-56 mb-4"></div>
                  <div className="bg-gray-200 h-4 w-16 rounded mb-2"></div>
                  <div className="bg-gray-200 h-6 rounded mb-2"></div>
                  <div className="bg-gray-200 h-4 w-32 rounded"></div>
                </div>
              ))
            ) : recentRecipes.length > 0 ? (
              recentRecipes.map(recipe => (
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
                  createdAt={recipe.createdAt}
                  showCreatedAt={true}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No recipes added recently. Be the first!</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-gray-800 text-center mb-12">
            Browse By Category
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categoriesLoading ? (
              // Show skeleton loading state
              Array(6).fill(0).map((_, index) => (
                <div key={index} className="animate-pulse flex flex-col items-center">
                  <div className="bg-gray-200 rounded-full h-16 w-16 mb-3"></div>
                  <div className="bg-gray-200 h-4 w-20 rounded"></div>
                </div>
              ))
            ) : categories.length > 0 ? (
              categories.map(category => {
                const Icon = categoryIcons[category] || UtensilsCrossed;
                return (
                  <CategoryItem 
                    key={category}
                    icon={Icon} 
                    label={category} 
                    href={`/recipes/category/${category}`} 
                  />
                );
              })
            ) : (
              // Fallback categories if API doesn't return any
              <>
                <CategoryItem icon={Coffee} label="Breakfast" href="/recipes/category/Breakfast" />
                <CategoryItem icon={Utensils} label="Lunch" href="/recipes/category/Lunch" />
                <CategoryItem icon={UtensilsCrossed} label="Dinner" href="/recipes/category/Dinner" />
                <CategoryItem icon={Cake} label="Desserts" href="/recipes/category/Dessert" />
                <CategoryItem icon={Wine} label="Beverages" href="/recipes/category/Beverages" />
                <CategoryItem icon={Salad} label="Vegetarian" href="/recipes/category/Vegetarian" />
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              Share Your Culinary Creations
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join our community of food enthusiasts and share your favorite recipes with the world.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/add-recipe">
                <Button size="lg">Add Your Recipe</Button>
              </Link>
              <Link href="/auth">
                <Button size="lg" variant="primary-outline">Join Community</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
