import { supabase } from './supabase';

export interface Project {
  id: string;
  name: string;
  thumbnail: string;
  colors: string[];
  format: '9:16' | '1:1' | '4:5';
  palettePosition: { x: number; y: number };
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEYS = {
  PROJECTS: 'margarita_projects',
};

/**
 * Persistencia en Supabase (Nube)
 */
export async function saveProjectCloud(project: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('projects')
    .upsert({
      id: project.id,
      user_id: user.id,
      name: project.name,
      image_url: project.thumbnail, // En fase 3.1 subiremos a Storage
      colors: project.colors,
      format: project.format,
      palette_position: project.palettePosition,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;
  return data;
}

export async function getProjectsCloud() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Persistencia Local (Legacy / Guest Mode)
 */
export function getProjectsLocal(): Project[] {
  const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  return data ? JSON.parse(data) : [];
}

export function saveProjectLocal(project: Project): void {
  const projects = getProjectsLocal();
  const index = projects.findIndex(p => p.id === project.id);
  
  if (index >= 0) {
    projects[index] = { ...project, updatedAt: Date.now() };
  } else {
    projects.push(project);
  }
  
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

// Helper para obtener el usuario actual
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
