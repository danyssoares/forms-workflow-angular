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

  addNode(kind: NodeKind, data: any, position: Point) {
    const id = crypto.randomUUID();
    const node: GraphNode = { id, kind, data, position };
    this._graph.next({ ...this.graph, nodes: [...this.graph.nodes, node] });
    this.select(id);
  }
  updateNode(id: string, data: any) {
    const nodes = this.graph.nodes.map(n => n.id === id ? { ...n, data } : n);
    this._graph.next({ ...this.graph, nodes });
  }
  moveNode(id: string, position: Point) {
    const nodes = this.graph.nodes.map(n => n.id === id ? { ...n, position } : n);
    this._graph.next({ ...this.graph, nodes });
  }
  removeNode(id: string) {
    const nodes = this.graph.nodes.filter(n => n.id !== id);
    const edges = this.graph.edges.filter(e => e.from !== id && e.to !== id);
    this._graph.next({ nodes, edges });
    this.select(null);
  }
  connect(fromId: string, toId: string, label?: string) {
    const id = crypto.randomUUID();
    const edge: GraphEdge = { id, from: fromId, to: toId, label };
    this._graph.next({ ...this.graph, edges: [...this.graph.edges, edge] });
  }
  removeEdge(id: string) {
    this._graph.next({ ...this.graph, edges: this.graph.edges.filter(e => e.id !== id) });
  }
  select(id: string | null) { this._selectedId.next(id); }

  get selectedNode(): GraphNode|undefined { return this.graph.nodes.find(n=>n.id===this._selectedId.value||''); }
}