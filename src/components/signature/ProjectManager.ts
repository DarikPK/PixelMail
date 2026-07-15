import type { SignatureProject, SignatureBlock, AssetRecord } from './types';

const STORAGE_KEY = 'pixelmail_signature_projects_dom';

export class ProjectManager {
  private static memoryProjects: SignatureProject[] = [];
  private static hasMigratedFromStorage = false;

  /**
   * Obtiene todos los proyectos. Intenta leer de localStorage una única vez,
   * los carga en memoria para migración y limpia la clave para liberar espacio.
   */
  public static getAllProjects(): SignatureProject[] {
    if (!this.hasMigratedFromStorage) {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            this.memoryProjects = parsed;
            console.log("MIGRACIÓN: Se cargaron proyectos antiguos de localStorage a memoria.", parsed.length);
          }
        } catch (e) {
          console.error("Error al leer datos antiguos de localStorage:", e);
        } finally {
          // Confirmar eliminación de la clave antigua
          localStorage.removeItem(STORAGE_KEY);
          this.hasMigratedFromStorage = true;
          console.log("MIGRACIÓN: Se eliminó de localStorage la clave pesada pixelmail_signature_projects_dom.");
        }
      } else {
        this.hasMigratedFromStorage = true;
      }
    }
    return this.memoryProjects;
  }

  /**
   * Guarda un proyecto únicamente en memoria para evitar QuotaExceededError en localStorage.
   */
  public static saveProject(
    name: string,
    rawHTML: string,
    blocks: SignatureBlock[],
    missingAssets: AssetRecord[],
    projectId?: string
  ): SignatureProject {
    const projects = this.getAllProjects();
    const id = projectId || 'proj-' + Date.now();
    const now = new Date().toISOString();

    const existingIndex = projects.findIndex(p => p.id === id);

    const project: SignatureProject = {
      id,
      name: name.trim() || 'Firma Sin Nombre',
      rawHTML,
      blocks,
      missingAssets,
      createdAt: existingIndex >= 0 ? projects[existingIndex].createdAt : now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }

    this.memoryProjects = projects;
    console.log("Firma guardada en memoria del ProjectManager. ID:", id);
    return project;
  }

  /**
   * Duplica un proyecto en memoria
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
    this.memoryProjects = projects;
    return duplicated;
  }

  /**
   * Elimina un proyecto en memoria
   */
  public static deleteProject(id: string): void {
    const projects = this.getAllProjects();
    this.memoryProjects = projects.filter(p => p.id !== id);
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
