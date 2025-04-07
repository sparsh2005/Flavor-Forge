import fetch from "node-fetch";
import { log } from "./vite";

interface SpoonacularIngredient {
  id: number;
  name: string;
  image: string;
  amount: number;
  unit: string;
  nutrients?: {
    name: string;
    amount: number;
    unit: string;
  }[];
}

interface SpoonacularIngredientDetail {
  id: number;
  name: string;
  image: string;
  possibleUnits?: string[];
  nutrition?: {
    nutrients: {
      name: string;
      amount: number;
      unit: string;
    }[];
  };
}

interface SpoonacularIngredientSearchResponse {
  results: {
    id: number;
    name: string;
    image: string;
  }[];
}

interface SpoonacularNutritionResponse {
  nutrition: {
    nutrients: {
      name: string;
      amount: number;
      unit: string;
    }[];
  };
}

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = "https://api.spoonacular.com";

/**
 * Search for ingredients by name
 */
export async function searchIngredients(query: string): Promise<SpoonacularIngredient[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/food/ingredients/search?apiKey=${API_KEY}&query=${encodeURIComponent(query)}&number=5&metaInformation=true`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      log(`Spoonacular API error: ${response.status} ${errorText}`, "spoonacular");
      return [];
    }
    
    const data = (await response.json()) as SpoonacularIngredientSearchResponse;
    return data.results.map((result) => ({
      id: result.id,
      name: result.name,
      image: `https://spoonacular.com/cdn/ingredients_100x100/${result.image}`,
      amount: 0,
      unit: "",
    }));
  } catch (error) {
    log(`Error searching ingredients: ${error}`, "spoonacular");
    return [];
  }
}

/**
 * Get nutrition information for an ingredient
 */
export async function getIngredientNutrition(
  id: number,
  amount: number,
  unit: string
): Promise<{ calories: number; protein: number; fat: number; carbs: number } | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/food/ingredients/${id}/information?apiKey=${API_KEY}&amount=${amount}&unit=${encodeURIComponent(unit)}&nutrient=true`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      log(`Spoonacular API error: ${response.status} ${errorText}`, "spoonacular");
      return null;
    }
    
    const data = await response.json() as SpoonacularNutritionResponse;
    
    const getNutrient = (name: string) => {
      const nutrient = data.nutrition?.nutrients?.find(n => n.name.toLowerCase() === name.toLowerCase());
      return nutrient ? nutrient.amount : 0;
    };
    
    return {
      calories: getNutrient("calories"),
      protein: getNutrient("protein"),
      fat: getNutrient("fat"),
      carbs: getNutrient("carbohydrates")
    };
  } catch (error) {
    log(`Error getting ingredient nutrition: ${error}`, "spoonacular");
    return null;
  }
}

/**
 * Get ingredient information by ID
 */
export async function getIngredientById(id: number): Promise<SpoonacularIngredient | null> {
  try {
    const response = await fetch(
      `${BASE_URL}/food/ingredients/${id}/information?apiKey=${API_KEY}&amount=1`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      log(`Spoonacular API error: ${response.status} ${errorText}`, "spoonacular");
      return null;
    }
    
    const data = await response.json() as SpoonacularIngredientDetail;
    
    return {
      id: data.id,
      name: data.name,
      image: `https://spoonacular.com/cdn/ingredients_100x100/${data.image}`,
      amount: 1,
      unit: data.possibleUnits?.[0] || "",
      nutrients: data.nutrition?.nutrients
    };
  } catch (error) {
    log(`Error getting ingredient by ID: ${error}`, "spoonacular");
    return null;
  }
}