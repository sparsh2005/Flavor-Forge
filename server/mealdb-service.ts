import { Recipe, Ingredient, Instruction } from "@shared/schema";
import fetch from "node-fetch";

const MEALDB_API_URL = "https://www.themealdb.com/api/json/v1/1";

// Define TheMealDB response types
interface MealDbMeal {
  idMeal: string;
  strMeal: string;
  strInstructions: string;
  strMealThumb: string;
  strCategory?: string;
  strSource?: string;
  [key: string]: string | undefined; // For ingredients and measures (strIngredient1, strMeasure1, etc.)
}

interface MealDbResponse {
  meals: MealDbMeal[] | null;
}

interface MealDbCategoryResponse {
  categories: {
    strCategory: string;
    [key: string]: string | undefined;
  }[] | null;
}

// Utility function to convert TheMealDB recipe to our Recipe format
function convertMealToRecipe(meal: MealDbMeal): Recipe {
  // Estimate calorie content based on ingredients and category
  const estimatedCalories = estimateCalories(meal);
  
  // Estimate protein, fats, and carbs based on the category and ingredients
  const { protein, fats, carbs } = estimateNutrition(meal);
  
  // Estimate servings based on ingredients or use default
  const servings = estimateServings(meal);
  
  return {
    id: parseInt(meal.idMeal),
    title: meal.strMeal,
    description: meal.strInstructions.slice(0, 200) + "...", // Short preview
    imageUrl: meal.strMealThumb,
    prepTime: 20, // Estimated since TheMealDB doesn't provide this
    cookTime: 40, // Estimated since TheMealDB doesn't provide this
    difficulty: getDifficultyFromInstructions(meal.strInstructions),
    calories: estimatedCalories,
    protein: protein,
    fats: fats,
    carbs: carbs,
    servings: servings,
    userId: 0, // Set to 0 for API-sourced recipes
    createdAt: new Date(),
    source: meal.strSource ? new URL(meal.strSource).hostname : "TheMealDB"
  } as Recipe;
}

// Estimate calories based on category and ingredients
function estimateCalories(meal: MealDbMeal): number | null {
  if (!meal) return null;
  
  // Get calorie baseline by category
  const category = meal.strCategory?.toLowerCase() || '';
  let baseCalories = 0;
  
  if (category.includes('dessert') || category.includes('cake')) {
    baseCalories = 400;
  } else if (category.includes('beef') || category.includes('lamb') || category.includes('pork')) {
    baseCalories = 500;
  } else if (category.includes('chicken') || category.includes('turkey')) {
    baseCalories = 350;
  } else if (category.includes('seafood') || category.includes('fish')) {
    baseCalories = 300;
  } else if (category.includes('vegetarian') || category.includes('vegan') || category.includes('vegetable')) {
    baseCalories = 250;
  } else if (category.includes('pasta') || category.includes('rice')) {
    baseCalories = 450;
  } else if (category.includes('breakfast')) {
    baseCalories = 350;
  } else {
    baseCalories = 400; // Default
  }
  
  // Count ingredients as a multiplier
  const ingredientCount = countIngredients(meal);
  // More ingredients usually means a more complex dish, which can be higher in calories
  const multiplier = 1 + (ingredientCount > 10 ? 0.2 : ingredientCount > 5 ? 0.1 : 0);
  
  return Math.round(baseCalories * multiplier);
}

// Estimate protein, fats, and carbs
function estimateNutrition(meal: MealDbMeal): { protein: number | null; fats: number | null; carbs: number | null } {
  if (!meal) return { protein: null, fats: null, carbs: null };
  
  const calories = estimateCalories(meal) || 400;
  const category = meal.strCategory?.toLowerCase() || '';
  
  let proteinPercentage = 0.25; // Default 25% of calories from protein
  let fatsPercentage = 0.3; // Default 30% of calories from fats
  let carbsPercentage = 0.45; // Default 45% of calories from carbs
  
  // Adjust percentages based on category
  if (category.includes('beef') || category.includes('lamb') || category.includes('pork') || category.includes('chicken')) {
    proteinPercentage = 0.4;
    fatsPercentage = 0.35;
    carbsPercentage = 0.25;
  } else if (category.includes('seafood') || category.includes('fish')) {
    proteinPercentage = 0.35;
    fatsPercentage = 0.3;
    carbsPercentage = 0.35;
  } else if (category.includes('vegetarian') || category.includes('vegan') || category.includes('vegetable')) {
    proteinPercentage = 0.15;
    fatsPercentage = 0.25;
    carbsPercentage = 0.6;
  } else if (category.includes('dessert') || category.includes('cake')) {
    proteinPercentage = 0.05;
    fatsPercentage = 0.3;
    carbsPercentage = 0.65;
  } else if (category.includes('pasta') || category.includes('rice')) {
    proteinPercentage = 0.15;
    fatsPercentage = 0.25;
    carbsPercentage = 0.6;
  }
  
  // Convert percentages to grams (protein and carbs = 4 cal/g, fats = 9 cal/g)
  const protein = Math.round((calories * proteinPercentage) / 4);
  const carbs = Math.round((calories * carbsPercentage) / 4);
  const fats = Math.round((calories * fatsPercentage) / 9);
  
  return { protein, fats, carbs };
}

// Count number of ingredients in a meal
function countIngredients(meal: MealDbMeal): number {
  let count = 0;
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    if (ingredient && ingredient.trim() !== "") {
      count++;
    }
  }
  return count;
}

// Estimate number of servings
function estimateServings(meal: MealDbMeal): number {
  if (!meal) return 4; // Default
  
  const category = meal.strCategory?.toLowerCase() || '';
  const ingredientCount = countIngredients(meal);
  
  // Desserts and breakfasts usually serve more people
  if (category.includes('dessert') || category.includes('cake')) {
    return 8;
  } else if (category.includes('breakfast')) {
    return 2;
  } else if (ingredientCount > 12) {
    return 6; // More ingredients often means more servings
  } else if (ingredientCount > 8) {
    return 4;
  } else {
    return 2; // Simpler dishes
  }
}

// Helper to estimate difficulty based on instruction length and complexity
function getDifficultyFromInstructions(instructions: string): string {
  if (!instructions) return "Medium";
  
  const wordCount = instructions.split(/\s+/).length;
  const stepCount = instructions.split(/\.\s+/).length;
  
  if (wordCount > 300 || stepCount > 10) return "Hard";
  if (wordCount > 150 || stepCount > 5) return "Medium";
  return "Easy";
}

// Extract ingredients from meal data
function extractIngredients(meal: MealDbMeal, recipeId: number): Ingredient[] {
  const ingredients: Ingredient[] = [];
  
  // TheMealDB stores ingredients and measurements in numbered properties
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    
    if (ingredient && ingredient.trim() !== "") {
      ingredients.push({
        id: i,
        name: ingredient,
        quantity: measure ? measure.trim() : "",
        unit: "",
        recipeId
      });
    }
  }
  
  return ingredients;
}

// Create instructions from the meal instructions text
function createInstructions(instructions: string, recipeId: number): Instruction[] {
  return instructions
    .split(/\.\s+/)
    .filter(step => step.trim().length > 0)
    .map((step, index) => ({
      id: index + 1,
      stepNumber: index + 1,
      description: step.trim() + ".",
      recipeId
    }));
}

export async function getRandomMeals(count: number = 10): Promise<Recipe[]> {
  const recipes: Recipe[] = [];
  
  // TheMealDB only returns one random meal at a time, so we need to make multiple requests
  const requests = Array(count).fill(null).map(() => 
    fetch(`${MEALDB_API_URL}/random.php`)
      .then(response => response.json())
      .then((data: unknown) => {
        const typedData = data as MealDbResponse;
        if (typedData.meals && typedData.meals[0]) {
          const recipe = convertMealToRecipe(typedData.meals[0]);
          recipes.push(recipe);
        }
      })
      .catch(err => console.error("Error fetching random meal:", err))
  );
  
  await Promise.all(requests);
  return recipes;
}

export async function getMealsByCategory(category: string): Promise<Recipe[]> {
  try {
    const response = await fetch(`${MEALDB_API_URL}/filter.php?c=${category}`);
    const data = await response.json() as MealDbResponse;
    
    if (!data.meals) return [];
    
    // Filter API only returns basic info, we need to fetch full details
    const detailedRecipes = await Promise.all(
      data.meals.slice(0, 10).map(async (meal: MealDbMeal) => {
        const detailResponse = await fetch(`${MEALDB_API_URL}/lookup.php?i=${meal.idMeal}`);
        const detailData = await detailResponse.json() as MealDbResponse;
        if (detailData.meals && detailData.meals[0]) {
          return convertMealToRecipe(detailData.meals[0]);
        }
        return null;
      })
    );
    
    return detailedRecipes.filter((recipe): recipe is Recipe => recipe !== null);
  } catch (error) {
    console.error("Error fetching meals by category:", error);
    return [];
  }
}

export async function getRecipeDetails(id: number): Promise<{
  recipe: Recipe;
  ingredients: Ingredient[];
  instructions: Instruction[];
  authorName: string;
} | null> {
  try {
    const response = await fetch(`${MEALDB_API_URL}/lookup.php?i=${id}`);
    const data = await response.json() as MealDbResponse;
    
    if (!data.meals || !data.meals[0]) return null;
    
    const meal = data.meals[0];
    const recipe = convertMealToRecipe(meal);
    const ingredients = extractIngredients(meal, recipe.id);
    const instructions = createInstructions(meal.strInstructions, recipe.id);
    
    return {
      recipe,
      ingredients,
      instructions,
      authorName: meal.strSource ? new URL(meal.strSource).hostname : "TheMealDB",
    };
  } catch (error) {
    console.error("Error fetching recipe details:", error);
    return null;
  }
}

export async function getPopularCategories(): Promise<string[]> {
  try {
    const response = await fetch(`${MEALDB_API_URL}/categories.php`);
    const data = await response.json() as MealDbCategoryResponse;
    
    if (!data.categories) return [];
    
    return data.categories
      .slice(0, 8)
      .map(category => category.strCategory);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function searchMeals(query: string): Promise<Recipe[]> {
  try {
    console.log(`Searching meals with query: "${query}"`);
    const url = `${MEALDB_API_URL}/search.php?s=${encodeURIComponent(query)}`;
    console.log(`Making request to: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json() as MealDbResponse;
    
    console.log(`Search response status: ${response.status}`);
    console.log(`Found meals: ${data.meals ? data.meals.length : 0}`);
    
    if (!data.meals) {
      console.log('No meals found in search response');
      return [];
    }
    
    const recipes = data.meals.map(meal => convertMealToRecipe(meal));
    console.log(`Converted ${recipes.length} meals to recipes`);
    return recipes;
  } catch (error) {
    console.error("Error searching meals:", error);
    return [];
  }
}