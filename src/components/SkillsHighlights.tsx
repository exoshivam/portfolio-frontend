import { lazy, Suspense, useCallback, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { api, type Skill } from '../lib/api';
import { SkillAvatar } from '../lib/skillIcons';
import { useStore } from '../lib/store';
import type { StoryGroup } from './StoryViewer';

const StoryViewer = lazy(() => import('./StoryViewer'));
const StoryEditor = lazy(() => import('./StoryEditor'));
const SkillEditor = lazy(() => import('./SkillEditor'));

// A skill counts as seen until its stories change (tracked by id + number of stories).
const SEEN_KEY = 'seen_skill_stories';
const seenId = (s: Skill) => `${s._id}:${s.slides?.length ?? 0}`;

function readSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

/** The skills row. Skills with stories get a story ring and open like Instagram highlights. */
export default function SkillsHighlights() {
  const { feed, user } = useStore();
  const skills = feed?.skills;
  const [viewing, setViewing] = useState<number | null>(null);
  const [editing, setEditing] = useState<Skill | null>(null); // stories editor
  const [editingSkill, setEditingSkill] = useState<Skill | 'new' | null>(null);
  const [seen, setSeen] = useState(readSeen);

  const withStories = (skills ?? []).filter((s) => s.slides?.length);
  const groups: StoryGroup[] = withStories.map((s) => ({
    id: s._id,
    title: s.name,
    avatar: <SkillAvatar skill={s} size={32} />,
    slides: s.slides ?? [],
  }));

  const markSeen = useCallback(
    (g: StoryGroup) => {
      const skill = skills?.find((s) => s._id === g.id);
      if (!skill) return;
      setSeen((cur) => {
        const key = seenId(skill);
        if (cur.has(key)) return cur;
        const next = new Set(cur).add(key);
        try {
          localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
        } catch {
          // storage unavailable: rings just won't remember
        }
        return next;
      });
    },
    [skills],
  );

  const open = (skill: Skill) => {
    const i = withStories.indexOf(skill);
    if (i >= 0) setViewing(i);
    else if (user?.isAdmin) setEditing(skill);
  };

  return (
    <div id="skills-row" className="border-t border-gray-200 dark:border-gray-800 py-6 scroll-mt-4">
      <div className="overflow-x-auto">
        <div className="flex gap-6 px-4 min-w-max justify-center md:justify-start">
          {skills
            ? skills.map((skill) => {
                const hasStories = !!skill.slides?.length;
                const unseen = hasStories && !seen.has(seenId(skill));
                const clickable = hasStories || user?.isAdmin;
                return (
                  <div key={skill._id || skill.name} className="relative">
                    <button
                      onClick={() => open(skill)}
                      disabled={!clickable}
                      title={hasStories ? `${skill.name} stories` : user?.isAdmin ? `Add ${skill.name} stories` : skill.name}
                      className="flex flex-col items-center gap-2 group disabled:cursor-default"
                    >
                      <div
                        className={`w-[88px] h-[88px] rounded-full p-[3px] ${
                          unseen ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-pink-500' : hasStories ? 'bg-gray-300 dark:bg-gray-700' : ''
                        }`}
                      >
                        <div className={`w-full h-full rounded-full ${hasStories ? 'bg-white dark:bg-black p-[3px]' : 'p-[6px]'}`}>
                          <div className={`w-full h-full rounded-full overflow-hidden transition-transform ${clickable ? 'group-hover:scale-105' : ''}`}>
                            <SkillAvatar skill={skill} size={76} />
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-700 dark:text-gray-300">{skill.name}</span>
                    </button>
                    {user?.isAdmin && (
                      <button
                        onClick={() => setEditingSkill(skill)}
                        aria-label={`Edit ${skill.name}`}
                        title={`Edit ${skill.name}: name, cover, stories`}
                        className="absolute top-[62px] right-0 w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-600 border-2 border-white dark:border-black flex items-center justify-center text-white"
                      >
                        <Pencil size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })
            : Array.from({ length: 6 }, (_, i) => <div key={i} className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />)}
          {skills && user?.isAdmin && (
            <button onClick={() => setEditingSkill('new')} className="flex flex-col items-center gap-2 group" title="Add a skill">
              <div className="w-[88px] h-[88px] rounded-full border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 group-hover:border-orange-500 group-hover:text-orange-500 transition-colors">
                <Plus size={30} strokeWidth={1.5} />
              </div>
              <span className="text-xs text-gray-700 dark:text-gray-300">New</span>
            </button>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        {viewing !== null && groups[viewing] && (
          <StoryViewer
            stories={groups}
            startIndex={viewing}
            onClose={() => setViewing(null)}
            onSeen={markSeen}
            onEdit={(g) => {
              setViewing(null);
              setEditing(skills?.find((s) => s._id === g.id) ?? null);
            }}
            deletion={{
              prompt: (g) => `Delete all ${g.slides.length} ${g.title} ${g.slides.length === 1 ? 'story' : 'stories'}? The skill itself stays.`,
              run: (g) => api(`/skills/${g.id}/stories`, 'PUT', { slides: [] }),
            }}
          />
        )}
        {editing && (
          <StoryEditor skillId={editing._id} skillName={editing.name} slides={editing.slides ?? []} onClose={() => setEditing(null)} />
        )}
        {editingSkill && (
          <SkillEditor
            skill={editingSkill === 'new' ? undefined : editingSkill}
            onClose={() => setEditingSkill(null)}
            onEditStories={(sk) => {
              setEditingSkill(null);
              setEditing(sk);
            }}
          />
        )}
      </Suspense>
    </div>
  );
}
