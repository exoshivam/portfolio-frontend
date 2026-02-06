import { useState, useEffect } from 'react';
import { Sparkles, Zap, Trophy, Lightbulb, Cpu, X, Heart, MessageCircle } from 'lucide-react';
import InstagramProjectPost from './InstagramProjectPost';
import Sidebar from './Sidebar';
import SignInModal from './SignInModal';

interface WorkItem {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  image_urls: string[];
  project_url: string;
  technologies: string[];
  order_index: number;
  created_at?: string;
  likes?: number;
}

interface Comment {
  _id: string;
  username: string;
  text: string;
  created_at: string;
  userId: string;
}

interface ExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

interface CategoryData {
  label: string;
  icon: React.ReactNode;
  items: WorkItem[];
  color: string;
  lightColor: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ExploreModal({ isOpen, onClose, activeTab, onTabChange }: ExploreModalProps) {
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);
  const [categories, setCategories] = useState<{ [key: string]: CategoryData }>({});
  const [allItems, setAllItems] = useState<(WorkItem & { category: string; categoryLabel: string; icon: React.ReactNode; color: string })[]>([]);
  const [likedItems, setLikedItems] = useState<{ [key: string]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [isLiking, setIsLiking] = useState<{ [key: string]: boolean }>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({});
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [isPostingComment, setIsPostingComment] = useState<{ [key: string]: boolean }>({});
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchWorkData();
      checkAuth();
    }
  }, [isOpen]);

  const checkAuth = () => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);
    
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
  };

  const getStorageKey = (itemId: string | undefined) => {
    return `project_likes_${itemId}`;
  };

  const handleLike = async (itemId: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!itemId) return;
    if (isLiking[itemId]) return;

    setIsLiking(prev => ({
      ...prev,
      [itemId]: true
    }));

    try {
      const isCurrentlyLiked = likedItems[itemId];
      const action = isCurrentlyLiked ? 'unlike' : 'like';

      const response = await fetch(`${API_BASE_URL}/projects/${itemId}/like`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const updatedProject = await response.json();
        
        // Update like status
        setLikedItems(prev => ({
          ...prev,
          [itemId]: !isCurrentlyLiked
        }));

        // Update like count
        setLikeCounts(prev => ({
          ...prev,
          [itemId]: updatedProject.likes
        }));

        // Persist to localStorage
        const storageKey = getStorageKey(itemId);
        if (!isCurrentlyLiked) {
          localStorage.setItem(storageKey, 'true');
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(prev => ({
        ...prev,
        [itemId]: false
      }));
    }
  };

  const toggleCommentSection = (itemId: string | undefined) => {
    if (!itemId) return;
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
      loadComments(itemId);
    }
    setExpandedComments(newExpanded);
  };

  const handleShare = (item: WorkItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `Check out this ${item.title}`;
    const shareUrl = `${window.location.origin}?item=${item._id || item.id}`;

    if (navigator.share) {
      try {
        navigator.share({
          title: item.title,
          text: shareText,
          url: shareUrl,
        }).catch(error => {
          if (error.name !== 'AbortError') {
            console.error('Error sharing:', error);
          }
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        navigator.clipboard.writeText(shareUrl).then(() => {
          setShareMessage('Link copied to clipboard!');
          setTimeout(() => setShareMessage(null), 2000);
        }).catch(error => {
          console.error('Error copying to clipboard:', error);
          alert('Could not copy to clipboard');
        });
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const loadComments = async (itemId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${itemId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({
          ...prev,
          [itemId]: data
        }));
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handlePostComment = async (itemId: string | undefined) => {
    if (!itemId) return;
    if (!commentText[itemId]?.trim()) return;

    setIsPostingComment(prev => ({
      ...prev,
      [itemId]: true
    }));

    try {
      console.log('Posting comment:', { itemId, text: commentText[itemId], user });
      const response = await fetch(`${API_BASE_URL}/projects/${itemId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: commentText[itemId],
          userId: user?.id,
          username: user?.username
        })
      });

      if (response.ok) {
        console.log('Comment posted successfully');
        const newComment = await response.json();
        setComments(prev => ({
          ...prev,
          [itemId]: [newComment, ...(prev[itemId] || [])]
        }));
        setCommentText(prev => ({
          ...prev,
          [itemId]: ''
        }));
      } else {
        const errorText = await response.text();
        console.error('Error posting comment:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsPostingComment(prev => ({
        ...prev,
        [itemId]: false
      }));
    }
  };

  const fetchWorkData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/explore`);
      if (response.ok) {
        const data = await response.json();
        
        const categoryConfig = [
          { key: 'projects', label: 'Projects', icon: <Sparkles size={20} />, color: 'from-blue-500 to-cyan-500', lightColor: 'bg-blue-500/10' },
          { key: 'experiments', label: 'Experiments', icon: <Zap size={20} />, color: 'from-purple-500 to-pink-500', lightColor: 'bg-purple-500/10' },
          { key: 'hackathons', label: 'Hackathons', icon: <Trophy size={20} />, color: 'from-yellow-500 to-orange-500', lightColor: 'bg-yellow-500/10' },
          { key: 'side_ideas', label: 'Side Ideas', icon: <Lightbulb size={20} />, color: 'from-green-500 to-emerald-500', lightColor: 'bg-green-500/10' },
          { key: 'iot_works', label: 'IoT Works', icon: <Cpu size={20} />, color: 'from-red-500 to-pink-500', lightColor: 'bg-red-500/10' },
        ];

        const categoriesMap: { [key: string]: CategoryData } = {};
        const flatItems: any[] = [];
        const likedItemsMap: { [key: string]: boolean } = {};
        const likeCountsMap: { [key: string]: number } = {};

        categoryConfig.forEach(cat => {
          const items = data[cat.key] || [];
          categoriesMap[cat.key] = {
            label: cat.label,
            icon: cat.icon,
            items,
            color: cat.color,
            lightColor: cat.lightColor,
          };

          items.forEach((item: WorkItem) => {
            const itemId = item._id || item.id;
            const storageKey = getStorageKey(itemId);
            const isLiked = localStorage.getItem(storageKey) === 'true';
            
            likedItemsMap[itemId] = isLiked;
            likeCountsMap[itemId] = item.likes || 0;

            flatItems.push({
              ...item,
              category: cat.key,
              categoryLabel: cat.label,
              icon: cat.icon,
              color: cat.color,
            });
          });
        });

        setCategories(categoriesMap);
        setAllItems(flatItems.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
        setLikedItems(likedItemsMap);
        setLikeCounts(likeCountsMap);
      }
    } catch (error) {
      console.error('Error fetching work data:', error);
    }
  };

  if (!isOpen) return null;

  if (selectedWork) {
    return <InstagramProjectPost project={selectedWork} onClose={() => setSelectedWork(null)} />;
  }

  return (
    <div
      className="fixed inset-0 bg-white dark:bg-black z-50 overflow-hidden flex flex-col lg:flex-row"
    >
      {/* Share Toast */}
      {shareMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-out whitespace-nowrap">
          {shareMessage}
        </div>
      )}

      {/* Sidebar */}
      <Sidebar isLoggedIn={isLoggedIn} activeTab={activeTab} onTabChange={onTabChange} onModalClose={onClose} />

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Feed Content - Scrollable */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-950">
        <div className="mx-auto py-4 space-y-3 px-2 max-w-5xl">
          {showLoginPrompt && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg p-6 max-w-sm mx-4 text-center">
                <h3 className="text-xl font-bold text-black dark:text-white mb-2">Sign In to Comment</h3>
                <p className="text-gray-700 dark:text-gray-400 mb-6">You need to be signed in to comment on posts.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-800 hover:bg-gray-400 dark:hover:bg-gray-700 text-black dark:text-white rounded transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowLoginPrompt(false);
                      setShowSignInModal(true);
                    }}
                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded transition-colors font-semibold"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </div>
          )}
          {allItems.length > 0 ? (
            allItems.map((item, index) => {
              const itemId = item._id || item.id || `item-${index}`;
              return (
                <div
                  key={item._id || `${item.category}-${index}`}
                  className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-800 rounded-lg overflow-hidden hover:border-gray-400 dark:hover:border-gray-700 transition-colors"
                >
                {/* Reddit-style Post Header */}
                <div className="px-4 py-3 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                  <div className={`p-2 rounded-full ${item.color} bg-opacity-20`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 dark:text-gray-300">r/{item.categoryLabel}</div>
                    <div className="text-gray-500 dark:text-gray-500">Posted by u/developer</div>
                  </div>
                  <span className="text-gray-400 dark:text-gray-600">•••</span>
                </div>

                {/* Post Title */}
                <div 
                  onClick={() => setSelectedWork(item)}
                  className="px-4 cursor-pointer hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-black dark:text-white"
                >
                  <h3 className="text-base font-bold mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                </div>

                {/* Post Description */}
                <div className="px-4 mb-3">
                  <p className="text-sm text-gray-700 dark:text-gray-400 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                {/* Post Image/Media */}
                <div 
                  onClick={() => setSelectedWork(item)}
                  className="bg-gray-200 dark:bg-gray-800 aspect-video flex items-center justify-center cursor-pointer group overflow-hidden"
                >
                  <img
                    src={item.image_urls[0]}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* Technologies Tags */}
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800/50 flex flex-wrap gap-1">
                  {item.technologies.slice(0, 4).map((tech, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                    >
                      {tech}
                    </span>
                  ))}
                  {item.technologies.length > 4 && (
                    <span className="text-xs px-2 py-1 text-gray-600 dark:text-gray-400">
                      +{item.technologies.length - 4}
                    </span>
                  )}
                </div>

                {/* Reddit-style Actions */}
                <div className="px-3 py-2 flex items-center justify-between text-gray-600 dark:text-gray-400 text-sm border-t border-gray-300 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    {/* Upvote/Like */}
                    <button
                      onClick={(e) => handleLike(itemId, e)}
                      disabled={isLiking[itemId] || false}
                      className="flex items-center gap-1.5 hover:text-orange-500 hover:bg-orange-500/10 px-2 py-1 rounded transition-all group disabled:opacity-50"
                    >
                      <Heart
                        size={16}
                        className={`transition-all ${likedItems[itemId] ? 'fill-orange-500 text-orange-500' : ''}`}
                      />
                      <span className="text-xs group-hover:text-orange-500">
                        {likeCounts[itemId] || 0}
                      </span>
                    </button>

                    {/* Comments */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isLoggedIn) {
                          setShowLoginPrompt(true);
                        } else {
                          toggleCommentSection(itemId);
                        }
                      }}
                      className="flex items-center gap-1.5 hover:text-blue-500 hover:bg-blue-500/10 px-2 py-1 rounded transition-all group"
                    >
                      <MessageCircle size={16} />
                      <span className="text-xs group-hover:text-blue-500">
                        {expandedComments.has(itemId) ? 'Hide' : 'Comment'}
                      </span>
                    </button>

                    {/* Share */}
                    <button
                      onClick={(e) => handleShare(item, e)}
                      className="flex items-center gap-1.5 hover:text-green-500 hover:bg-green-500/10 px-2 py-1 rounded transition-all group"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                      <span className="text-xs group-hover:text-green-500">Share</span>
                    </button>
                  </div>

                  {/* GitHub Link */}
                  <a
                    href={item.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs px-2 py-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded hover:opacity-90 transition-opacity font-semibold"
                  >
                    View →
                  </a>
                </div>

                {/* Comments Section */}
                {isLoggedIn && expandedComments.has(itemId) && (
                  <div className="px-4 py-3 bg-gray-100 dark:bg-gray-800/30 border-t border-gray-300 dark:border-gray-800 space-y-3">
                    {/* Comment Input */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentText[itemId] || ''}
                          onChange={(e) => setCommentText(prev => ({
                            ...prev,
                            [itemId]: e.target.value
                          }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={() => handlePostComment(itemId)}
                        disabled={isPostingComment[itemId] || !commentText[itemId]?.trim()}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 text-white rounded text-sm font-semibold transition-colors"
                      >
                        Post
                      </button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {comments[itemId]?.length > 0 ? (
                        comments[itemId].map((comment: Comment) => (
                          <div key={comment._id} className="p-2 bg-gray-200 dark:bg-gray-900/50 rounded text-sm">
                            <div className="flex gap-2">
                              <div className="font-semibold text-blue-600 dark:text-blue-400 text-xs">{comment.username}</div>
                              <div className="text-gray-600 dark:text-gray-500 text-xs">
                                {new Date(comment.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-xs mt-1">{comment.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 dark:text-gray-500 text-xs text-center py-2">No comments yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
            })
          ) : (
            <div className="flex items-center justify-center h-96 text-gray-600 dark:text-gray-400">
              <div className="text-center">
                <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
                <p>No posts found</p>
              </div>
            </div>
          )}

          {/* End of feed */}
          {allItems.length > 0 && (
            <div className="py-4 text-center text-gray-600 dark:text-gray-500 text-sm">
              <p>That's all folks! More coming soon...</p>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Sign In Modal */}
      {showSignInModal && (
        <SignInModal onClose={() => setShowSignInModal(false)} />
      )}
    </div>
  );
}