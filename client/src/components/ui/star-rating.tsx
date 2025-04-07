import React, { useState } from 'react';
import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onSetRating?: (rating: number) => void;
  editable?: boolean;
}

export function StarRating({
  rating,
  max = 5,
  size = 'md',
  className,
  onSetRating,
  editable = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  
  // Convert size to pixels
  const getSizeInPixels = () => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 24;
      case 'md':
      default:
        return 18;
    }
  };
  
  const starSize = getSizeInPixels();

  // Generate stars based on rating
  const renderStars = () => {
    const stars = [];
    const displayRating = editable && hoverRating > 0 ? hoverRating : rating;
    
    for (let i = 1; i <= max; i++) {
      const isActive = i <= Math.floor(displayRating);
      const isHalf = !isActive && i <= displayRating + 0.5;
      
      stars.push(
        <span
          key={i}
          className={cn(
            "cursor-default transition-colors",
            editable && "cursor-pointer"
          )}
          onMouseEnter={() => editable && setHoverRating(i)}
          onMouseLeave={() => editable && setHoverRating(0)}
          onClick={() => editable && onSetRating && onSetRating(i)}
        >
          {isActive ? (
            <Star
              fill="currentColor"
              className="text-yellow-500"
              size={starSize}
            />
          ) : isHalf ? (
            <div className="relative">
              <Star className="text-muted" size={starSize} />
              <StarHalf
                fill="currentColor"
                className="absolute top-0 left-0 text-yellow-500"
                size={starSize}
              />
            </div>
          ) : (
            <Star className="text-muted" size={starSize} />
          )}
        </span>
      );
    }
    
    return stars;
  };

  return (
    <div className={cn("flex", className)}>
      {renderStars()}
    </div>
  );
}