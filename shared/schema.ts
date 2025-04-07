import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  name: true,
  password: true,
  bio: true,
  avatarUrl: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Recipe schema
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  prepTime: integer("prep_time").notNull(), // in minutes
  cookTime: integer("cook_time").notNull(), // in minutes
  difficulty: text("difficulty").notNull(), // 'Easy', 'Medium', 'Hard'
  calories: integer("calories"),
  protein: integer("protein"), // in grams
  fats: integer("fats"), // in grams
  carbs: integer("carbs"), // in grams
  servings: integer("servings"),
  rating: real("rating"), // Average rating, calculated from reviews
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  source: text("source"), // Source of the recipe (e.g., TheMealDB, user submitted)
  cookingTips: text("cooking_tips"), // Optional cooking tips
  tags: text("tags").array(), // Array of tags like "Vegan", "Quick", etc.
});

export const insertRecipeSchema = createInsertSchema(recipes).pick({
  title: true,
  description: true,
  imageUrl: true,
  prepTime: true,
  cookTime: true,
  difficulty: true,
  calories: true,
  protein: true,
  fats: true,
  carbs: true,
  servings: true,
  rating: true,
  userId: true,
  source: true,
  cookingTips: true,
  tags: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// Ingredient schema
export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull(),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit"),
});

export const insertIngredientSchema = createInsertSchema(ingredients).pick({
  recipeId: true,
  name: true,
  quantity: true,
  unit: true,
});

export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredients.$inferSelect;

// Instruction schema
export const instructions = pgTable("instructions", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull(),
  stepNumber: integer("step_number").notNull(),
  description: text("description").notNull(),
});

export const insertInstructionSchema = createInsertSchema(instructions).pick({
  recipeId: true,
  stepNumber: true,
  description: true,
});

export type InsertInstruction = z.infer<typeof insertInstructionSchema>;
export type Instruction = typeof instructions.$inferSelect;

// Reviews and Ratings table
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key to users
  recipeId: integer("recipe_id").notNull(), // Foreign key to recipes
  rating: integer("rating").notNull(), // 1-5 rating
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  userId: true,
  recipeId: true,
  rating: true,
  comment: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Favorites table (many-to-many relationship between users and recipes)
export const favorites = pgTable("favorites", {
  userId: integer("user_id").notNull(), // Foreign key to users
  recipeId: integer("recipe_id").notNull(), // Foreign key to recipes
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.recipeId] }),
  };
});

export const insertFavoriteSchema = createInsertSchema(favorites).pick({
  userId: true,
  recipeId: true,
});

export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

// Shopping List table
export const shoppingList = pgTable("shopping_list", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key to users
  item: text("item").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  checked: boolean("checked").default(false).notNull(),
  recipeId: integer("recipe_id"), // Optional, to know which recipe this item is from
  spoonacularId: integer("spoonacular_id"), // Optional, to store Spoonacular ingredient ID for nutrition data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertShoppingListSchema = createInsertSchema(shoppingList).pick({
  userId: true,
  item: true,
  quantity: true,
  unit: true,
  checked: true,
  recipeId: true,
  spoonacularId: true,
});

export type InsertShoppingListItem = z.infer<typeof insertShoppingListSchema>;
export type ShoppingListItem = typeof shoppingList.$inferSelect;

// Meal Planner table
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key to users
  recipeId: integer("recipe_id").notNull(), // Foreign key to recipes
  plannedDate: timestamp("planned_date").notNull(),
  mealType: text("meal_type").notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).pick({
  userId: true,
  recipeId: true,
  plannedDate: true,
  mealType: true,
  notes: true,
});

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

// User Activity Log table
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key to users
  action: text("action").notNull(), // 'create_recipe', 'review', 'favorite', etc.
  entityId: integer("entity_id"), // ID of the related entity (recipe, review, etc.)
  entityType: text("entity_type"), // 'recipe', 'review', 'shopping_list', etc.
  details: text("details"), // Optional additional details
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  userId: true,
  action: true,
  entityId: true,
  entityType: true,
  details: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
