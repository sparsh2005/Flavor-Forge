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
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Utility function to add retry logic to fetch calls
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 8000,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      log(`Retrying fetch to ${url}, ${retries} attempts remaining`, "api");
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

/**
 * Search for ingredients by name
 */
export async function searchIngredients(query: string): Promise<SpoonacularIngredient[]> {
  if (!API_KEY) {
    log("Spoonacular API key is not configured", "api");
    return [];
  }

  try {
    const data = await fetchWithRetry(
      `${BASE_URL}/food/ingredients/search?apiKey=${API_KEY}&query=${encodeURIComponent(query)}&number=5&metaInformation=true`
    );
    
    return data.results.map((result: any) => ({
      id: result.id,
      name: result.name,
      image: `https://spoonacular.com/cdn/ingredients_100x100/${result.image}`,
      amount: 0,
      unit: "",
    }));
  } catch (error) {
    log(`Error searching ingredients: ${error}`, "api");
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