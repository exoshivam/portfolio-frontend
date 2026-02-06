import { Skill } from '../lib/mongodb';
import * as Icons from 'lucide-react';
import * as ReactIcons from 'react-icons/fa';
import * as SiIcons from 'react-icons/si';

interface SkillsHighlightsProps {
  skills: Skill[];
}

export default function SkillsHighlights({ skills }: SkillsHighlightsProps) {
  const getIcon = (iconName: string) => {
    // Special case for React to show the proper React logo
    if (iconName === 'FaBeer' || iconName === 'React') {
      const SiReact = (SiIcons as any)['SiReact'];
      if (SiReact) {
        return <SiReact size={32} className="font-bold" />;
      }
    }

    // Try to find icon in lucide-react first
    const LucideIcon = (Icons as any)[iconName];
    if (LucideIcon) {
      return <LucideIcon size={32} className="font-bold" />;
    }

    // Try to find icon in react-icons/fa
    const ReactIcon = (ReactIcons as any)[iconName];
    if (ReactIcon) {
      return <ReactIcon size={32} className="font-bold" />;
    }

    // Try to find icon in react-icons/si
    const SiIcon = (SiIcons as any)[iconName];
    if (SiIcon) {
      return <SiIcon size={32} className="font-bold" />;
    }

    // Fallback to text
    return <span className="text-2xl font-bold">{iconName}</span>;
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 py-6">
      <div className="overflow-x-auto">
        <div className="flex gap-6 px-4 min-w-max justify-center md:justify-start">
          {skills.map((skill) => (
            <div key={skill._id || skill.id} className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform">
                {getIcon(skill.icon)}
              </div>
              <span className="text-xs text-gray-700 dark:text-gray-300">{skill.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
