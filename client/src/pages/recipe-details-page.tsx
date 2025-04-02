import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/footer";
import { 
  Clock, 
  ChefHat, 
  Thermometer, 
  User,
  CalendarClock,
  Flame,
  Utensils,
  Drumstick,
  Beef,
  Apple
} from "lucide-react";
import { Recipe, Ingredient, Instruction } from "@shared/schema";
import { formatDistanceToNow, isValid } from "date-fns";

type RecipeDetails = Recipe & {
  ingredients: Ingredient[];
  instructions: Instruction[];
  authorName: string;
  protein?: number | null;
  fats?: number | null;
  carbs?: number | null;
  servings?: number | null;
};

export default function RecipeDetailsPage() {
  const [, params] = useRoute<{ id: string }>("/recipes/:id");
  const recipeId = params?.id ? parseInt(params.id) : 0;

  const { data, isLoading, error } = useQuery<{
    recipe: Recipe, 
    ingredients: Ingredient[],
    instructions: Instruction[],
    authorName: string
  }>({
    queryKey: [`/api/recipes/${recipeId}`],
    enabled: recipeId > 0,
  });
  
  // Combine all data into one object for easier reference
  const recipe = data ? {
    ...data.recipe,
    ingredients: data.ingredients,
    instructions: data.instructions,
    authorName: data.authorName,
    protein: data.recipe.protein,
    fats: data.recipe.fats,
    carbs: data.recipe.carbs,
    servings: data.recipe.servings,
  } as RecipeDetails : undefined;

  const getDifficultyColor = (difficulty?: string) => {
    if (!difficulty) return "bg-secondary";
    
    switch(difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-secondary';
      case 'medium':
        return 'bg-yellow-500';
      case 'hard':
        return 'bg-orange-500';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {isLoading ? (
          // Loading skeleton
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded-md w-3/4 mb-4"></div>
              <div className="h-96 bg-gray-200 rounded-lg mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="col-span-2">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 w-full"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2 w-full"></div>
                  <div className="h-4 bg-gray-200 rounded mb-8 w-3/4"></div>
                  
                  <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-24 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-6 bg-gray-200 rounded mb-4 w-1/2"></div>
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          // Error state
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-lg mx-auto">
              <h2 className="text-2xl font-display font-bold text-gray-800 mb-4">
                Oops! Something went wrong
              </h2>
              <p className="text-gray-600 mb-8">
                We couldn't load this recipe. Please try again later.
              </p>
            </div>
          </div>
        ) : recipe ? (
          // Recipe details
          <article className="bg-white">
            <div className="container mx-auto px-4 py-6">
              {/* Recipe header with name and badges */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`text-xs font-medium text-white ${getDifficultyColor(recipe.difficulty)} px-2 py-1 rounded-full`}>
                    {recipe.difficulty}
                  </span>
                  {recipe.calories && (
                    <span className="text-xs font-medium text-white bg-gray-700 px-2 py-1 rounded-full flex items-center">
                      <Flame className="h-3 w-3 mr-1" /> {recipe.calories} calories
                    </span>
                  )}
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                  {recipe.title}
                </h1>
                <div className="flex flex-wrap items-center text-gray-600 text-sm gap-4">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    <span>{recipe.authorName}</span>
                  </div>
                  <div className="flex items-center">
                    <CalendarClock className="h-4 w-4 mr-1" />
                    <span>
                      {recipe.createdAt && isValid(new Date(recipe.createdAt)) 
                        ? formatDistanceToNow(new Date(recipe.createdAt), { addSuffix: true })
                        : "Date not available"}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Recipe main image */}
              <div className="mb-8 overflow-hidden rounded-xl shadow-md">
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.title} 
                  className="w-full h-auto object-cover max-h-[500px]" 
                />
              </div>
            </div>
            
            {/* Background color change for the content section */}
            <div className="bg-neutral-50 py-8">
              <div className="container mx-auto px-4">
                {/* Recipe info cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow-sm p-4 flex items-center">
                    <div className="bg-primary/10 p-3 rounded-full mr-4">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Prep Time</p>
                      <p className="font-semibold">{recipe.prepTime} minutes</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-4 flex items-center">
                    <div className="bg-primary/10 p-3 rounded-full mr-4">
                      <Thermometer className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cook Time</p>
                      <p className="font-semibold">{recipe.cookTime} minutes</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-4 flex items-center">
                    <div className="bg-primary/10 p-3 rounded-full mr-4">
                      <ChefHat className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Time</p>
                      <p className="font-semibold">{recipe.prepTime + recipe.cookTime} minutes</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Left column - Description and Instructions */}
                  <div className="md:col-span-2">
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                      <h2 className="font-display text-2xl font-bold text-gray-800 mb-4">
                        Description
                      </h2>
                      <p className="text-gray-600 leading-relaxed mb-4">
                        {(!recipe.description || recipe.description.trim() === "") ? (
                          <span className="italic text-gray-400">No description available</span>
                        ) : recipe.description}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
                      <h2 className="font-display text-2xl font-bold text-gray-800 mb-6">
                        Preparation Steps
                      </h2>
                      
                      <div className="space-y-6">
                        {recipe.instructions.map((instruction) => (
                          <div key={instruction.id} className="flex">
                            <div className="flex-shrink-0 mr-4">
                              <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                                {instruction.stepNumber}
                              </div>
                            </div>
                            <div className="bg-neutral-50 rounded-lg p-4 flex-grow">
                              <p className="text-gray-700">{instruction.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Nutritional Information Section */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                      <h2 className="font-display text-2xl font-bold text-gray-800 mb-6">
                        Nutritional Information
                      </h2>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-neutral-50 p-4 rounded-lg text-center">
                          <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                          <p className="text-sm text-gray-500 mb-1">Calories</p>
                          <p className="font-bold text-lg">{recipe.calories || "N/A"}</p>
                        </div>
                        
                        <div className="bg-neutral-50 p-4 rounded-lg text-center">
                          <Drumstick className="h-6 w-6 mx-auto mb-2 text-red-500" />
                          <p className="text-sm text-gray-500 mb-1">Protein</p>
                          <p className="font-bold text-lg">{recipe.protein || "N/A"} g</p>
                        </div>
                        
                        <div className="bg-neutral-50 p-4 rounded-lg text-center">
                          <Beef className="h-6 w-6 mx-auto mb-2 text-amber-700" />
                          <p className="text-sm text-gray-500 mb-1">Fats</p>
                          <p className="font-bold text-lg">{recipe.fats || "N/A"} g</p>
                        </div>
                        
                        <div className="bg-neutral-50 p-4 rounded-lg text-center">
                          <Apple className="h-6 w-6 mx-auto mb-2 text-green-500" />
                          <p className="text-sm text-gray-500 mb-1">Carbs</p>
                          <p className="font-bold text-lg">{recipe.carbs || "N/A"} g</p>
                        </div>
                      </div>
                      
                      <div className="mt-6 text-sm text-gray-500 italic">
                        <p>* Nutritional values are estimated and may vary based on specific ingredients and portion sizes.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right column - Ingredients */}
                  <div>
                    <div className="bg-white rounded-lg shadow-sm p-6 sticky top-20">
                      <h2 className="font-display text-2xl font-bold text-gray-800 mb-6">
                        Ingredients
                      </h2>
                      
                      <ul className="space-y-3">
                        {recipe.ingredients.map((ingredient) => (
                          <li key={ingredient.id} className="flex items-center pb-3 border-b border-gray-100">
                            <div className="w-2 h-2 rounded-full bg-primary mr-3"></div>
                            <span className="text-gray-800">
                              {ingredient.quantity} {ingredient.unit} {ingredient.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="mt-6 p-4 bg-neutral-50 rounded-lg border border-gray-100">
                        <div className="flex items-center text-gray-600">
                          <Utensils className="h-5 w-5 mr-2 text-primary" />
                          <p className="font-medium">Servings: {recipe.servings || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ) : (
          // No recipe found
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-lg mx-auto">
              <h2 className="text-2xl font-display font-bold text-gray-800 mb-4">
                Recipe Not Found
              </h2>
              <p className="text-gray-600 mb-8">
                The recipe you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
