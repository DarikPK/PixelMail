import type { SignatureProject, SignatureBlock } from './types';

const STORAGE_KEY = 'pixelmail_signature_projects';

export class ProjectManager {
  /**
   * Obtiene todos los proyectos guardados en localStorage
   */
  public static getAllProjects(): SignatureProject[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  /**
   * Guarda un proyecto nuevo o existente en localStorage
   */
  public static saveProject(name: string, blocks: SignatureBlock[], projectId?: string): SignatureProject {
    const projects = this.getAllProjects();
    const id = projectId || 'proj-' + Date.now();
    const now = new Date().toISOString();

    const existingIndex = projects.findIndex(p => p.id === id);

    const project: SignatureProject = {
      id,
      name: name.trim() || 'Firma Sin Nombre',
      blocks,
      createdAt: existingIndex >= 0 ? projects[existingIndex].createdAt : now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return project;
  }

  /**
   * Duplica un proyecto por su ID
   */
  public static duplicateProject(id: string): SignatureProject | null {
    const projects = this.getAllProjects();
    const target = projects.find(p => p.id === id);
    if (!target) return null;

    const duplicated: SignatureProject = {
      ...target,
      id: 'proj-' + Date.now(),
      name: `${target.name} (Copia)`,
      updatedAt: new Date().toISOString()
    };

    projects.push(duplicated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return duplicated;
  }

  /**
   * Elimina un proyecto de localStorage por su ID
   */
  public static deleteProject(id: string): void {
    const projects = this.getAllProjects();
    const filtered = projects.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Exporta un proyecto como archivo JSON descargable
   */
  public static exportToJSON(project: SignatureProject): void {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project.name.toLowerCase().replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}
