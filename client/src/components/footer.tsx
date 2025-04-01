import { ChefHat, Facebook, Instagram, Twitter, Send } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <ChefHat className="text-primary h-6 w-6 mr-2" />
              <span className="text-xl font-display font-bold">Flavor-Forge</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Discover, create, and share amazing recipes with food enthusiasts from around the world.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-primary transition-all">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-all">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary transition-all">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary transition-all">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary transition-all">
                  Browse Recipes
                </Link>
              </li>
              <li>
                <Link href="/add-recipe" className="text-gray-400 hover:text-primary transition-all">
                  Add Recipe
                </Link>
              </li>
              <li>
                <Link href="/my-recipes" className="text-gray-400 hover:text-primary transition-all">
                  My Recipes
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-gray-400 hover:text-primary transition-all">
                  Profile
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Categories</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary transition-all">
                  Breakfast
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary transition-all">
                  Lunch
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary transition-all">
                  Dinner
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary transition-all">
                  Desserts
                </Link>
              </li>
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary transition-all">
                  Vegetarian
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">Subscribe</h3>
            <p className="text-sm text-gray-400 mb-4">
              Get weekly recipes and cooking tips delivered to your inbox.
            </p>
            <div className="flex">
              <Input 
                type="email" 
                placeholder="Your email" 
                className="flex-1 rounded-r-none bg-gray-700 border-gray-600 text-white focus:border-primary" 
              />
              <Button className="rounded-l-none">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-10 pt-6 text-center">
          <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Flavor-Forge. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
