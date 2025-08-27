export type NodeKind = 'question'|'condition'|'action'|'scoreGate';
export interface Point { x:number; y:number; }
export interface GraphNode<T=any> { id:string; kind:NodeKind; data:T; position:Point; }
export interface GraphEdge { id:string; from:string; to:string; label?:string; }
export interface GraphModel { nodes:GraphNode[]; edges:GraphEdge[]; }

export interface QuestionNodeData { id:string; label:string; type:'text'|'integer'|'double'|'boolean'|'select'|'radio'|'checkbox'|'date'|'datetime'|'image'; helpText?:string; seq?:number; }
export interface ConditionNodeData { sourceQuestionId?:string; operator?:'=='|'!='|'>'|'>='|'<'|'<='|'in'|'contains'; value?:any; policy?:'ALL'|'ANY'; seq?:number; }
export interface ActionNodeData { type:'openForm'|'emitAlert'|'webhook'|'setTag'|'setField'; params?:Record<string,any>; seq?:number; }
export interface ScoreGateData { operator?:'>='|'<='|'>'|'<'; value?:number; seq?:number; }