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

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

const STORAGE_KEYS = {
  PROJECTS: 'margarita_projects',
  USER: 'margarita_user',
};

/**
 * Persistencia Unificada
 */
export async function saveProject(project: Project) {
  // Intentar guardar en local primero
  saveProjectLocal(project);
  
  // Si hay sesión en Supabase, guardar en la nube
  try {
    const user = await getCurrentUser();
    if (user) {
      await saveProjectCloud(project);
    }
  } catch (e) {
    console.warn('Could not save to cloud, saved locally only.');
  }
}

export function getProject(id: string): Project | null {
  const projects = getProjectsLocal();
  return projects.find(p => p.id === id) || null;
}

export function getUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : null;
}

/**
 * Persistencia en Supabase (Nube)
 */
async function saveProjectCloud(project: any) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('projects')
    .upsert({
      id: project.id,
      user_id: user.id,
      name: project.name,
      image_url: project.thumbnail,
      colors: project.colors,
      format: project.format,
      palette_position: project.palettePosition,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;
  return data;
}

/**
 * Persistencia Local
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
