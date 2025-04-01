import { Link } from "wouter";
import { Timer, User, Star } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecipeCardProps {
  id: number;
  title: string;
  imageUrl: string;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  calories?: number;
  author: string;
  rating?: number;
  createdAt?: Date;
  showCreatedAt?: boolean;
}

export function RecipeCard({
  id,
  title,
  imageUrl,
  prepTime,
  cookTime,
  difficulty,
  calories,
  author,
  rating,
  createdAt,
  showCreatedAt = false
}: RecipeCardProps) {
  const totalTime = prepTime + cookTime;
  
  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-secondary';
      case 'medium':
        return 'bg-yellow-500';
      case 'hard':
        return 'bg-orange-500';
      default:
        return 'bg-secondary';
    }
  };
  
  const difficultyColor = getDifficultyColor(difficulty);

  return (
    <div className="recipe-card bg-white rounded-lg overflow-hidden shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),_0_2px_4px_-1px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.08),_0_4px_6px_-2px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-1">
      <Link href={`/recipes/${id}`}>
        <div className="relative h-56 overflow-hidden">
          <img 
            src={imageUrl} 
            alt={title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 bg-white/90 text-xs font-medium text-gray-800 px-2 py-1 rounded-full flex items-center">
            <Timer className="h-3 w-3 mr-1" /> {totalTime} min
          </div>
        </div>
        
        <div className="p-4">
          <div className="flex items-center mb-2">
            <span className={`text-xs font-medium text-white ${difficultyColor} px-2 py-1 rounded-full mr-2`}>
              {difficulty}
            </span>
            {calories && (
              <span className="text-xs text-neutral-dark flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mr-1">
                  <path d="M12 2v10"></path>
                  <path d="m17.5 17.5-8.5-8.5-8.5 8.5"></path>
                  <path d="M17.5 7.5 12 2 6.5 7.5"></path>
                </svg> 
                {calories} cal
              </span>
            )}
          </div>
          
          <h3 className="font-display font-bold text-lg mb-2 leading-tight">{title}</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm text-neutral-dark flex items-center">
                <User className="h-3 w-3 mr-1" /> {author}
              </span>
            </div>
            {rating ? (
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-primary text-primary" />
                <span className="text-sm font-medium ml-1">{rating}</span>
              </div>
            ) : showCreatedAt && createdAt ? (
              <div className="flex items-center">
                <span className="text-xs text-neutral-dark">
                  Added {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
