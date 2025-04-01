import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertRecipeSchema } from "@shared/schema";
import { useLocation } from "wouter";
import { Plus, Trash2, Upload } from "lucide-react";

// Create a more detailed schema for the entire form including ingredients and instructions
const recipeFormSchema = z.object({
  recipe: insertRecipeSchema.omit({ userId: true }).extend({
    prepTime: z.coerce.number().min(1, "Prep time is required"),
    cookTime: z.coerce.number().min(1, "Cook time is required"),
    calories: z.coerce.number().optional(),
  }),
  ingredients: z.array(
    z.object({
      name: z.string().min(1, "Ingredient name is required"),
      quantity: z.string().min(1, "Quantity is required"),
      unit: z.string().optional(),
    })
  ).min(1, "At least one ingredient is required"),
  instructions: z.array(
    z.object({
      stepNumber: z.number(),
      description: z.string().min(1, "Step description is required"),
    })
  ).min(1, "At least one instruction step is required"),
});

type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export default function AddRecipePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      recipe: {
        title: "",
        description: "",
        imageUrl: "",
        prepTime: 0,
        cookTime: 0,
        difficulty: "Easy",
        calories: undefined,
      },
      ingredients: [
        { name: "", quantity: "", unit: "" }
      ],
      instructions: [
        { stepNumber: 1, description: "" }
      ],
    },
  });

  // Set up field arrays for ingredients and instructions
  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = 
    useFieldArray({
      control: form.control,
      name: "ingredients",
    });

  const { fields: instructionFields, append: appendInstruction, remove: removeInstruction } = 
    useFieldArray({
      control: form.control,
      name: "instructions",
    });

  const addRecipeMutation = useMutation({
    mutationFn: async (data: RecipeFormValues) => {
      const res = await apiRequest("POST", "/api/recipes", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Recipe created!",
        description: "Your recipe has been added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/top"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes/user"] });
      navigate("/my-recipes");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create recipe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: RecipeFormValues) {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to add a recipe",
        variant: "destructive",
      });
      return;
    }

    addRecipeMutation.mutate(values);
  }

  const handleAddIngredient = () => {
    appendIngredient({ name: "", quantity: "", unit: "" });
  };

  const handleAddInstruction = () => {
    const newStepNumber = instructionFields.length + 1;
    appendInstruction({ stepNumber: newStepNumber, description: "" });
  };

  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-800 mb-6 text-center">
              Add a New Recipe
            </h1>
            <p className="text-gray-600 mb-8 text-center">
              Share your culinary creation with the Flavor-Forge community
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Recipe Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Provide the core details about your recipe
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recipe.title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipe Title</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Classic Spaghetti Carbonara" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recipe.description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your recipe and what makes it special..." 
                              className="min-h-24"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="recipe.imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input placeholder="Enter an image URL for your recipe" {...field} />
                              <Button 
                                type="button" 
                                variant="outline"
                                className="flex-shrink-0"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Browse
                              </Button>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Provide a URL to an image of your finished recipe
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recipe.prepTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prep Time (minutes)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipe.cookTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cook Time (minutes)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="recipe.difficulty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Difficulty</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Easy">Easy</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="recipe.calories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Calories (optional)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" placeholder="e.g. 450" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Ingredients */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Ingredients</CardTitle>
                      <CardDescription>
                        List all ingredients needed for your recipe
                      </CardDescription>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAddIngredient}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {ingredientFields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2">
                          <FormField
                            control={form.control}
                            name={`ingredients.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="flex-1 max-w-[100px]">
                                <FormLabel className={index !== 0 ? "sr-only" : undefined}>
                                  Amount
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="2" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`ingredients.${index}.unit`}
                            render={({ field }) => (
                              <FormItem className="flex-1 max-w-[120px]">
                                <FormLabel className={index !== 0 ? "sr-only" : undefined}>
                                  Unit
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="cups" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`ingredients.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className={index !== 0 ? "sr-only" : undefined}>
                                  Ingredient
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="flour" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeIngredient(index)}
                              className="flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Instructions */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle>Instructions</CardTitle>
                      <CardDescription>
                        Provide step-by-step instructions for preparing your recipe
                      </CardDescription>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAddInstruction}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {instructionFields.map((field, index) => (
                        <div key={field.id} className="flex gap-4">
                          <div className="flex-shrink-0 pt-4">
                            <div className="bg-primary w-8 h-8 rounded-full flex items-center justify-center text-white font-medium">
                              {index + 1}
                            </div>
                          </div>
                          <FormField
                            control={form.control}
                            name={`instructions.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className={index !== 0 ? "sr-only" : undefined}>
                                  Step {index + 1}
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder={`Describe step ${index + 1}...`}
                                    className="min-h-20"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {index > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeInstruction(index)}
                              className="flex-shrink-0 mt-4"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-center pt-4">
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="px-8"
                    disabled={addRecipeMutation.isPending}
                  >
                    {addRecipeMutation.isPending ? "Submitting..." : "Submit Recipe"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
