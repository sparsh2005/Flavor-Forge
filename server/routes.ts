import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertRecipeSchema, insertIngredientSchema, insertInstructionSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

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
  // Get all recipes
  app.get("/api/recipes", async (req, res) => {
    try {
      const recipes = await storage.getRecipes();
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  // Get top recipes
  app.get("/api/recipes/top", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 4;
      const recipes = await storage.getTopRecipes(limit);
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top recipes" });
    }
  });

  // Get recent recipes
  app.get("/api/recipes/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 3;
      const recipes = await storage.getRecentRecipes(limit);
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent recipes" });
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
      const recipe = await storage.getRecipe(id);
      
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      const ingredients = await storage.getIngredientsByRecipe(id);
      const instructions = await storage.getInstructionsByRecipe(id);
      
      // Get the author information
      const author = await storage.getUser(recipe.userId);
      const authorName = author ? author.name : "Unknown";
      
      res.json({
        ...recipe,
        ingredients,
        instructions,
        authorName
      });
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
