import { useState, useEffect } from 'react';
import { Search, X, Clock, Sparkles, Zap, Trophy, Lightbulb, Cpu } from 'lucide-react';
import InstagramProjectPost from './InstagramProjectPost';

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
  category?: string;
  categoryLabel?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWork, setSelectedWork] = useState<WorkItem | null>(null);
  const [searchResults, setSearchResults] = useState<WorkItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<WorkItem[]>([]);

  // Load search history and data on mount
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('searchHistory');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
      fetchAllData();
    }
  }, [isOpen]);

  // Search whenever query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchAllData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/explore`);
      if (response.ok) {
        const data = await response.json();

        const categoryConfig = [
          { key: 'projects', label: 'Projects', icon: Sparkles },
          { key: 'experiments', label: 'Experiments', icon: Zap },
          { key: 'hackathons', label: 'Hackathons', icon: Trophy },
          { key: 'side_ideas', label: 'Side Ideas', icon: Lightbulb },
          { key: 'iot_works', label: 'IoT Works', icon: Cpu },
        ];

        const flatItems: WorkItem[] = [];
        categoryConfig.forEach(cat => {
          const items = data[cat.key] || [];
          items.forEach((item: WorkItem) => {
            flatItems.push({
              ...item,
              category: cat.key,
              categoryLabel: cat.label,
            });
          });
        });

        setAllItems(flatItems);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const performSearch = (query: string) => {
    const lowerQuery = query.toLowerCase();

    const results = allItems.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(lowerQuery);
      const descriptionMatch = item.description.toLowerCase().includes(lowerQuery);
      const techMatch = item.technologies.some(tech =>
        tech.toLowerCase().includes(lowerQuery)
      );
      const categoryMatch = item.categoryLabel?.toLowerCase().includes(lowerQuery);

      return titleMatch || descriptionMatch || techMatch || categoryMatch;
    });

    setSearchResults(results);
  };

  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    // Add to recent searches
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('searchHistory', JSON.stringify(updated));
  };

  const clearSearchHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('searchHistory');
  };

  const handleRecentClick = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  // Keep component mounted so we can animate open/close smoothly

  if (selectedWork) {
    return <InstagramProjectPost project={selectedWork} onClose={() => setSelectedWork(null)} />;
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Side Panel */}
      <div
        className={`fixed left-0 top-0 h-screen w-full max-w-md bg-white dark:bg-black z-50 overflow-hidden flex flex-col transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-700 ease-in-out`}
        aria-hidden={!isOpen}
      >
        {/* Header - Fixed */}
        <div className="bg-white dark:bg-black border-b border-gray-300 dark:border-gray-800 p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Search projects, skills, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  }
                }}
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-full py-2 pl-10 pr-8 text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-900 rounded-lg transition-colors text-black dark:text-white"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div>
          {searchQuery.trim() ? (
            // Search Results
            <div>
              {searchResults.length > 0 ? (
                <div className="space-y-0">
                  <div className="p-4 sticky top-0 bg-white dark:bg-black border-b border-gray-300 dark:border-gray-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {searchResults.map((item, index) => (
                    <div
                      key={item._id || `${item.category}-${index}`}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        setSelectedWork(item);
                      }}
                      className="border-b border-gray-300 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors cursor-pointer group p-4"
                    >
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                          <img
                            src={item.image_urls[0]}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2">
                            <div className="inline-block px-2 py-1 rounded text-xs font-semibold bg-gradient-to-r from-orange-500 to-pink-500 bg-opacity-20 text-transparent bg-clip-text">
                              {item.categoryLabel}
                            </div>
                          </div>

                          <h3 className="text-lg font-bold text-black dark:text-white mb-1 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {item.title}
                          </h3>

                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                            {item.description}
                          </p>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.technologies.map((tech, idx) => {
                              const matchesSearch = tech.toLowerCase().includes(searchQuery.toLowerCase());
                              return (
                                <span
                                  key={idx}
                                  className={`inline-block px-2 py-1 text-xs rounded transition-colors ${
                                    matchesSearch
                                      ? 'bg-orange-500/30 text-orange-600 dark:text-orange-300 border border-orange-500/50'
                                      : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {tech}
                                </span>
                              );
                            })}
                          </div>

                          <a
                            href={item.project_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex px-3 py-1 text-xs bg-gradient-to-r from-orange-500 to-pink-500 rounded hover:opacity-90 transition-opacity font-semibold text-white"
                          >
                            View on GitHub →
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-600 dark:text-gray-400">
                  <Sparkles size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-semibold">No results found</p>
                  <p className="text-sm mt-2">Try searching for different keywords</p>
                </div>
              )}
            </div>
          ) : (
            // Recent Searches
            <div className="p-4 space-y-4">
              {recentSearches.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock size={18} />
                      <h2 className="text-sm font-semibold">Recent</h2>
                    </div>
                    <button
                      onClick={clearSearchHistory}
                      className="text-xs text-orange-600 dark:text-orange-500 hover:text-orange-700 dark:hover:text-orange-400 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRecentClick(search)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-900 transition-colors text-left group text-black dark:text-white"
                      >
                        <div className="flex items-center gap-3">
                          <Clock size={16} className="text-gray-600 dark:text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white">{search}</span>
                        </div>
                        <X size={16} className="text-gray-600 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Search Tips */}
              <div className="mt-8 p-4 bg-gradient-to-br from-orange-500 to-pink-500 bg-opacity-10 border border-orange-500/20 rounded-lg">
                <h3 className="font-semibold text-black dark:text-white mb-2">Search Tips</h3>
                <ul className="text-sm text-gray-700 dark:text-white-400 space-y-1">
                  <li>• Search by project name</li>
                  <li>• Search by technology (React, Node.js, etc.)</li>
                  <li>• Search by category (Projects, Hackathons, etc.)</li>
                  <li>• Search by keywords from descriptions</li>
                </ul>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
}
