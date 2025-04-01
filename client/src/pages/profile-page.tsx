import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/recipe-card";
import { useQuery } from "@tanstack/react-query";
import { Recipe } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { PlusCircle, Settings, User as UserIcon } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  
  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes/user"],
    enabled: !!user,
  });
  
  // For a real app, you would get this data from the API
  const totalRecipes = recipes.length;
  const totalViews = 382; // Example static data for demo
  const joinedDate = user ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : '';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  if (!user) {
    return null; // Protected route should handle this
  }

  return (
    <div className="bg-neutral-50 min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Profile header */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="" alt={user.name} />
                  <AvatarFallback className="text-2xl bg-primary text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 text-center md:text-left">
                  <h1 className="font-display text-3xl font-bold text-gray-800 mb-2">
                    {user.name}
                  </h1>
                  <p className="text-gray-500 mb-4">@{user.username}</p>
                  
                  <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center md:justify-start mb-4">
                    <div>
                      <span className="font-semibold text-gray-800">{totalRecipes}</span>
                      <span className="text-gray-500 ml-1">Recipes</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">{totalViews}</span>
                      <span className="text-gray-500 ml-1">Views</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Joined {joinedDate}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <Button variant="outline" asChild>
                    <Link href="/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/add-recipe">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Recipe
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Profile content */}
            <Tabs defaultValue="recipes" className="w-full">
              <TabsList className="mb-8">
                <TabsTrigger value="recipes">My Recipes</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                <TabsTrigger value="about">About</TabsTrigger>
              </TabsList>
              
              <TabsContent value="recipes">
                {recipes.length > 0 ? (
                  <>
                    <h2 className="font-display text-2xl font-bold text-gray-800 mb-6">
                      My Recipes
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {recipes.map(recipe => (
                        <RecipeCard
                          key={recipe.id}
                          id={recipe.id}
                          title={recipe.title}
                          imageUrl={recipe.imageUrl}
                          prepTime={recipe.prepTime}
                          cookTime={recipe.cookTime}
                          difficulty={recipe.difficulty}
                          calories={recipe.calories}
                          author={user.name}
                          createdAt={recipe.createdAt}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>No recipes yet</CardTitle>
                      <CardDescription>
                        You haven't created any recipes yet. Start sharing your culinary creations!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link href="/add-recipe">
                        <Button>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Create Your First Recipe
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="favorites">
                <Card>
                  <CardHeader>
                    <CardTitle>Favorites</CardTitle>
                    <CardDescription>
                      Recipes you've saved as favorites will appear here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <UserIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">
                        You don't have any favorite recipes yet.
                      </p>
                      <p className="text-gray-500">
                        Browse recipes and click the heart icon to add them to your favorites.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="about">
                <Card>
                  <CardHeader>
                    <CardTitle>About {user.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Contact</h3>
                        <p className="text-gray-600">{user.email}</p>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Cooking Experience</h3>
                        <p className="text-gray-600">
                          No bio yet. Add your cooking experience and interests to your profile.
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Specialties</h3>
                        <p className="text-gray-600">
                          No specialties listed yet. Share what types of cuisine you specialize in.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
