import React, { useState, useEffect } from 'react';

// Food image URLs for different categories - using optimized sizes
const foodImages = [
  {
    url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1400&auto=format&fit=crop",
    category: "Pizza",
  },
  {
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1400&auto=format&fit=crop",
    category: "Chicken",
  },
  {
    url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1400&auto=format&fit=crop",
    category: "Pasta",
  },
  {
    url: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?q=80&w=1400&auto=format&fit=crop",
    category: "Beef",
  },
  {
    url: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?q=80&w=1400&auto=format&fit=crop",
    category: "Seafood",
  },
  {
    url: "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?q=80&w=1400&auto=format&fit=crop",
    category: "Dessert",
  },
  {
    url: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?q=80&w=1400&auto=format&fit=crop",
    category: "Breakfast",
  },
  {
    url: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1400&auto=format&fit=crop",
    category: "Vegetarian",
  },
  {
    url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=1400&auto=format&fit=crop",
    category: "Japanese",
  },
  {
    url: "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?q=80&w=1400&auto=format&fit=crop",
    category: "Indian",
  },
];

export const HeroSlideshow = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>(new Array(foodImages.length).fill(false));
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);

  // Preload images
  useEffect(() => {
    const loadImage = (index: number) => {
      const img = new Image();
      img.src = foodImages[index].url;
      img.onload = () => {
        setImagesLoaded(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      };
    };

    foodImages.forEach((_, index) => loadImage(index));
  }, []);

  // Check if all images are loaded
  useEffect(() => {
    if (imagesLoaded.every(loaded => loaded)) {
      setAllImagesLoaded(true);
    }
  }, [imagesLoaded]);

  useEffect(() => {
    if (!allImagesLoaded) return;

    // Change image every 4 seconds (4000ms)
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % foodImages.length);
    }, 4000);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, [allImagesLoaded]);

  if (!allImagesLoaded) {
    return (
      <div className="absolute inset-0 w-full h-full bg-gray-900 animate-pulse">
        <div className="h-full w-full flex items-center justify-center">
          <div className="text-white text-lg">Loading amazing recipes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {foodImages.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            index === currentImageIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <div 
            className="absolute inset-0 bg-black opacity-40" 
            aria-hidden="true"
          />
          <img
            src={image.url}
            alt={`${image.category} food background`}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute bottom-4 right-4 bg-primary/80 rounded-full px-4 py-1 text-white text-sm font-medium">
            {image.category}
          </div>
        </div>
      ))}
    </div>
  );
};