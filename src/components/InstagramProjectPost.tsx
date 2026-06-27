import { useState, useEffect } from 'react';
import { Project } from '../lib/mongodb';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Trash2 } from 'lucide-react';

interface InstagramProjectPostProps {
  project: Project;
  onClose: () => void;
}

interface Comment {
  _id: string;
  username: string;
  text: string;
  created_at: string;
  userId: string;
}

export default function InstagramProjectPost({ project, onClose }: InstagramProjectPostProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(project.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const STORAGE_KEY = `project_likes_${project._id || project.id}`;

  // Check if already liked on mount and load user info
  useEffect(() => {
    const storedLike = localStorage.getItem(STORAGE_KEY);
    setLiked(storedLike === 'true');

    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }

    // Load comments
    loadComments();
  }, [project._id, project.id, STORAGE_KEY]);

  const loadComments = async () => {
    try {
      setIsLoadingComments(true);
      const response = await fetch(
        `https://portfolio-backend-zphz.onrender.com/api/projects/${project._id || project.id}/comments`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!user) {
      alert('Please sign in to comment');
      return;
    }

    if (!commentText.trim()) {
      alert('Comment cannot be empty');
      return;
    }

    if (commentText.trim().length > 500) {
      alert('Comment must be less than 500 characters');
      return;
    }

    setIsPostingComment(true);
    try {
      const response = await fetch(
        `https://portfolio-backend-zphz.onrender.com/api/projects/${project._id || project.id}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: commentText,
            userId: user.id,
            username: user.username
          })
        }
      );

      if (response.ok) {
        const newComment = await response.json();
        setComments([newComment, ...comments]);
        setCommentText('');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`https://portfolio-backend-zphz.onrender.com/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (response.ok) {
        setComments(comments.filter(c => c._id !== commentId));
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Use the actual project images from the array
  const images = project.image_urls && project.image_urls.length > 0 
    ? project.image_urls 
    : ['https://portfolio-backend-zphz.onrender.com/uploads/projects/placeholder.png'];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    
    try {
      const action = liked ? 'unlike' : 'like';
      const response = await fetch(
        `https://portfolio-backend-zphz.onrender.com/api/projects/${project._id || project.id}/like`,
        { 
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        }
      );
      
      if (response.ok) {
        const updatedProject = await response.json();
        setLikeCount(updatedProject.likes);
        
        if (!liked) {
          // User just liked
          setLiked(true);
          localStorage.setItem(STORAGE_KEY, 'true');
        } else {
          // User just unliked
          setLiked(false);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const shareText = `Check out this project: ${project.title}`;
    const shareUrl = `${window.location.origin}?project=${project._id || project.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: project.title,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage('Link copied to clipboard!');
        setTimeout(() => setShareMessage(null), 2000);
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Could not copy to clipboard');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 dark:bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Share Toast */}
      {shareMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-out whitespace-nowrap">
          {shareMessage}
        </div>
      )}
      <div
        className="bg-white dark:bg-black rounded-lg max-w-5xl w-full h-[90vh] flex flex-col md:flex-row overflow-hidden border border-gray-300 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Side - Image Carousel */}
        <div className="w-full md:w-1/2 h-1/3 md:h-full relative bg-gray-100 dark:bg-black flex items-center justify-center group">
          <img
            src={images[currentImageIndex]}
            alt={`${project.title} ${currentImageIndex + 1}`}
            className="w-full h-full object-contain"
          />

          {/* Image Navigation Buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 p-2 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 p-2 rounded-full text-white transition-all opacity-0 group-hover:opacity-100"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Image Indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentImageIndex ? 'bg-white w-6' : 'bg-gray-500 w-2'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 p-2 rounded-full text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Right Side - Project Details (Instagram Style) */}
        <div className="flex w-full md:w-1/2 h-2/3 md:h-full flex-col bg-white dark:bg-black text-black dark:text-white border-t md:border-t-0 md:border-l border-gray-300 dark:border-gray-800">
          {/* Header */}
          <div className="p-4 border-b border-gray-300 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500"></div>
              <div>
                <p className="font-semibold text-sm">{project.title}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Portfolio Project</p>
              </div>
            </div>
            <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              <span className="text-2xl">...</span>
            </button>
          </div>

          {/* Description & Details */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Description */}
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-200">{project.description}</p>
            </div>

            {/* Technologies */}
            {project.technologies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">Technologies</p>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-900 border border-gray-400 dark:border-gray-700 rounded-full text-xs text-gray-800 dark:text-gray-300 hover:border-gray-500 dark:hover:border-gray-500 transition-colors"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Project URL */}
            {project.project_url && (
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">GitHub Link</p>
                <a
                  href={project.project_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs break-all"
                >
                  {project.project_url}
                </a>
              </div>
            )}

            {/* Comments List - Only display comments here */}
            <div className="space-y-3 pt-4 border-t border-gray-300 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Comments ({comments.length})</p>
              
              {/* Comments Display */}
              <div className="max-h-40 overflow-y-auto space-y-2">
                {isLoadingComments ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment._id} className="flex gap-2 group">
                      <div className="flex-1">
                        <p className="text-xs">
                          <span className="font-semibold text-black dark:text-white">@{comment.username}</span>
                          <span className="text-gray-700 dark:text-gray-300 ml-2">{comment.text}</span>
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {user?.id === comment.userId && (
                        <button
                          onClick={() => handleDeleteComment(comment._id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Engagement Actions */}
          <div className="border-t border-gray-300 dark:border-gray-800 p-4 space-y-4">
            {/* Like, Comment, Share, Save */}
            <div className="flex gap-4 text-black dark:text-white">
              <button
                onClick={handleLike}
                disabled={isLiking}
                className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors disabled:opacity-50"
              >
                <Heart
                  size={24}
                  fill={liked ? '#ef4444' : 'none'}
                  color={liked ? '#ef4444' : 'currentColor'}
                />
              </button>
              <button className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors">
                <MessageCircle size={24} />
              </button>
              <button
                onClick={handleShare}
                className="hover:text-gray-600 dark:hover:text-gray-400 transition-colors ml-auto"
                title="Share"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
              </button>
            </div>

            {/* Like Count */}
            <div>
              <p className="text-sm font-semibold text-black dark:text-white">
                {likeCount} {likeCount === 1 ? 'like' : 'likes'}
              </p>
            </div>

            {/* Comment Input - At bottom */}
            {user ? (
              <div className="flex gap-2 pt-2 border-t border-gray-300 dark:border-gray-700">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                  placeholder="Add a comment..."
                  maxLength={500}
                  className="flex-1 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs placeholder-gray-600 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 text-black dark:text-white"
                />
                <button
                  onClick={handlePostComment}
                  disabled={isPostingComment || !commentText.trim()}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:text-gray-500 dark:disabled:text-gray-600 disabled:cursor-not-allowed font-semibold text-xs transition-colors"
                >
                  {isPostingComment ? 'Posting...' : 'Post'}
                </button>
              </div>
            ) : (
              <div className="text-center py-2 border-t border-gray-300 dark:border-gray-700">
                <p className="text-xs text-gray-600 dark:text-gray-400">Sign in to comment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
