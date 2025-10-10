import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GraphModel, GraphNode, GraphEdge, NodeKind, Point } from './graph.types';

@Injectable({ providedIn: 'root' })
export class GraphStateService {
  private _graph = new BehaviorSubject<GraphModel>({ nodes: [], edges: [] });
  graph$ = this._graph.asObservable();
  get graph() { return this._graph.value; }

  private _selectedId = new BehaviorSubject<string|null>(null);
  selectedId$ = this._selectedId.asObservable();
  private _selectedIds = new BehaviorSubject<string[]>([]);
  selectedIds$ = this._selectedIds.asObservable();

  private _sidebarOpen = new BehaviorSubject<boolean>(false);
  sidebarOpen$ = this._sidebarOpen.asObservable();

  // Simple undo stack for previous graph states
  private undoStack: GraphModel[] = [];

  private cloneGraph(g: GraphModel): GraphModel {
    try {
      const sc: any = (globalThis as any).structuredClone;
      if (typeof sc === 'function') {
        return sc(g);
      }
    } catch {}
    return JSON.parse(JSON.stringify(g));
  }

  private pushHistory() {
    const snapshot = this.cloneGraph(this.graph);
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 100) this.undoStack.shift();
  }

  undo() {
    const prev = this.undoStack.pop();
    if (prev) {
      this._graph.next(prev);
      // adjust selection to existing nodes
      const existing = new Set(prev.nodes.map(n => n.id));
      const primary = this._selectedId.value;
      if (primary && !existing.has(primary)) this._selectedId.next(null);
      const multi = this._selectedIds.value.filter(id => existing.has(id));
      this._selectedIds.next(multi);
    }
  }

  /** Counters to provide incremental numbering per node type */
  private counters: Record<NodeKind, number> = {
    question: 0,
    condition: 0,
    action: 0,
    scoreGate: 0,
    end: 0
  };

  private nextSeqFor(kind: NodeKind): number {
    const maxExisting = this.graph.nodes
      .filter(n => n.kind === kind)
      .reduce((max, node) => {
        const seq = Number((node.data as any)?.seq);
        return Number.isFinite(seq) && seq > max ? seq : max;
      }, 0);

    const baseline = Math.max(this.counters[kind] ?? 0, maxExisting);
    const nextSeq = baseline + 1;
    this.counters[kind] = nextSeq;
    return nextSeq;
  }

  addNode(kind: NodeKind, data: any, position: Point) {
    this.pushHistory();
    const id = crypto.randomUUID();
    const seq = this.nextSeqFor(kind);
    const node: GraphNode = { id, kind, data: { ...data, seq }, position };
    this._graph.next({ ...this.graph, nodes: [...this.graph.nodes, node] });
    this.select(id);
  }
  updateNode(id: string, data: any) {
    this.pushHistory();
    const nodes = this.graph.nodes.map(n => n.id === id ? { ...n, data } : n);
    this._graph.next({ ...this.graph, nodes });
  }
  moveNode(id: string, position: Point) {
    this.pushHistory();
    const nodes = this.graph.nodes.map(n => n.id === id ? { ...n, position } : n);
    this._graph.next({ ...this.graph, nodes });
  }
  moveNodes(moves: Array<{ id: string; position: Point }>) {
    if (!moves?.length) return;
    this.pushHistory();
    const byId = new Map(moves.map(m => [m.id, m.position]));
    const nodes = this.graph.nodes.map(n => byId.has(n.id) ? { ...n, position: byId.get(n.id)! } : n);
    this._graph.next({ ...this.graph, nodes });
  }
  removeNode(id: string) {
    this.pushHistory();
    const nodeToRemove = this.graph.nodes.find(n => n.id === id);
    const remainingNodes = this.graph.nodes.filter(n => n.id !== id);
    const edges = this.graph.edges.filter(e => e.from !== id && e.to !== id);

    let updatedNodes = remainingNodes;

    if (nodeToRemove?.kind === 'question') {
      let seq = 1;
      updatedNodes = remainingNodes.map(n => {
        if (n.kind !== 'question') return n;
        return { ...n, data: { ...n.data, seq: seq++ } };
      });
      this.counters.question = seq - 1;
    }

    this._graph.next({ nodes: updatedNodes, edges });
    this.select(null);
  }
  removeNodes(ids: string[]) {
    const unique = Array.from(new Set(ids));
    if (!unique.length) return;
    this.pushHistory();
    const idSet = new Set(unique);
    const removed = this.graph.nodes.filter(n => idSet.has(n.id));
    const remainingNodes = this.graph.nodes.filter(n => !idSet.has(n.id));
    const edges = this.graph.edges.filter(e => !idSet.has(e.from) && !idSet.has(e.to));

    let updatedNodes = remainingNodes;
    const removedQuestion = removed.some(n => n.kind === 'question');
    if (removedQuestion) {
      let seq = 1;
      updatedNodes = remainingNodes.map(n => {
        if (n.kind !== 'question') return n;
        return { ...n, data: { ...n.data, seq: seq++ } };
      });
      this.counters.question = seq - 1;
    }
    this._graph.next({ nodes: updatedNodes, edges });
    this.select(null);
  }
  connect(fromId: string, toId: string, label?: string, conditionId?: string) {
    // Prevent duplicate edges with the same origin and destination
    const exists = this.graph.edges.some(e => e.from === fromId && e.to === toId);
    if (exists) return;
    this.pushHistory();
    const id = crypto.randomUUID();
    const edge: GraphEdge = { id, from: fromId, to: toId, label, conditionId };
    this._graph.next({ ...this.graph, edges: [...this.graph.edges, edge] });
  }
  removeEdge(id: string) {
    this.pushHistory();
    this._graph.next({ ...this.graph, edges: this.graph.edges.filter(e => e.id !== id) });
  }
  select(id: string | null) {
    if (id) {
      this._selectedIds.next([id]);
      this._selectedId.next(id);
    } else {
      this.clearSelection();
    }
  }

  setSelection(ids: string[], primary?: string | null) {
    const unique = Array.from(new Set(ids));
    this._selectedIds.next(unique);
    if (primary !== undefined) {
      this._selectedId.next(primary);
    }
  }

  clearSelection() {
    this._selectedIds.next([]);
    this._selectedId.next(null);
    // Ensure sidebar closes when there is no active selection
    this._sidebarOpen.next(false);
  }

  openSidebar(id: string) {
    this.select(id);
    this._sidebarOpen.next(true);
  }

  closeSidebar() {
    this._sidebarOpen.next(false);
    this.clearSelection();
  }

  get selectedNode(): GraphNode|undefined { return this.graph.nodes.find(n=>n.id===(this._selectedId.value||'')); }
}

