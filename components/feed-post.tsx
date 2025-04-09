"use client"

import { useState, useCallback, memo, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Heart, MessageCircle, Share2, Star, Send, Loader2, MoreVertical, Edit, Trash2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Comment {
  _id: string
  user: {
    _id: string
    name: string
    username: string
    avatar?: string
  }
  content: string
  parentId: string | null
  replies: Comment[]
  likes: string[]
  createdAt: string
  updatedAt: string
}

interface FeedPostProps {
  review: {
    _id: string
    user: {
      _id: string
      name: string
      username: string
      avatar?: string
    }
    movie: string
    movieTitle: string
    moviePoster?: string
    rating: number
    content: string
    likes: string[]
    comments: Comment[]
    createdAt: string
  }
}

export const FeedPost = memo(({ review }: FeedPostProps) => {
  const { isAuthenticated, user } = useAuth()
  const { toast } = useToast()
  const [liked, setLiked] = useState(review.likes.includes(user?._id || ""))
  const [likesCount, setLikesCount] = useState(review.likes.length)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [commentsCount, setCommentsCount] = useState(review.comments.length)
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editedContent, setEditedContent] = useState(review.content)
  const [editedRating, setEditedRating] = useState(review.rating)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Determine if current user is the post author
  const isPostAuthor = isAuthenticated && user?._id === review.user._id
  
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Check if user is following this post's author
  useEffect(() => {
    if (!isAuthenticated || !user || user._id === review.user._id) {
      return
    }
    
    const checkFollowStatus = async () => {
      try {
        const response = await fetch(`/api/user/following/check?userId=${review.user._id}`)
        if (response.ok) {
          const data = await response.json()
          setIsFollowing(data.isFollowing)
        }
      } catch (error) {
        console.error("Failed to check follow status:", error)
      }
    }
    
    checkFollowStatus()
  }, [isAuthenticated, user, review.user._id])

  // Handle follow/unfollow
  const handleFollowToggle = useCallback(async () => {
    if (!isAuthenticated || followLoading) return
    
    setFollowLoading(true)
    try {
      const action = isFollowing ? "unfollow" : "follow"
      const response = await fetch(`/api/user/following`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: review.user._id,
          action
        }),
        credentials: "include",
      })
      
      if (response.ok) {
        setIsFollowing(!isFollowing)
      }
    } catch (error) {
      console.error(`Failed to ${isFollowing ? 'unfollow' : 'follow'} user:`, error)
    } finally {
      setFollowLoading(false)
    }
  }, [isAuthenticated, isFollowing, followLoading, review.user._id])

  // Only load comments when needed
  const loadComments = useCallback(async () => {
    if (commentsLoaded) {
      return
    }
    
    try {
      const response = await fetch(`/api/reviews/${review._id}/comment`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
        setCommentsLoaded(true)
      }
    } catch (error) {
      console.error("Failed to load comments:", error)
    }
  }, [review._id, commentsLoaded])

  const handleLike = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const action = liked ? "unlike" : "like"
      const response = await fetch(`/api/reviews/${review._id}/like`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
        credentials: "include",
      })

      if (response.ok) {
        setLiked(!liked)
        setLikesCount(prev => liked ? prev - 1 : prev + 1)
      }
    } catch (error) {
      console.error("Failed to like/unlike:", error)
    }
  }, [isAuthenticated, liked, review._id])

  const handleSubmitComment = useCallback(async (e: React.FormEvent, parentCommentId?: string) => {
    e.preventDefault()
    if (!commentText.trim() || !isAuthenticated || isSubmitting) return

    // Ensure mention is at the beginning if it's a reply
    let finalContent = commentText;
    if (parentCommentId && replyingTo) {
      // Find any @username mention at the start
      const mentionMatch = commentText.match(/^@(\w+)/);
      
      // If there's no mention at the start but we're replying, find the username we need
      if (!mentionMatch) {
        // Find the comment we're replying to
        const parentComment = comments.find(c => c._id === parentCommentId);
        if (parentComment) {
          // Add the username mention at the beginning
          finalContent = `@${parentComment.user.username} ${commentText.trim()}`;
        }
      }
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/reviews/${review._id}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          content: finalContent,
          parentCommentId: parentCommentId || null
        }),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        
        if (parentCommentId) {
          // Add reply to the parent comment
          setComments(prevComments => 
            prevComments.map(comment => {
              if (comment._id === parentCommentId) {
                return {
                  ...comment,
                  replies: [data.comment, ...(comment.replies || [])]
                }
              }
              return comment
            })
          )
        } else {
          // Add top-level comment
          setComments(prev => [data.comment, ...prev])
          // Increment comment count
          setCommentsCount(prev => prev + 1)
        }
        
        setCommentText("")
        setReplyingTo(null)
      }
    } catch (error) {
      console.error("Failed to post comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }, [commentText, isAuthenticated, isSubmitting, review._id, replyingTo, comments])

  const handleReply = useCallback((commentId: string, username: string) => {
    if (!isAuthenticated) return
    
    // Add @ mention if not canceling the reply
    if (replyingTo !== commentId) {
      const mentionText = `@${username} `;
      setCommentText(mentionText);
      setReplyingTo(commentId);
      
      // Use setTimeout to position cursor after the DOM updates
      setTimeout(() => {
        if (replyTextareaRef.current) {
          replyTextareaRef.current.focus();
          replyTextareaRef.current.selectionStart = mentionText.length;
          replyTextareaRef.current.selectionEnd = mentionText.length;
        }
      }, 50);
    } else {
      setReplyingTo(null)
      setCommentText("");
    }
  }, [isAuthenticated, replyingTo])

  // Function to render comment text with @ mention highlighting
  const renderCommentWithMentions = (text: string) => {
    // Look for mentions at the start of the text
    const startMentionMatch = text.match(/^@(\w+)\s/);
    
    if (startMentionMatch) {
      const mention = startMentionMatch[0];
      const mentionLength = mention.length;
      const restOfText = text.substring(mentionLength);
      
      return [
        <span key="mention" className="text-primary font-bold">
          {mention.trim()}
        </span>,
        " ", // Add space after the mention
        restOfText // Add the rest of the text
      ];
    }
    
    // If no mention at the start, just return the text
    return text;
  };

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: `${review.user.name}'s review of ${review.movieTitle}`,
        text: `Check out ${review.user.name}'s review of ${review.movieTitle}`,
        url: `${window.location.origin}/reviews/${review._id}`,
      }).catch(err => console.error("Share failed:", err))
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(`${window.location.origin}/reviews/${review._id}`)
        .then(() => alert("Link copied to clipboard!"))
        .catch(err => console.error("Clipboard copy failed:", err))
    }
  }, [review._id, review.movieTitle, review.user.name])

  const handleToggleComments = useCallback(() => {
    const newShowComments = !showComments
    setShowComments(newShowComments)
    
    if (newShowComments && !commentsLoaded && review.comments.length > 0) {
      loadComments()
    } else if (newShowComments && !commentsLoaded) {
      // Initialize with the review's comments for first render
      setComments(review.comments || [])
      setCommentsLoaded(true)
    }
  }, [showComments, commentsLoaded, review.comments, loadComments])

  // Toggle replies visibility
  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }))
  }, [])

  // Handle delete post
  const handleDeletePost = async () => {
    if (!isAuthenticated || !isPostAuthor) return
    
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/reviews/${review._id}`, {
        method: "DELETE",
        credentials: "include",
      })
      
      if (response.ok) {
        toast({
          title: "Review deleted",
          description: "Your review has been successfully deleted.",
        })
        // Refresh the page to show updated list
        window.location.reload()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete review. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to delete review:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }
  
  // Handle edit post
  const handleEditPost = async () => {
    if (!isAuthenticated || !isPostAuthor) return
    
    setIsEditing(true)
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
      })
      
      if (response.ok) {
        toast({
          title: "Review updated",
          description: "Your review has been successfully updated.",
        })
        // Update the review in the UI
        review.content = editedContent
        review.rating = editedRating
        setEditDialogOpen(false)
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to update review. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to update review:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEditing(false)
    }
  }

  return (
    <Card className="mb-4 overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start gap-4 pb-2">
        <Link href={`/profile/${review.user._id}`} className="shrink-0">
          <Avatar className="h-12 w-12 border-2 border-background">
            <AvatarImage src={review.user.avatar || "/placeholder.svg"} alt={review.user.name || "User avatar"} />
            <AvatarFallback>{review.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <Link 
              href={`/profile/${review.user._id}`} 
              className="font-medium hover:underline"
            >
              {review.user.name}
            </Link>
            
            {/* Only show follow button for other users */}
            {isAuthenticated && user?._id !== review.user._id && (
              <Button 
                variant={isFollowing ? "outline" : "default"} 
                size="sm" 
                className={`h-7 text-xs px-2 ml-2 ${isFollowing ? 'border-primary/30 hover:bg-primary/10' : ''}`}
                onClick={handleFollowToggle}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isFollowing ? (
                  "Following"
                ) : (
                  "Follow"
                )}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
          </p>
        </div>
        
        {/* Post actions dropdown (edit/delete) - only for post author */}
        {isPostAuthor && (
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More</span>
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
          </div>
        )}
        
        <div className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 shadow-sm">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="font-semibold">{review.rating}/5</span>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex gap-6 mb-6">
          {/* Movie Poster - Responsive size for different screens */}
          <Link href={`/details/${review.movie}`} className="shrink-0">
            <div className="relative h-[240px] w-[160px] md:h-80 md:w-56 overflow-hidden rounded-md shadow-md hover:shadow-lg transition-shadow">
              {review.moviePoster ? (
                <Image
                  src={review.moviePoster}
                  alt={review.movieTitle}
                  fill
                  className="object-cover transition-transform hover:scale-105"
                  sizes="(max-width: 768px) 160px, 224px"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}
            </div>
          </Link>

          <div className="flex-1 flex flex-col">
            <Link 
              href={`/details/${review.movie}`} 
              className="font-semibold text-xl hover:underline text-primary"
            >
              {review.movieTitle}
            </Link>
            <p className="mt-3 text-pretty flex-grow">{review.content}</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
          <div>
            {likesCount > 0 && <span>{likesCount} likes</span>}
          </div>
          <div>
            {commentsCount > 0 && (
              <button 
                className="hover:underline" 
                onClick={handleToggleComments}
              >
                {commentsCount} comments
              </button>
            )}
          </div>
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="p-2 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className={`gap-2 hover:bg-muted ${liked ? 'text-red-500' : ''}`}
          onClick={handleLike}
        >
          <Heart className={`h-4 w-4 ${liked ? 'fill-current text-red-500' : ''}`} />
          Like
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 hover:bg-muted"
          onClick={handleToggleComments}
        >
          <MessageCircle className="h-4 w-4" />
          Comment
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 hover:bg-muted"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </CardFooter>

      {showComments && (
        <div className="px-4 py-3 bg-muted/10 border-t">
          {/* Comment Form */}
          {isAuthenticated && !replyingTo && (
            <form onSubmit={(e) => handleSubmitComment(e)} className="flex gap-2 mb-4">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name || "User avatar"} />
                <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div className="relative flex-1">
                <Textarea 
                  placeholder="Write a comment..." 
                  className="min-h-0 h-9 py-2 resize-none pr-8"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  variant="ghost" 
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  disabled={!commentText.trim() || isSubmitting}
                >
                  <Send className={`h-4 w-4 ${commentText.trim() ? 'text-primary' : ''}`} />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </form>
          )}

          {/* Comments List */}
          <div className="space-y-4 mt-2">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment._id} className="space-y-3">
                  {/* Main Comment */}
                  <div className="flex gap-2">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={comment.user.avatar || "/placeholder.svg"} alt={comment.user.name || "Commenter"} />
                      <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="rounded-2xl bg-muted p-3">
                        <Link
                          href={`/profile/${comment.user._id}`}
                          className="font-medium hover:underline"
                        >
                          {comment.user.name}
                        </Link>
                        <p className="text-sm mt-1">
                          {renderCommentWithMentions(comment.content)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Comment Actions */}
                      <div className="flex gap-4 mt-1 px-3">
                        <button 
                          className="text-xs font-medium hover:underline"
                          onClick={() => handleReply(comment._id, comment.user.username)}
                        >
                          Reply
                        </button>
                      </div>

                      {/* Reply Form */}
                      {replyingTo === comment._id && isAuthenticated && (
                        <form 
                          onSubmit={(e) => handleSubmitComment(e, comment._id)} 
                          className="flex gap-2 mt-2 pl-2"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name || "User avatar"} />
                            <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="relative flex-1">
                            <Textarea 
                              ref={replyTextareaRef}
                              placeholder={`Reply to ${comment.user.name}...`} 
                              className="min-h-0 h-8 py-1.5 text-sm resize-none pr-8"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              autoFocus
                            />
                            <Button 
                              type="submit" 
                              size="sm" 
                              variant="ghost" 
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                              disabled={!commentText.trim() || isSubmitting}
                            >
                              <Send className={`h-3 w-3 ${commentText.trim() ? 'text-primary' : ''}`} />
                              <span className="sr-only">Send Reply</span>
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 mt-1 px-3">
                            <button 
                              className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1"
                              onClick={() => toggleReplies(comment._id)}
                            >
                              {expandedReplies[comment._id] ? 'Hide' : 'View'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                            </button>
                          </div>
                          
                          {expandedReplies[comment._id] && (
                            <div className="pl-4 mt-2 space-y-3 border-l-2 border-muted ml-2">
                              {comment.replies.map((reply) => (
                                <div key={reply._id} className="flex gap-2">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarImage src={reply.user.avatar || "/placeholder.svg"} alt={reply.user.name || "User who replied"} />
                                    <AvatarFallback>{reply.user.name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="rounded-xl bg-muted p-2">
                                      <Link
                                        href={`/profile/${reply.user._id}`}
                                        className="font-medium text-sm hover:underline"
                                      >
                                        {reply.user.name}
                                      </Link>
                                      <p className="text-sm">
                                        {renderCommentWithMentions(reply.content)}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                      </p>
                                    </div>
                                    <div className="flex gap-4 mt-0.5 px-2">
                                      <button 
                                        className="text-xs font-medium hover:underline"
                                        onClick={() => handleReply(comment._id, comment.user.username)}
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-3">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </div>
      )}

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
              onClick={handleDeletePost}
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
              onClick={handleEditPost}
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
  )
})

FeedPost.displayName = "FeedPost" 