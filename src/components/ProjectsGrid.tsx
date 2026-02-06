import { useState } from 'react';
import { Project } from '../lib/mongodb';
import { Grid3x3 } from 'lucide-react';
import InstagramProjectPost from './InstagramProjectPost';

interface ProjectsGridProps {
  projects: Project[];
}

export default function ProjectsGrid({ projects }: ProjectsGridProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <>
      <div className="border-t border-gray-200 dark:border-gray-800 px-2 md:px-0">
        <div className="flex items-center justify-center gap-2 py-3 border-b border-gray-200 dark:border-gray-800">
          <Grid3x3 size={16} className="text-black dark:text-white" />
          <span className="text-xs font-semibold tracking-widest text-black dark:text-white">PROJECTS</span>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {projects.map((project) => (
            <div
              key={project._id || project.id}
              className="aspect-square cursor-pointer relative group overflow-hidden bg-gray-300 dark:bg-gray-900"
              onClick={() => setSelectedProject(project)}
            >
              <img
                src={project.image_urls[0]}
                alt={project.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all"></div>
            </div>
          ))}
        </div>
      </div>

      {selectedProject && (
        <InstagramProjectPost project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </>
  );
}
