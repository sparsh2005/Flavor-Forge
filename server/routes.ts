import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertRecipeSchema, 
  insertIngredientSchema, 
  insertInstructionSchema,
  Recipe
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  getRandomMeals, 
  getMealsByCategory, 
  getRecipeDetails,
  getPopularCategories,
  searchMeals
} from "./mealdb-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Ensure user is authenticated for protected routes
  const ensureAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Recipe routes
  // Get all recipes (from local storage + TheMealDB API)
  app.get("/api/recipes", async (req, res) => {
    try {
      // Get local recipes
      const localRecipes = await storage.getRecipes();
      
      // Get recipes from TheMealDB API (only if we don't have many local recipes)
      let apiRecipes: Recipe[] = [];
      if (localRecipes.length < 10) {
        apiRecipes = await getRandomMeals(10 - localRecipes.length);
      }
      
      // Combine local and API recipes
      const recipes = [...localRecipes, ...apiRecipes];
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  // Get top recipes (from TheMealDB API if no local recipes)
  app.get("/api/recipes/top", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      
      // Get top recipes from storage
      const localRecipes = await storage.getTopRecipes(limit);
      
      // If we have enough local recipes, return them
      if (localRecipes.length >= limit) {
        return res.json(localRecipes);
      }
      
      // Otherwise, supplement with API recipes
      const apiRecipes = await getRandomMeals(limit - localRecipes.length);
      const recipes = [...localRecipes, ...apiRecipes];
      
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top recipes" });
    }
  });

  // Get recent recipes (from TheMealDB API if no local recipes)
  app.get("/api/recipes/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 3;
      
      // Get recent recipes from storage
      const localRecipes = await storage.getRecentRecipes(limit);
      
      // If we have enough local recipes, return them
      if (localRecipes.length >= limit) {
        return res.json(localRecipes);
      }
      
      // Otherwise, supplement with API recipes
      const apiRecipes = await getRandomMeals(limit - localRecipes.length);
      const recipes = [...localRecipes, ...apiRecipes];
      
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent recipes" });
    }
  });
  
  // Get meal categories from TheMealDB API
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await getPopularCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  
  // Get recipes by category from TheMealDB API
  app.get("/api/recipes/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const recipes = await getMealsByCategory(category);
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recipes by category" });
    }
  });
  
  // Search for recipes from TheMealDB API
  app.get("/api/recipes/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const recipes = await searchMeals(query);
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to search recipes" });
    }
  });

  // Get recipes by user ID
  app.get("/api/recipes/user", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const recipes = await storage.getRecipesByUser(userId);
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user recipes" });
    }
  });

  // Get single recipe with ingredients and instructions
  app.get("/api/recipes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // First, try to get from local storage
      const recipe = await storage.getRecipe(id);
      
      if (recipe) {
        // This is a local recipe, get its ingredients, instructions, and author
        const ingredients = await storage.getIngredientsByRecipe(id);
        const instructions = await storage.getInstructionsByRecipe(id);
        
        // Get the author information
        const author = await storage.getUser(recipe.userId);
        const authorName = author ? author.name : "Unknown";
        
        return res.json({
          ...recipe,
          ingredients,
          instructions,
          authorName
        });
      }
      
      // If not found in local storage, try getting from TheMealDB API
      // TheMealDB API has IDs that are typically much larger than our local IDs
      // so this fallback will mostly be used for API recipes
      const recipeDetails = await getRecipeDetails(id);
      
      if (!recipeDetails) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      // Return the recipe details from the API
      res.json(recipeDetails);
      
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  // Create a new recipe
  app.post("/api/recipes", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Create a schema for the combined recipe data
      const createRecipeSchema = z.object({
        recipe: insertRecipeSchema,
        ingredients: z.array(insertIngredientSchema.omit({ recipeId: true })),
        instructions: z.array(insertInstructionSchema.omit({ recipeId: true }))
      });
      
      // Validate the request body
      const { recipe: recipeData, ingredients: ingredientsData, instructions: instructionsData } = 
        createRecipeSchema.parse({
          ...req.body,
          recipe: { ...req.body.recipe, userId }
        });
      
      // Create the recipe
      const recipe = await storage.createRecipe(recipeData);
      
      // Add ingredients
      const ingredients = await Promise.all(
        ingredientsData.map(ingredient => 
          storage.createIngredient({ ...ingredient, recipeId: recipe.id })
        )
      );
      
      // Add instructions
      const instructions = await Promise.all(
        instructionsData.map(instruction => 
          storage.createInstruction({ ...instruction, recipeId: recipe.id })
        )
      );
      
      res.status(201).json({ recipe, ingredients, instructions });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  // Update a recipe
  app.put("/api/recipes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if recipe exists and belongs to this user
      const existingRecipe = await storage.getRecipe(id);
      if (!existingRecipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      if (existingRecipe.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this recipe" });
      }
      
      // Update the recipe
      const updatedRecipe = await storage.updateRecipe(id, req.body);
      res.json(updatedRecipe);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  // Delete a recipe
  app.delete("/api/recipes/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if recipe exists and belongs to this user
      const existingRecipe = await storage.getRecipe(id);
      if (!existingRecipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      if (existingRecipe.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this recipe" });
      }
      
      // Delete the recipe
      await storage.deleteRecipe(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
