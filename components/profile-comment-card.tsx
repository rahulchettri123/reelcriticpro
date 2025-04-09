import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { MoreVertical, Edit, Trash2, Loader2, MessageSquare } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";

interface Comment {
  _id: string;
  reviewId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  movieTitle: string;
}

interface ProfileCommentCardProps {
  comment: Comment;
  isOwner: boolean;
  onCommentDeleted?: (commentId: string) => void;
  onCommentUpdated?: (commentId: string, newContent: string) => void;
}

export function ProfileCommentCard({ 
  comment, 
  isOwner, 
  onCommentDeleted, 
  onCommentUpdated 
}: ProfileCommentCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to render comment text with @ mention highlighting
  const renderCommentWithMentions = (text: string) => {
    // Look for mentions at the start of the text
    const startMentionMatch = text.match(/^@(\w+)\s/);
    
    if (startMentionMatch) {
      const mention = startMentionMatch[0];
      const mentionLength = mention.length;
      const restOfText = text.substring(mentionLength);
      
      return (
        <>
          <span className="text-primary font-bold">
            {mention.trim()}
          </span>
          {" "}{restOfText}
        </>
      );
    }
    
    // If no mention at the start, just return the text
    return text;
  };

  // Handle delete comment
  const handleDeleteComment = async () => {
    if (!isOwner) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/reviews/${comment.reviewId}/comment/${comment._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (response.ok) {
        toast({
          title: "Comment deleted",
          description: "Your comment has been successfully deleted.",
        });
        
        // Call the callback if provided
        if (onCommentDeleted) {
          onCommentDeleted(comment._id);
        } else {
          // Refresh the page if no callback provided
          router.refresh();
        }
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to delete comment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
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
  
  // Start editing the comment
  const startEditing = () => {
    setIsEditing(true);
    setEditedContent(comment.content);
    
    // Focus the textarea after a small delay to allow rendering
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };
  
  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditedContent(comment.content);
  };
  
  // Save edited comment
  const saveComment = async () => {
    if (!isOwner || !editedContent.trim()) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/reviews/${comment.reviewId}/comment/${comment._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editedContent.trim()
        }),
        credentials: "include",
      });
      
      if (response.ok) {
        toast({
          title: "Comment updated",
          description: "Your comment has been successfully updated.",
        });
        
        // Call the callback if provided
        if (onCommentUpdated) {
          onCommentUpdated(comment._id, editedContent.trim());
        } else {
          // Update in place
          comment.content = editedContent.trim();
          comment.updatedAt = new Date().toISOString();
        }
        
        setIsEditing(false);
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to update comment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <Link href={`/reviews/${comment.reviewId}`} className="font-medium hover:underline text-sm">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Comment on {comment.movieTitle}
            </span>
          </Link>
          
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              {comment.updatedAt && comment.updatedAt !== comment.createdAt && " (edited)"}
            </span>
            
            {/* Comment actions dropdown (edit/delete) - only for owner */}
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-1">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Comment actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={startEditing}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit comment
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete comment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea 
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[80px] text-sm resize-none"
            />
          </div>
        ) : (
          <p className="text-sm">
            {renderCommentWithMentions(comment.content)}
          </p>
        )}
      </CardContent>
      
      {isEditing && (
        <CardFooter className="p-4 pt-0 flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={cancelEditing}
          >
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={saveComment}
            disabled={!editedContent.trim() || isUpdating}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </CardFooter>
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteComment}
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
    </Card>
  );
} 