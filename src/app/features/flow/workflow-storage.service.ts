import { Injectable } from '@angular/core';
import { GraphModel } from './graph.types';

export interface WorkflowSnapshot {
  name: string;
  graph: GraphModel;
  savedAt: string;
  formName?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkflowStorageService {
  private readonly storageNamespace = 'flowDesigner:workflow';
  private readonly indexKey = `${this.storageNamespace}:index`;

  saveWorkflow(name: string, graph: GraphModel, formName?: string): WorkflowSnapshot {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Workflow name is required to save.');
    }
    const snapshot: WorkflowSnapshot = {
      name: trimmedName,
      graph,
      formName,
      savedAt: new Date().toISOString()
    };

    this.safeSetItem(this.keyFor(trimmedName), snapshot);
    this.appendToIndex(trimmedName);
    this.safeSetItem(`${this.storageNamespace}:last`, snapshot);
    return snapshot;
  }

  loadWorkflow(name: string): WorkflowSnapshot | null {
    if (!name) return null;
    return this.safeGetItem<WorkflowSnapshot>(this.keyFor(name.trim()));
  }

  listWorkflows(): WorkflowSnapshot[] {
    const index = this.safeGetItem<string[]>(this.indexKey) ?? [];
    const snapshots = index
      .map(n => this.loadWorkflow(n))
      .filter((snapshot): snapshot is WorkflowSnapshot => !!snapshot);
    return snapshots.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  deleteWorkflow(name: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    this.safeRemoveItem(this.keyFor(trimmedName));

    const index = (this.safeGetItem<string[]>(this.indexKey) ?? []).filter(entry => entry !== trimmedName);
    this.safeSetItem(this.indexKey, index);

    const lastSnapshot = this.safeGetItem<WorkflowSnapshot>(`${this.storageNamespace}:last`);
    if (lastSnapshot?.name === trimmedName) {
      this.safeRemoveItem(`${this.storageNamespace}:last`);
    }
  }

  private keyFor(name: string): string {
    return `${this.storageNamespace}:${name}`;
  }

  private appendToIndex(name: string): void {
    const index = this.safeGetItem<string[]>(this.indexKey) ?? [];
    if (!index.includes(name)) {
      index.push(name);
      this.safeSetItem(this.indexKey, index);
    }
  }

  private safeSetItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('Failed to persist workflow', err);
      throw err;
    }
  }

  private safeRemoveItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error('Failed to remove workflow', err);
      throw err;
    }
  }

  private safeGetItem<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error('Failed to recover workflow', err);
      return null;
    }
  }
}
