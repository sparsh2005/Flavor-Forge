import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertRecipeSchema, 
  insertIngredientSchema, 
  insertInstructionSchema,
  Recipe,
  insertReviewSchema,
  insertFavoriteSchema,
  insertShoppingListSchema,
  insertMealPlanSchema,
  insertActivityLogSchema
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
import {
  searchIngredients,
  getIngredientNutrition,
  getIngredientById
} from "./spoonacular-service";

export async function registerRoutes(app: Express): Promise<Server> {
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
          recipe,
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

  // ====== REVIEWS & RATINGS ROUTES ======
  
  // Get reviews for a recipe
  app.get("/api/recipes/:id/reviews", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const reviews = await storage.getReviewsByRecipe(recipeId);
      
      // For each review, get the user's name
      const reviewsWithUserNames = await Promise.all(
        reviews.map(async (review) => {
          const user = await storage.getUser(review.userId);
          return {
            ...review,
            userName: user ? user.name : "Unknown",
          };
        })
      );
      
      res.json(reviewsWithUserNames);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });
  
  // Get average rating for a recipe
  app.get("/api/recipes/:id/rating", async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const rating = await storage.getAverageRating(recipeId);
      res.json({ rating });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });
  
  // Create a review for a recipe
  app.post("/api/recipes/:id/reviews", ensureAuthenticated, async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Validate the request body
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        userId,
        recipeId
      });
      
      // Create the review
      const review = await storage.createReview(reviewData);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "review_recipe",
        entityId: review.id,
        entityType: "review",
        details: `Reviewed recipe ${recipeId} with rating ${review.rating}`
      });
      
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to create review" });
    }
  });
  
  // Update a review
  app.put("/api/reviews/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if review exists and belongs to this user
      const existingReview = await storage.getReviewsByUser(userId)
        .then(reviews => reviews.find(r => r.id === id));
      
      if (!existingReview) {
        return res.status(404).json({ message: "Review not found or not authorized" });
      }
      
      // Update the review
      const updatedReview = await storage.updateReview(id, req.body);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "update_review",
        entityId: id,
        entityType: "review",
        details: `Updated review ${id} for recipe ${existingReview.recipeId}`
      });
      
      res.json(updatedReview);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to update review" });
    }
  });
  
  // Delete a review
  app.delete("/api/reviews/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if review exists and belongs to this user
      const existingReview = await storage.getReviewsByUser(userId)
        .then(reviews => reviews.find(r => r.id === id));
      
      if (!existingReview) {
        return res.status(404).json({ message: "Review not found or not authorized" });
      }
      
      // Delete the review
      await storage.deleteReview(id);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "delete_review",
        entityId: existingReview.recipeId,
        entityType: "recipe",
        details: `Deleted review for recipe ${existingReview.recipeId}`
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete review" });
    }
  });
  
  // ====== FAVORITES ROUTES ======
  
  // Get user's favorites
  app.get("/api/favorites", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const favorites = await storage.getFavorites(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });
  
  // Check if a recipe is favorited by the user
  app.get("/api/recipes/:id/favorite", ensureAuthenticated, async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const isFavorite = await storage.isFavorite(userId, recipeId);
      res.json({ isFavorite });
    } catch (error) {
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });
  
  // Add a recipe to favorites
  app.post("/api/favorites", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate the request body
      const favoriteData = insertFavoriteSchema.parse({
        ...req.body,
        userId
      });
      
      // Check if already favorited
      const isFavorite = await storage.isFavorite(userId, favoriteData.recipeId);
      if (isFavorite) {
        return res.status(400).json({ message: "Recipe already in favorites" });
      }
      
      // Add to favorites
      const favorite = await storage.addFavorite(favoriteData);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "add_favorite",
        entityId: favoriteData.recipeId,
        entityType: "recipe",
        details: `Added recipe ${favoriteData.recipeId} to favorites`
      });
      
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });
  
  // Remove a recipe from favorites
  app.delete("/api/favorites/:recipeId", ensureAuthenticated, async (req, res) => {
    try {
      const recipeId = parseInt(req.params.recipeId);
      const userId = req.user!.id;
      
      // Check if actually favorited
      const isFavorite = await storage.isFavorite(userId, recipeId);
      if (!isFavorite) {
        return res.status(404).json({ message: "Recipe not in favorites" });
      }
      
      // Remove from favorites
      await storage.removeFavorite(userId, recipeId);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "remove_favorite",
        entityId: recipeId,
        entityType: "recipe",
        details: `Removed recipe ${recipeId} from favorites`
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });
  
  // ====== SHOPPING LIST ROUTES ======
  
  // Get user's shopping list
  app.get("/api/shopping-list", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const items = await storage.getShoppingList(userId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shopping list" });
    }
  });
  
  // Add an item to shopping list
  app.post("/api/shopping-list", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate the request body
      const itemData = insertShoppingListSchema.parse({
        ...req.body,
        userId
      });
      
      // Add to shopping list
      const item = await storage.addToShoppingList(itemData);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "add_shopping_item",
        entityId: item.id,
        entityType: "shopping_item",
        details: `Added ${item.item} to shopping list`
      });
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to add to shopping list" });
    }
  });
  
  // Add all ingredients from a recipe to shopping list
  app.post("/api/recipes/:id/add-to-shopping-list", ensureAuthenticated, async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get the recipe and its ingredients
      const recipe = await storage.getRecipe(recipeId);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      const ingredients = await storage.getIngredientsByRecipe(recipeId);
      
      // Add each ingredient to the shopping list
      const items = await Promise.all(
        ingredients.map(ingredient => 
          storage.addToShoppingList({
            userId,
            item: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit || null,
            recipeId,
            checked: false
          })
        )
      );
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "add_recipe_to_shopping_list",
        entityId: recipeId,
        entityType: "recipe",
        details: `Added all ingredients from recipe ${recipeId} (${recipe.title}) to shopping list`
      });
      
      res.status(201).json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to add recipe ingredients to shopping list" });
    }
  });
  
  // Update a shopping list item
  app.put("/api/shopping-list/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if item exists and belongs to this user
      const userItems = await storage.getShoppingList(userId);
      const existingItem = userItems.find(item => item.id === id);
      
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found or not authorized" });
      }
      
      // Update the item
      const updatedItem = await storage.updateShoppingListItem(id, req.body);
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to update shopping list item" });
    }
  });
  
  // Delete a shopping list item
  app.delete("/api/shopping-list/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if item exists and belongs to this user
      const userItems = await storage.getShoppingList(userId);
      const existingItem = userItems.find(item => item.id === id);
      
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found or not authorized" });
      }
      
      // Delete the item
      await storage.deleteShoppingListItem(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete shopping list item" });
    }
  });
  
  // Clear shopping list
  app.delete("/api/shopping-list", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Clear shopping list
      await storage.clearShoppingList(userId);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "clear_shopping_list",
        details: "Cleared shopping list"
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to clear shopping list" });
    }
  });
  
  // ====== MEAL PLANNING ROUTES ======
  
  // Get user's meal plans
  app.get("/api/meal-plans", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const mealPlans = await storage.getMealPlans(userId);
      
      // Get the corresponding recipes
      const mealPlansWithRecipes = await Promise.all(
        mealPlans.map(async (plan) => {
          const recipe = await storage.getRecipe(plan.recipeId);
          return {
            ...plan,
            recipe: recipe || null
          };
        })
      );
      
      res.json(mealPlansWithRecipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });
  
  // Get meal plans for a specific date
  app.get("/api/meal-plans/date/:date", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const date = new Date(req.params.date);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const mealPlans = await storage.getMealPlansByDate(userId, date);
      
      // Get the corresponding recipes
      const mealPlansWithRecipes = await Promise.all(
        mealPlans.map(async (plan) => {
          const recipe = await storage.getRecipe(plan.recipeId);
          return {
            ...plan,
            recipe: recipe || null
          };
        })
      );
      
      res.json(mealPlansWithRecipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meal plans for date" });
    }
  });
  
  // Create a meal plan
  app.post("/api/meal-plans", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Validate the request body
      const mealPlanData = insertMealPlanSchema.parse({
        ...req.body,
        userId
      });
      
      // Check if recipe exists
      const recipe = await storage.getRecipe(mealPlanData.recipeId);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      
      // Create the meal plan
      const mealPlan = await storage.createMealPlan(mealPlanData);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "create_meal_plan",
        entityId: mealPlan.id,
        entityType: "meal_plan",
        details: `Added ${recipe.title} to meal plan for ${new Date(mealPlan.plannedDate).toLocaleDateString()} (${mealPlan.mealType})`
      });
      
      res.status(201).json({ ...mealPlan, recipe });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to create meal plan" });
    }
  });
  
  // Update a meal plan
  app.put("/api/meal-plans/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get all user's meal plans
      const userMealPlans = await storage.getMealPlans(userId);
      const existingMealPlan = userMealPlans.find(plan => plan.id === id);
      
      if (!existingMealPlan) {
        return res.status(404).json({ message: "Meal plan not found or not authorized" });
      }
      
      // Update the meal plan
      const updatedMealPlan = await storage.updateMealPlan(id, req.body);
      
      // Get the recipe
      const recipe = updatedMealPlan?.recipeId 
        ? await storage.getRecipe(updatedMealPlan.recipeId) 
        : null;
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "update_meal_plan",
        entityId: id,
        entityType: "meal_plan",
        details: `Updated meal plan for ${new Date(existingMealPlan.plannedDate).toLocaleDateString()}`
      });
      
      res.json({ ...updatedMealPlan, recipe });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to update meal plan" });
    }
  });
  
  // Delete a meal plan
  app.delete("/api/meal-plans/:id", ensureAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Get all user's meal plans
      const userMealPlans = await storage.getMealPlans(userId);
      const existingMealPlan = userMealPlans.find(plan => plan.id === id);
      
      if (!existingMealPlan) {
        return res.status(404).json({ message: "Meal plan not found or not authorized" });
      }
      
      // Delete the meal plan
      await storage.deleteMealPlan(id);
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "delete_meal_plan",
        entityId: existingMealPlan.recipeId,
        entityType: "recipe",
        details: `Removed recipe from meal plan for ${new Date(existingMealPlan.plannedDate).toLocaleDateString()}`
      });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete meal plan" });
    }
  });
  
  // ====== USER PROFILE & ACTIVITY ROUTES ======
  
  // Get user profile
  app.get("/api/profile", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send the password
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });
  
  // Update user profile
  app.put("/api/profile", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Don't allow updating password through this endpoint
      const { password, ...updateData } = req.body;
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't send the password
      const { password: _, ...userWithoutPassword } = updatedUser;
      
      // Log the activity
      await storage.createActivityLog({
        userId,
        action: "update_profile",
        details: "Updated user profile"
      });
      
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });
  
  // Get user activity log
  app.get("/api/activity-log", ensureAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const activityLogs = await storage.getActivityLogs(userId);
      res.json(activityLogs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });
  
  // ====== TAGGING & DISCOVERY ROUTES ======
  
  // Get recipes by tag
  app.get("/api/recipes/tag/:tag", async (req, res) => {
    try {
      const tag = req.params.tag;
      const limit = parseInt(req.query.limit as string) || undefined;
      
      const recipes = await storage.getRecipesByTag(tag, limit);
      res.json(recipes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recipes by tag" });
    }
  });
  
  // Get all available tags
  app.get("/api/tags", async (req, res) => {
    try {
      // Get all recipes, extract unique tags
      const recipes = await storage.getRecipes();
      const tags = new Set<string>();
      
      recipes.forEach(recipe => {
        if (recipe.tags) {
          recipe.tags.forEach(tag => tags.add(tag));
        }
      });
      
      res.json(Array.from(tags));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });
  
  // Recipe of the day (randomly selected featured recipe)
  app.get("/api/recipe-of-the-day", async (req, res) => {
    try {
      // Get all recipes
      const recipes = await storage.getRecipes();
      
      if (recipes.length === 0) {
        // If no local recipes, get one from the API
        const apiRecipes = await getRandomMeals(1);
        if (apiRecipes.length > 0) {
          return res.json(apiRecipes[0]);
        }
        return res.status(404).json({ message: "No recipes available" });
      }
      
      // Select a random recipe based on the date (changes daily but consistent within a day)
      const today = new Date();
      const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
      const dateHash = Array.from(dateString).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const index = dateHash % recipes.length;
      
      res.json(recipes[index]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recipe of the day" });
    }
  });

  // ====== SPOONACULAR API INTEGRATION ======
  
  // Search for ingredients by name
  app.get("/api/ingredients/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const ingredients = await searchIngredients(query);
      res.json(ingredients);
    } catch (error) {
      res.status(500).json({ message: "Failed to search ingredients" });
    }
  });
  
  // Get ingredient details by ID
  app.get("/api/ingredients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ingredient = await getIngredientById(id);
      
      if (!ingredient) {
        return res.status(404).json({ message: "Ingredient not found" });
      }
      
      res.json(ingredient);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ingredient details" });
    }
  });
  
  // Get nutrition information for an ingredient
  app.get("/api/ingredients/:id/nutrition", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const amount = parseFloat(req.query.amount as string || "1");
      const unit = req.query.unit as string || "";
      
      const nutrition = await getIngredientNutrition(id, amount, unit);
      
      if (!nutrition) {
        return res.status(404).json({ message: "Nutrition information not found" });
      }
      
      res.json(nutrition);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nutrition information" });
    }
  });
  
  // Update shopping list item with Spoonacular ID
  app.put("/api/shopping-list/:id/spoonacular", ensureAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user!.id;
      const spoonacularId = req.body.spoonacularId;
      
      if (!spoonacularId) {
        return res.status(400).json({ message: "spoonacularId is required" });
      }
      
      // Check if the shopping list item belongs to the user
      const userItems = await storage.getShoppingList(userId);
      const item = userItems.find(i => i.id === itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Shopping list item not found" });
      }
      
      // Update the shopping list item with the Spoonacular ID
      const updatedItem = await storage.updateShoppingListItem(itemId, { spoonacularId });
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update shopping list item" });
    }
  });
  
  // Search ingredients by name
  app.get("/api/ingredients/search", ensureAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const ingredients = await searchIngredients(query);
      res.json(ingredients);
    } catch (error) {
      res.status(500).json({ message: "Failed to search ingredients" });
    }
  });
  
  // Nutrition data for shopping list item
  app.get("/api/shopping-list/:id/nutrition", ensureAuthenticated, async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if the shopping list item belongs to the user
      const userItems = await storage.getShoppingList(userId);
      const item = userItems.find(i => i.id === itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Shopping list item not found" });
      }
      
      // If there's a Spoonacular ingredient ID stored with the item, use it
      if (item.spoonacularId) {
        const amount = parseFloat(item.quantity || "1");
        const unit = item.unit || "";
        const nutrition = await getIngredientNutrition(item.spoonacularId, amount, unit);
        
        if (nutrition) {
          return res.json(nutrition);
        }
      }
      
      // Otherwise, search for the ingredient by name and use the first result
      const searchResults = await searchIngredients(item.item);
      
      if (searchResults.length === 0) {
        return res.status(404).json({ message: "No nutritional data available for this item" });
      }
      
      // Use the first search result
      const amount = parseFloat(item.quantity || "1");
      const unit = item.unit || "";
      const nutrition = await getIngredientNutrition(searchResults[0].id, amount, unit);
      
      if (!nutrition) {
        return res.status(404).json({ message: "No nutritional data available for this item" });
      }
      
      res.json(nutrition);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nutrition information" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
