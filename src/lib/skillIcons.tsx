import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import type { LucideIcon } from 'lucide-react';
import { img, type Skill } from './api';

type IconSet = Record<string, LucideIcon | IconType>;
let iconSet: IconSet | null = null;
let iconSetPromise: Promise<IconSet> | null = null;

/** The skill icon set, loaded once on first use; null until it has arrived. */
export function useSkillIcons(): IconSet | null {
  const [icons, setIcons] = useState(iconSet);
  useEffect(() => {
    if (iconSet) return;
    iconSetPromise ??= import('./skillIconSet').then((m) => (iconSet = m.SKILL_ICONS));
    let alive = true;
    iconSetPromise.then((s) => alive && setIcons(s));
    return () => {
      alive = false;
    };
  }, []);
  return icons;
}

// Colour themes for a skill circle. Full class strings so Tailwind keeps them in the build.
export const SKILL_THEMES: Record<string, { label: string; className: string }> = {
  '': { label: 'Sunset (default)', className: 'bg-gradient-to-br from-pink-500 to-orange-500 text-white' },
  ocean: { label: 'Ocean', className: 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white' },
  forest: { label: 'Forest', className: 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white' },
  violet: { label: 'Violet', className: 'bg-gradient-to-br from-fuchsia-500 to-purple-700 text-white' },
  midnight: { label: 'Midnight', className: 'bg-gradient-to-br from-slate-700 to-gray-950 text-white' },
  gold: { label: 'Gold', className: 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white' },
  rose: { label: 'Rose', className: 'bg-gradient-to-br from-rose-400 to-red-600 text-white' },
  mono: { label: 'Mono', className: 'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900' },
};

export type SkillCover = Pick<Skill, 'name' | 'icon'> & { theme?: string; image_url?: string };

/**
 * A skill's circle content: its image if it has one, else its colour theme with the icon
 * (no icon = plain colour). `preview` overrides the image, e.g. a local file not yet uploaded.
 */
export function SkillAvatar({ skill, size, preview }: { skill: SkillCover; size: number; preview?: string }) {
  const icons = useSkillIcons();
  const image = preview || (skill.image_url ? img(skill.image_url, size * 2) : '');
  if (image) return <img src={image} alt="" className="w-full h-full object-cover rounded-full" />;
  const theme = SKILL_THEMES[skill.theme ?? ''] ?? SKILL_THEMES[''];
  const Icon = icons?.[skill.icon];
  return (
    <span className={`w-full h-full rounded-full flex items-center justify-center ${theme.className}`}>
      {Icon ? <Icon size={size * 0.4} /> : null}
    </span>
  );
}
