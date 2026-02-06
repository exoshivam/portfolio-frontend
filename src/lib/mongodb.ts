// MongoDB Connection and Types
// Replace your MongoDB connection string in the API calls below

export interface Profile {
  _id?: string;
  id?: string;
  username: string;
  full_name: string;
  bio: string;
  website: string;
  github_url?: string;
  avatar_url: string;
  projects_count: number;
  views_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  _id?: string;
  id?: string;
  name: string;
  icon: string;
  order_index: number;
  created_at: string;
}

export interface Project {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  image_urls: string[];
  project_url: string;
  technologies: string[];
  likes: number,
  order_index: number;
  created_at: string;
}

const API_BASE_URL = 'https://portfolio-backend-zphz.onrender.com/api';

// Fetch all profiles
export async function getProfile(): Promise<Profile | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
}

// Fetch all skills
export async function getSkills(): Promise<Skill[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/skills`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.sort((a: Skill, b: Skill) => a.order_index - b.order_index);
  } catch (error) {
    console.error('Error fetching skills:', error);
    return [];
  }
}

// Fetch all projects
export async function getProjects(): Promise<Project[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.sort((a: Project, b: Project) => a.order_index - b.order_index);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

// Create profile
export async function createProfile(profile: Profile): Promise<Profile | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error creating profile:', error);
    return null;
  }
}

// Update profile
export async function updateProfile(profile: Profile): Promise<Profile | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error updating profile:', error);
    return null;
  }
}

// Create skill
export async function createSkill(skill: Skill): Promise<Skill | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(skill),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error creating skill:', error);
    return null;
  }
}

// Create project
export async function createProject(project: Project): Promise<Project | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error creating project:', error);
    return null;
  }
}

// Update project
export async function updateProject(projectId: string, project: Partial<Project>): Promise<Project | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error updating project:', error);
    return null;
  }
}

// Delete project
export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'DELETE',
    });
    return response.ok;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}
