import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Review } from "@shared/schema";
import { getQueryFn, queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { StarRating } from "@/components/ui/star-rating";
import { Loader2, Star, StarHalf } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Define the props for the component
interface RecipeReviewsProps {
  recipeId: number;
  recipeTitle: string;
}

// Schema for the review form
const reviewSchema = z.object({
  rating: z
    .number()
    .min(1, "Please select a rating")
    .max(5, "Rating cannot be more than 5 stars"),
  comment: z
    .string()
    .min(3, "Comment must be at least 3 characters long")
    .max(500, "Comment cannot be more than 500 characters"),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

export function RecipeReviews({ recipeId, recipeTitle }: RecipeReviewsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Query to get the reviews for this recipe
  const {
    data: reviews,
    isLoading: isLoadingReviews,
    error: reviewsError,
  } = useQuery<(Review & { userName: string })[]>({
    queryKey: ["/api/recipes", recipeId, "reviews"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!recipeId,
  });
  
  // Query to get the average rating
  const {
    data: averageRating,
    isLoading: isLoadingRating,
  } = useQuery<{ rating: number | null }>({
    queryKey: ["/api/recipes", recipeId, "rating"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!recipeId,
  });
  
  // Form for submitting a review
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      comment: "",
    },
  });
  
  // Mutation to submit a review
  const submitReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      const res = await apiRequest("POST", `/api/recipes/${recipeId}/reviews`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Review submitted",
        description: `Thank you for reviewing ${recipeTitle}!`,
      });
      form.reset();
      
      // Invalidate the queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/recipes", recipeId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes", recipeId, "rating"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Function to format the date
  const formatReviewDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Handle form submission
  function onSubmit(values: ReviewFormValues) {
    submitReviewMutation.mutate(values);
  }
  
  // Display stars for average rating
  const renderAverageRating = () => {
    if (isLoadingRating) return <Loader2 className="h-4 w-4 animate-spin" />;
    
    const rating = averageRating?.rating || 0;
    if (rating === 0) return <span>No ratings yet</span>;
    
    return (
      <div className="flex items-center">
        <StarRating rating={rating} max={5} />
        <span className="ml-2 text-sm text-muted-foreground">
          {rating.toFixed(1)} ({reviews?.length || 0} {reviews?.length === 1 ? "review" : "reviews"})
        </span>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Reviews</h2>
        {renderAverageRating()}
      </div>
      
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Write a Review</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating</FormLabel>
                      <FormControl>
                        <StarRating
                          rating={field.value}
                          max={5}
                          onSetRating={(rating: number) => field.onChange(rating)}
                          editable
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="comment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comment</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Share your thoughts about this recipe..."
                          {...field}
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>
                        Your review will help others discover great recipes!
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  disabled={submitReviewMutation.isPending}
                  className="w-full"
                >
                  {submitReviewMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
      
      {isLoadingReviews ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : reviewsError ? (
        <p className="text-destructive">Error loading reviews</p>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {review.userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="flex items-center">
                      <h4 className="font-semibold">{review.userName}</h4>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <StarRating rating={review.rating} max={5} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatReviewDate(review.createdAt)}
                    </p>
                    <p className="mt-2">{review.comment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No reviews yet. Be the first to review this recipe!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}