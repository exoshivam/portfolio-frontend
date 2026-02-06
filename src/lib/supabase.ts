// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error('Missing Supabase environment variables');
// }

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// export interface Profile {
//   id: string;
//   username: string;
//   full_name: string;
//   bio: string;
//   website: string;
//   avatar_url: string;
//   projects_count: number;
//   views_count: number;
//   following_count: number;
//   created_at: string;
//   updated_at: string;
// }

// export interface Skill {
//   id: string;
//   name: string;
//   icon: string;
//   order_index: number;
//   created_at: string;
// }

// export interface Project {
//   id: string;
//   title: string;
//   description: string;
//   image_url: string;
//   project_url: string;
//   technologies: string[];
//   order_index: number;
//   created_at: string;
// }
