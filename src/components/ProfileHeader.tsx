import { useState, useEffect } from 'react';
import { Profile } from '../lib/mongodb';
import { X } from 'lucide-react';
import { ReactTyped }  from "react-typed";

interface ActiveProject {
  _id: string;
  title: string;
  description: string;
  image_urls: string[];
  project_url: string;
  technologies: string[];
  status: string;
  progress: number;
  order_index: number;
}

interface ProfileHeaderProps {
  profile: Profile | null;
}

const stringsToRender = [
  "Full Stack Developer",
  "C++",
  "Iot/Arduino",
  "Python"
]

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const [showActiveProjects, setShowActiveProjects] = useState(false);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch active projects on component mount
  useEffect(() => {
    const fetchActiveProjects = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/active-projects');
        if (response.ok) {
          const data = await response.json();
          setActiveProjects(data);
        }
      } catch (error) {
        console.error('Error fetching active projects:', error);
      }
    };

    fetchActiveProjects();
  }, []);

  // Refresh data and reset search when modal is opened
  useEffect(() => {
    if (showActiveProjects) {
      const fetchActiveProjects = async () => {
        try {
          const response = await fetch('http://localhost:5000/api/active-projects');
          if (response.ok) {
            const data = await response.json();
            setActiveProjects(data);
          }
        } catch (error) {
          console.error('Error fetching active projects:', error);
        }
      };

      fetchActiveProjects();
      setSearchQuery('');
    }
  }, [showActiveProjects]);

  if (!profile) return null;

  const viewsCount = (profile as any).views_count ?? (profile as any).followers_count ?? 0;
  const activeProjectsCount = activeProjects.length;

  // Filter projects based on search query
  const filteredProjects = activeProjects.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.technologies.some(tech => tech.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <div className="flex flex-col items-center md:flex-row md:items-start gap-8 md:gap-16 w-full px-4 py-8">
        <div className="flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500 p-3">
              <div className="w-full h-full rounded-full bg-black"></div>
            </div>
            <img
              src={profile.avatar_url || 'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400'}
              alt={profile.full_name}
              className="relative rounded-full w-32 h-32 md:w-40 md:h-40 object-cover border-2 border-transparent" style={{ objectPosition: '20% 0%' }}
            />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-6">
            <h1 className="text-xl font-light text-black dark:text-white">{profile.username}</h1>
          </div>

          <div className="flex justify-center md:justify-start gap-8 mb-6">
            <div className="text-center">
              <div className="font-semibold text-black dark:text-white">{profile.projects_count}</div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">projects</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-black dark:text-white">{viewsCount}</div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">views</div>
            </div>
            <button
              onClick={() => setShowActiveProjects(true)}
              className="text-center cursor-pointer hover:opacity-70 transition-opacity"
            >
              <div className="font-semibold text-black dark:text-white">{activeProjectsCount}</div>
              <div className="text-gray-600 dark:text-gray-400 text-sm">Ongoing Projects</div>
            </button>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-black dark:text-white">{profile.full_name}</div>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line"><ReactTyped strings={stringsToRender} typeSpeed={60}
        backSpeed={50} loop></ReactTyped></div>
            <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{profile.bio}</div>
            <div className="flex items-center justify-center md:justify-start gap-4 pt-2 flex-wrap">
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.731-2.004 1.438-.103.249-.129.597-.129.946v5.421h-3.554s.05-8.736 0-9.646h3.554v1.348c.428-.659 1.191-1.599 2.897-1.599 2.117 0 3.704 1.384 3.704 4.361v5.536zM5.337 8.855c-1.144 0-1.915-.758-1.915-1.704 0-.951.768-1.703 1.96-1.703 1.188 0 1.913.75 1.938 1.703 0 .946-.75 1.704-1.983 1.704zm1.581 11.597H3.635V9.859h3.283v10.593zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>LinkedIn</span>
                </a>
              )}
              <a
                href={profile.github_url || "https://github.com/exoshivam"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Active Projects Modal */}
      {showActiveProjects && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md max-h-96 flex flex-col border border-gray-300 dark:border-gray-700">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-700">
              <h2 className="text-lg font-bold text-black dark:text-white">Following</h2>
              <button
                onClick={() => setShowActiveProjects(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-300 dark:border-gray-700">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-sm text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Projects List */}
            <div className="flex-1 overflow-y-auto">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <a
                    key={project._id}
                    href={project.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-800 last:border-b-0 cursor-pointer"
                  >
                    {/* Project Image */}
                    <img
                      src={project.image_urls[0]}
                      alt={project.title}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />

                    {/* Project Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-black dark:text-white truncate">
                        {project.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full">
                          {project.status}
                        </span>
                        <div className="flex-1 bg-gray-300 dark:bg-gray-700 rounded-full h-1.5 min-w-0">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-pink-500 h-full rounded-full"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                          {project.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Following Button */}
                    <button className="px-4 py-1 bg-black dark:bg-gray-200 text-white dark:text-gray-900 rounded-full text-sm font-semibold hover:opacity-80 transition-opacity flex-shrink-0">
                      Following
                    </button>
                  </a>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-gray-600 dark:text-gray-400">
                  <p className="text-sm">{searchQuery ? 'No projects found' : 'No active projects'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
