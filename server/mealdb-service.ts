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
  return {
    id: parseInt(meal.idMeal),
    title: meal.strMeal,
    description: meal.strInstructions.slice(0, 200) + "...", // Short preview
    imageUrl: meal.strMealThumb,
    prepTime: 20, // Estimated since TheMealDB doesn't provide this
    cookTime: 40, // Estimated since TheMealDB doesn't provide this
    difficulty: getDifficultyFromInstructions(meal.strInstructions),
    calories: null, // TheMealDB doesn't provide this
    userId: 0, // Set to 0 for API-sourced recipes
    createdAt: new Date(),
    source: meal.strSource ? new URL(meal.strSource).hostname : "TheMealDB"
  } as Recipe;
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