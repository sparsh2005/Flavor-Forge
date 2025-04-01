import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ChefHat, Menu, X } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <ChefHat className="text-primary h-6 w-6 mr-2" />
              <span className="text-xl font-display font-bold text-gray-800">Flavor-Forge</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className={`font-medium ${isActive('/') ? 'text-primary' : 'text-gray-800 hover:text-primary'} transition-all`}>
              Home
            </Link>
            
            {user ? (
              <>
                <Link href="/add-recipe" className={`font-medium ${isActive('/add-recipe') ? 'text-primary' : 'text-gray-800 hover:text-primary'} transition-all`}>
                  Add Recipe
                </Link>
                <Link href="/my-recipes" className={`font-medium ${isActive('/my-recipes') ? 'text-primary' : 'text-gray-800 hover:text-primary'} transition-all`}>
                  My Recipes
                </Link>
                <Link href="/profile" className={`font-medium ${isActive('/profile') ? 'text-primary' : 'text-gray-800 hover:text-primary'} transition-all`}>
                  Profile
                </Link>
                <Button 
                  variant="primary-outline" 
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth">
                  <Button variant="primary-outline">Login</Button>
                </Link>
                <Link href="/auth">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
          
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu} className="text-gray-800">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white p-4 border-t border-gray-200">
          <div className="flex flex-col space-y-4">
            <Link href="/" className={`font-medium ${isActive('/') ? 'text-primary' : 'text-gray-800 hover:text-primary'} transition-all`}>
              Home
            </Link>
            
            {user ? (
              <>
                <Link href="/add-recipe" className={`font-medium ${isActive('/add-recipe') ? 'text-primary' : 'text-gray-800 hover:text-primary'} transition-all`}>
                  Add Recipe
                </Link>
                <Link href="/my-recipes" className={`font-medium ${isActive('/my-recipes') ? 'text-primary' : 'text-gray-800 hover:text-primary'} transition-all`}>
                  My Recipes
                </Link>
                <Link href="/profile" className={`font-medium ${isActive('/profile') ? 'text-primary' : 'text-gray-800 hover:text-primary'} transition-all`}>
                  Profile
                </Link>
                <Button 
                  variant="default" 
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="w-full"
                >
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </Button>
              </>
            ) : (
              <div className="pt-2 space-y-2">
                <Link href="/auth" className="w-full block">
                  <Button variant="primary-outline" className="w-full">Login</Button>
                </Link>
                <Link href="/auth" className="w-full block">
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
