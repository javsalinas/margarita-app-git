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
  USER: 'margarita_user',
  PROJECTS: 'margarita_projects',
};

// User Storage
export function saveUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

export function getUser(): User | null {
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : null;
}

export function clearUser(): void {
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// Projects Storage
export function saveProjects(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function getProjects(): Project[] {
  const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
  return data ? JSON.parse(data) : [];
}

export function saveProject(project: Project): void {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === project.id);
  
  if (index >= 0) {
    projects[index] = { ...project, updatedAt: Date.now() };
  } else {
    projects.push(project);
  }
  
  saveProjects(projects);
}

export function deleteProject(projectId: string): void {
  const projects = getProjects().filter(p => p.id !== projectId);
  saveProjects(projects);
}

export function getProject(projectId: string): Project | null {
  const projects = getProjects();
  return projects.find(p => p.id === projectId) || null;
}
