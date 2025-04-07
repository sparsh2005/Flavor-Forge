import { users, recipes, ingredients, instructions, reviews, favorites, shoppingList, mealPlans, activityLogs } from "@shared/schema";
import type { User, InsertUser, Recipe, InsertRecipe, Ingredient, InsertIngredient, 
  Instruction, InsertInstruction, Review, InsertReview, Favorite, InsertFavorite,
  ShoppingListItem, InsertShoppingListItem, MealPlan, InsertMealPlan, ActivityLog, InsertActivityLog } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

// Fix type definition for SessionStore
declare module "express-session" {
  interface SessionStore extends session.Store {}
}

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Recipe methods
  getRecipe(id: number): Promise<Recipe | undefined>;
  getRecipes(): Promise<Recipe[]>;
  getRecipesByUser(userId: number): Promise<Recipe[]>;
  getTopRecipes(limit: number): Promise<Recipe[]>;
  getRecentRecipes(limit: number): Promise<Recipe[]>;
  getRecipesByTag(tag: string, limit?: number): Promise<Recipe[]>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: number, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined>;
  deleteRecipe(id: number): Promise<boolean>;
  
  // Ingredient methods
  getIngredientsByRecipe(recipeId: number): Promise<Ingredient[]>;
  createIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  
  // Instruction methods
  getInstructionsByRecipe(recipeId: number): Promise<Instruction[]>;
  createInstruction(instruction: InsertInstruction): Promise<Instruction>;
  
  // Review methods
  getReviewsByRecipe(recipeId: number): Promise<Review[]>;
  getReviewsByUser(userId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, review: Partial<InsertReview>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;
  getAverageRating(recipeId: number): Promise<number | null>;
  
  // Favorites methods
  getFavorites(userId: number): Promise<Recipe[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, recipeId: number): Promise<boolean>;
  isFavorite(userId: number, recipeId: number): Promise<boolean>;
  
  // Shopping List methods
  getShoppingList(userId: number): Promise<ShoppingListItem[]>;
  getShoppingListItem(id: number): Promise<ShoppingListItem | undefined>;
  addToShoppingList(item: InsertShoppingListItem): Promise<ShoppingListItem>;
  updateShoppingListItem(id: number, item: Partial<InsertShoppingListItem>): Promise<ShoppingListItem | undefined>;
  deleteShoppingListItem(id: number): Promise<boolean>;
  clearShoppingList(userId: number): Promise<boolean>;
  
  // Meal Plan methods
  getMealPlans(userId: number): Promise<MealPlan[]>;
  getMealPlansByDate(userId: number, date: Date): Promise<MealPlan[]>;
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(id: number, mealPlan: Partial<InsertMealPlan>): Promise<MealPlan | undefined>;
  deleteMealPlan(id: number): Promise<boolean>;
  
  // Activity Log methods
  getActivityLogs(userId: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recipes: Map<number, Recipe>;
  private ingredients: Map<number, Ingredient>;
  private instructions: Map<number, Instruction>;
  private reviews: Map<number, Review>;
  private favorites: Map<string, Favorite>; // Using userId-recipeId as key
  private shoppingItems: Map<number, ShoppingListItem>;
  private mealPlans: Map<number, MealPlan>;
  private activityLogs: Map<number, ActivityLog>;
  
  userCurrentId: number;
  recipeCurrentId: number;
  ingredientCurrentId: number;
  instructionCurrentId: number;
  reviewCurrentId: number;
  shoppingItemCurrentId: number;
  mealPlanCurrentId: number;
  activityLogCurrentId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.recipes = new Map();
    this.ingredients = new Map();
    this.instructions = new Map();
    this.reviews = new Map();
    this.favorites = new Map();
    this.shoppingItems = new Map();
    this.mealPlans = new Map();
    this.activityLogs = new Map();
    
    this.userCurrentId = 1;
    this.recipeCurrentId = 1;
    this.ingredientCurrentId = 1;
    this.instructionCurrentId = 1;
    this.reviewCurrentId = 1;
    this.shoppingItemCurrentId = 1;
    this.mealPlanCurrentId = 1;
    this.activityLogCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt,
      bio: insertUser.bio || null,
      avatarUrl: insertUser.avatarUrl || null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...userUpdate };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Recipe methods
  async getRecipe(id: number): Promise<Recipe | undefined> {
    return this.recipes.get(id);
  }
  
  async getRecipes(): Promise<Recipe[]> {
    return Array.from(this.recipes.values());
  }
  
  async getRecipesByUser(userId: number): Promise<Recipe[]> {
    return Array.from(this.recipes.values()).filter(
      (recipe) => recipe.userId === userId
    );
  }
  
  async getTopRecipes(limit: number): Promise<Recipe[]> {
    // Get average ratings for all recipes
    const recipeRatings = new Map<number, number>();
    const recipes = Array.from(this.recipes.values());
    
    for (let i = 0; i < recipes.length; i++) {
      const recipe = recipes[i];
      const avgRating = await this.getAverageRating(recipe.id);
      recipeRatings.set(recipe.id, avgRating || 0);
    }
    
    // Sort recipes by rating and return top N
    return recipes
      .sort((a, b) => (recipeRatings.get(b.id) || 0) - (recipeRatings.get(a.id) || 0))
      .slice(0, limit);
  }
  
  async getRecentRecipes(limit: number): Promise<Recipe[]> {
    return Array.from(this.recipes.values())
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);
  }
  
  async getRecipesByTag(tag: string, limit?: number): Promise<Recipe[]> {
    const recipes = Array.from(this.recipes.values())
      .filter(recipe => recipe.tags && recipe.tags.includes(tag));
    
    return limit ? recipes.slice(0, limit) : recipes;
  }
  
  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const id = this.recipeCurrentId++;
    const createdAt = new Date();
    const recipe: Recipe = { 
      ...insertRecipe, 
      id, 
      createdAt,
      calories: insertRecipe.calories || null,
      protein: insertRecipe.protein || null,
      fats: insertRecipe.fats || null,
      carbs: insertRecipe.carbs || null,
      servings: insertRecipe.servings || null,
      rating: insertRecipe.rating || null,
      source: insertRecipe.source || null,
      cookingTips: insertRecipe.cookingTips || null,
      tags: insertRecipe.tags || null
    };
    this.recipes.set(id, recipe);
    return recipe;
  }
  
  async updateRecipe(id: number, recipeUpdate: Partial<InsertRecipe>): Promise<Recipe | undefined> {
    const existingRecipe = this.recipes.get(id);
    if (!existingRecipe) return undefined;
    
    const updatedRecipe = { ...existingRecipe, ...recipeUpdate };
    this.recipes.set(id, updatedRecipe);
    return updatedRecipe;
  }
  
  async deleteRecipe(id: number): Promise<boolean> {
    return this.recipes.delete(id);
  }
  
  // Ingredient methods
  async getIngredientsByRecipe(recipeId: number): Promise<Ingredient[]> {
    return Array.from(this.ingredients.values()).filter(
      (ingredient) => ingredient.recipeId === recipeId
    );
  }
  
  async createIngredient(insertIngredient: InsertIngredient): Promise<Ingredient> {
    const id = this.ingredientCurrentId++;
    const ingredient: Ingredient = { 
      ...insertIngredient, 
      id,
      unit: insertIngredient.unit || null
    };
    this.ingredients.set(id, ingredient);
    return ingredient;
  }
  
  // Instruction methods
  async getInstructionsByRecipe(recipeId: number): Promise<Instruction[]> {
    return Array.from(this.instructions.values())
      .filter((instruction) => instruction.recipeId === recipeId)
      .sort((a, b) => a.stepNumber - b.stepNumber);
  }
  
  async createInstruction(insertInstruction: InsertInstruction): Promise<Instruction> {
    const id = this.instructionCurrentId++;
    const instruction: Instruction = { ...insertInstruction, id };
    this.instructions.set(id, instruction);
    return instruction;
  }
  
  // Review methods
  async getReviewsByRecipe(recipeId: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.recipeId === recipeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getReviewsByUser(userId: number): Promise<Review[]> {
    return Array.from(this.reviews.values())
      .filter(review => review.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.reviewCurrentId++;
    const createdAt = new Date();
    const review: Review = { ...insertReview, id, createdAt };
    this.reviews.set(id, review);
    return review;
  }
  
  async updateReview(id: number, reviewUpdate: Partial<InsertReview>): Promise<Review | undefined> {
    const existingReview = this.reviews.get(id);
    if (!existingReview) return undefined;
    
    const updatedReview = { ...existingReview, ...reviewUpdate };
    this.reviews.set(id, updatedReview);
    return updatedReview;
  }
  
  async deleteReview(id: number): Promise<boolean> {
    return this.reviews.delete(id);
  }
  
  async getAverageRating(recipeId: number): Promise<number | null> {
    const reviews = await this.getReviewsByRecipe(recipeId);
    if (reviews.length === 0) return null;
    
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return parseFloat((sum / reviews.length).toFixed(1));
  }
  
  // Favorites methods
  async getFavorites(userId: number): Promise<Recipe[]> {
    const userFavorites = Array.from(this.favorites.values())
      .filter(favorite => favorite.userId === userId);
    
    const favoriteRecipes = await Promise.all(
      userFavorites.map(async favorite => this.getRecipe(favorite.recipeId))
    );
    
    return favoriteRecipes.filter((recipe): recipe is Recipe => recipe !== undefined);
  }
  
  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const key = `${insertFavorite.userId}-${insertFavorite.recipeId}`;
    const createdAt = new Date();
    const favorite: Favorite = { ...insertFavorite, createdAt };
    this.favorites.set(key, favorite);
    return favorite;
  }
  
  async removeFavorite(userId: number, recipeId: number): Promise<boolean> {
    const key = `${userId}-${recipeId}`;
    return this.favorites.delete(key);
  }
  
  async isFavorite(userId: number, recipeId: number): Promise<boolean> {
    const key = `${userId}-${recipeId}`;
    return this.favorites.has(key);
  }
  
  // Shopping List methods
  async getShoppingList(userId: number): Promise<ShoppingListItem[]> {
    return Array.from(this.shoppingItems.values())
      .filter(item => item.userId === userId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  
  async getShoppingListItem(id: number): Promise<ShoppingListItem | undefined> {
    return this.shoppingItems.get(id);
  }
  
  async addToShoppingList(insertItem: InsertShoppingListItem): Promise<ShoppingListItem> {
    const id = this.shoppingItemCurrentId++;
    const createdAt = new Date();
    const item: ShoppingListItem = { 
      ...insertItem, 
      id, 
      createdAt,
      recipeId: insertItem.recipeId || null,
      quantity: insertItem.quantity || null,
      unit: insertItem.unit || null,
      checked: insertItem.checked || false,
      spoonacularId: insertItem.spoonacularId || null
    };
    this.shoppingItems.set(id, item);
    return item;
  }
  
  async updateShoppingListItem(id: number, itemUpdate: Partial<InsertShoppingListItem>): Promise<ShoppingListItem | undefined> {
    const existingItem = this.shoppingItems.get(id);
    if (!existingItem) return undefined;
    
    const updatedItem = { ...existingItem, ...itemUpdate };
    this.shoppingItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async deleteShoppingListItem(id: number): Promise<boolean> {
    return this.shoppingItems.delete(id);
  }
  
  async clearShoppingList(userId: number): Promise<boolean> {
    const userItems = Array.from(this.shoppingItems.values())
      .filter(item => item.userId === userId);
    
    for (const item of userItems) {
      this.shoppingItems.delete(item.id);
    }
    
    return true;
  }
  
  // Meal Plan methods
  async getMealPlans(userId: number): Promise<MealPlan[]> {
    return Array.from(this.mealPlans.values())
      .filter(plan => plan.userId === userId)
      .sort((a, b) => new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime());
  }
  
  async getMealPlansByDate(userId: number, date: Date): Promise<MealPlan[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return Array.from(this.mealPlans.values())
      .filter(plan => {
        const planDate = new Date(plan.plannedDate);
        planDate.setHours(0, 0, 0, 0);
        return plan.userId === userId && planDate.getTime() === targetDate.getTime();
      })
      .sort((a, b) => {
        // Sort by meal type: breakfast, lunch, dinner, snack
        const mealTypeOrder: Record<string, number> = {
          breakfast: 1,
          lunch: 2,
          dinner: 3,
          snack: 4
        };
        return (mealTypeOrder[a.mealType] || 99) - (mealTypeOrder[b.mealType] || 99);
      });
  }
  
  async createMealPlan(insertMealPlan: InsertMealPlan): Promise<MealPlan> {
    const id = this.mealPlanCurrentId++;
    const createdAt = new Date();
    const mealPlan: MealPlan = { 
      ...insertMealPlan, 
      id, 
      createdAt,
      notes: insertMealPlan.notes || null
    };
    this.mealPlans.set(id, mealPlan);
    return mealPlan;
  }
  
  async updateMealPlan(id: number, mealPlanUpdate: Partial<InsertMealPlan>): Promise<MealPlan | undefined> {
    const existingMealPlan = this.mealPlans.get(id);
    if (!existingMealPlan) return undefined;
    
    const updatedMealPlan = { ...existingMealPlan, ...mealPlanUpdate };
    this.mealPlans.set(id, updatedMealPlan);
    return updatedMealPlan;
  }
  
  async deleteMealPlan(id: number): Promise<boolean> {
    return this.mealPlans.delete(id);
  }
  
  // Activity Log methods
  async getActivityLogs(userId: number): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogCurrentId++;
    const createdAt = new Date();
    const activityLog: ActivityLog = { 
      ...insertLog, 
      id, 
      createdAt,
      entityId: insertLog.entityId || null,
      entityType: insertLog.entityType || null,
      details: insertLog.details || null
    };
    this.activityLogs.set(id, activityLog);
    return activityLog;
  }
}

export const storage = new MemStorage();
