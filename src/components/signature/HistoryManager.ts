import type { SignatureBlock } from './types';

export class HistoryManager {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxHistory: number = 30;

  constructor() {}

  /**
   * Registra un nuevo cambio de estado en la firma (guarda la instantánea serializada)
   */
  public pushState(blocks: SignatureBlock[]): void {
    const serialized = JSON.stringify(blocks);

    // Evitar registrar estados duplicados consecutivos
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === serialized) {
      return;
    }

    this.undoStack.push(serialized);
    this.redoStack = []; // Al hacer un cambio nuevo, limpiamos la pila de Redo

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift(); // Mantener el límite de historial
    }
  }

  /**
   * Deshacer el último cambio realizado
   */
  public undo(currentBlocks: SignatureBlock[]): SignatureBlock[] | null {
    if (this.undoStack.length <= 1) return null; // Debe quedar al menos un estado inicial

    this.undoStack.pop(); // Sacar el estado actual

    const previousSerialized = this.undoStack[this.undoStack.length - 1];
    if (!previousSerialized) return null;

    // Agregar el estado actual deshecho a la pila de redo
    this.redoStack.push(JSON.stringify(currentBlocks));

    try {
      return JSON.parse(previousSerialized);
    } catch (e) {
      return null;
    }
  }

  /**
   * Rehacer el cambio deshecho
   */
  public redo(): SignatureBlock[] | null {
    if (this.redoStack.length === 0) return null;

    const nextSerialized = this.redoStack.pop();
    if (!nextSerialized) return null;

    this.undoStack.push(nextSerialized);

    try {
      return JSON.parse(nextSerialized);
    } catch (e) {
      return null;
    }
  }

  /**
   * Reiniciar el historial
   */
  public clear(initialState: SignatureBlock[]): void {
    this.undoStack = [JSON.stringify(initialState)];
    this.redoStack = [];
  }
}
