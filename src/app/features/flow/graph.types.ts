export type NodeKind = 'question'|'condition'|'action'|'scoreGate'|'end';
export interface Point { x:number; y:number; }
export interface GraphNode<T=any> { id:string; kind:NodeKind; data:T; position:Point; }
export interface GraphEdge { id:string; from:string; to:string; label?:string; conditionId?:string; }
export interface GraphModel { nodes:GraphNode[]; edges:GraphEdge[]; }

export interface QuestionNodeData { id:string; label:string; type:'text'|'integer'|'double'|'boolean'|'select'|'radio'|'checkbox'|'date'|'datetime'|'image'; score?:number; trueLabel?:string; falseLabel?:string; options?:any[]; helpText?:string; seq?:number; }

export interface ComparisonCondition {
  type: 'comparison';
  id: string;
  name: string;
  valueType: 'fixed' | 'question' | 'score'; // Toggle para o primeiro valor
  value?: any;
  questionId?: string;
  operator?: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'contains';
  compareValueType: 'fixed' | 'question' | 'score'; // Toggle para o segundo valor
  compareValue?: any;
  compareQuestionId?: string;
}

export interface ExpressionCondition {
  type: 'expression';
  id: string;
  expression: string;
}

export type Condition = ComparisonCondition | ExpressionCondition;

export interface ConditionNodeData {
  conditionType: 'comparison' | 'expression';
  conditions: Condition[];
  seq?: number;
}

export interface ActionNodeData { type:'openForm'|'emitAlert'|'webhook'|'setTag'|'setField'; params?:Record<string,any>; seq?:number; }
export interface ScoreGateData { operator?:'>='|'<='|'>'|'<'; value?:number; seq?:number; }
export interface EndNodeData { label?: string; seq?: number; }