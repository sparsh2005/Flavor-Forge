import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import RecipeDetailsPage from "@/pages/recipe-details-page";
import AddRecipePage from "@/pages/add-recipe-page";
import MyRecipesPage from "@/pages/my-recipes-page";
import ProfilePage from "@/pages/profile-page";
import SearchResultsPage from "@/pages/search-results-page";
import CategoryPage from "@/pages/category-page";
import ShoppingListPage from "@/pages/shopping-list-page";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/recipes/search" component={SearchResultsPage} />
      <Route path="/recipes/category/:category" component={CategoryPage} />
      <Route path="/recipes/:id" component={RecipeDetailsPage} />
      <ProtectedRoute path="/add-recipe" component={AddRecipePage} />
      <ProtectedRoute path="/my-recipes" component={MyRecipesPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/shopping-list" component={ShoppingListPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
