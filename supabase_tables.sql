-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  avatarUrl TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for the users table
CREATE POLICY "Users can view their own profile"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Create recipes table
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  imageUrl TEXT,
  prepTime INTEGER,
  cookTime INTEGER,
  difficulty TEXT,
  calories INTEGER,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Create policies for the recipes table
CREATE POLICY "Recipes are viewable by everyone"
  ON recipes
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own recipes"
  ON recipes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON recipes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON recipes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create ingredients table
CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  quantity TEXT,
  unit TEXT,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Create policies for the ingredients table
CREATE POLICY "Ingredients are viewable by everyone"
  ON ingredients
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create ingredients for their recipes"
  ON ingredients
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ingredients for their recipes"
  ON ingredients
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ingredients for their recipes"
  ON ingredients
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

-- Create instructions table
CREATE TABLE instructions (
  id SERIAL PRIMARY KEY,
  stepNumber INTEGER NOT NULL,
  description TEXT NOT NULL,
  recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE instructions ENABLE ROW LEVEL SECURITY;

-- Create policies for the instructions table
CREATE POLICY "Instructions are viewable by everyone"
  ON instructions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create instructions for their recipes"
  ON instructions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update instructions for their recipes"
  ON instructions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete instructions for their recipes"
  ON instructions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE recipes.id = recipe_id 
      AND recipes.user_id = auth.uid()
    )
  ); 