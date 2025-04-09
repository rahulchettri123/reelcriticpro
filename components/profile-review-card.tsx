import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Film, MoreVertical, Edit, Trash2, Star, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProfileReviewCardProps {
  review: {
    _id: string;
    movie: string;
    movieTitle: string;
    moviePoster?: string;
    rating: number;
    content: string;
    createdAt: string;
  };
  isOwner: boolean;
  onReviewDeleted?: (reviewId: string) => void;
  onReviewUpdated?: (reviewId: string, newContent: string, newRating: number) => void;
}

export function ProfileReviewCard({ review, isOwner, onReviewDeleted, onReviewUpdated }: ProfileReviewCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState(review.content);
  const [editedRating, setEditedRating] = useState(review.rating);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Handle delete review
  const handleDeleteReview = async () => {
    if (!isOwner) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reviews/${review._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (response.ok) {
        toast({
          title: "Review deleted",
          description: "Your review has been successfully deleted.",
        });
        
        // Call the callback if provided
        if (onReviewDeleted) {
          onReviewDeleted(review._id);
        } else {
          // Refresh the page if no callback provided
          router.refresh();
        }
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to delete review. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete review:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };
  
  // Handle edit review
  const handleEditReview = async () => {
    if (!isOwner) return;
    
    setIsEditing(true);
    try {
      const response = await fetch(`/api/reviews/${review._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editedContent,
          rating: editedRating,
        }),
        credentials: "include",
      });
      
      if (response.ok) {
        toast({
          title: "Review updated",
          description: "Your review has been successfully updated.",
        });
        
        // Call the callback if provided
        if (onReviewUpdated) {
          onReviewUpdated(review._id, editedContent, editedRating);
        } else {
          // Update in place
          review.content = editedContent;
          review.rating = editedRating;
        }
        
        setEditDialogOpen(false);
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to update review. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update review:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        <div className="w-[100px] shrink-0">
          <div className="relative h-full min-h-[150px] bg-muted">
            {review.moviePoster ? (
              <Image
                src={review.moviePoster}
                alt={review.movieTitle}
                width={100}
                height={150}
                className="object-cover h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Film className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                <Link href={`/details/${review.movie}`} className="hover:underline">
                  {review.movieTitle}
                </Link>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  <span className="font-medium text-sm">{review.rating}/5</span>
                </div>
                
                {/* Review actions dropdown (edit/delete) - only for owner */}
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Review actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit review
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete review
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            <CardDescription>
              {new Date(review.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="line-clamp-3 text-sm">{review.content}</p>
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/reviews/${review._id}`}>Read Full Review</Link>
            </Button>
          </CardFooter>
        </div>
      </div>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your review of "{review.movieTitle}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteReview}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Edit review dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit your review</DialogTitle>
            <DialogDescription>
              Make changes to your review of "{review.movieTitle}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="rating" className="text-sm font-medium">
                Rating
              </label>
              <select 
                id="rating"
                value={editedRating}
                onChange={(e) => setEditedRating(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {[1, 2, 3, 4, 5].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Star' : 'Stars'}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="content" className="text-sm font-medium">
                Review Content
              </label>
              <Textarea
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={5}
                placeholder="Write your thoughts about the movie..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditReview}
              disabled={isEditing || !editedContent.trim()}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 