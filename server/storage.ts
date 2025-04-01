import { users, recipes, ingredients, instructions } from "@shared/schema";
import type { User, InsertUser, Recipe, InsertRecipe, Ingredient, InsertIngredient, Instruction, InsertInstruction } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Recipe methods
  getRecipe(id: number): Promise<Recipe | undefined>;
  getRecipes(): Promise<Recipe[]>;
  getRecipesByUser(userId: number): Promise<Recipe[]>;
  getTopRecipes(limit: number): Promise<Recipe[]>;
  getRecentRecipes(limit: number): Promise<Recipe[]>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: number, recipe: Partial<InsertRecipe>): Promise<Recipe | undefined>;
  deleteRecipe(id: number): Promise<boolean>;
  
  // Ingredient methods
  getIngredientsByRecipe(recipeId: number): Promise<Ingredient[]>;
  createIngredient(ingredient: InsertIngredient): Promise<Ingredient>;
  
  // Instruction methods
  getInstructionsByRecipe(recipeId: number): Promise<Instruction[]>;
  createInstruction(instruction: InsertInstruction): Promise<Instruction>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recipes: Map<number, Recipe>;
  private ingredients: Map<number, Ingredient>;
  private instructions: Map<number, Instruction>;
  
  userCurrentId: number;
  recipeCurrentId: number;
  ingredientCurrentId: number;
  instructionCurrentId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.recipes = new Map();
    this.ingredients = new Map();
    this.instructions = new Map();
    
    this.userCurrentId = 1;
    this.recipeCurrentId = 1;
    this.ingredientCurrentId = 1;
    this.instructionCurrentId = 1;
    
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
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
    // In a real app, this would sort by popularity/rating
    // For this demo, we'll just return the first N recipes
    return Array.from(this.recipes.values()).slice(0, limit);
  }
  
  async getRecentRecipes(limit: number): Promise<Recipe[]> {
    return Array.from(this.recipes.values())
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);
  }
  
  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const id = this.recipeCurrentId++;
    const createdAt = new Date();
    const recipe: Recipe = { ...insertRecipe, id, createdAt };
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
    const ingredient: Ingredient = { ...insertIngredient, id };
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
}

export const storage = new MemStorage();
