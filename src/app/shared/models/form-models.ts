export const questionTypes = [
  {id: 0, label:'Texto'}, 
  {id: 1, label:'Número'}, 
  {id: 2, label:'Data'}, 
  {id: 3, label:'Hora'}, 
  {id: 4, label:'Data e Hora'}, 
  {id: 5, label:'Booleano'}, 
  {id: 6, label:'Imagem'}, 
  {id: 7, label:'Arquivo'}, 
  {id: 8, label:'Lista de Opções'},     
  {id: 9, label:'Seleção Única'}, 
  {id: 10, label:'Seleção Múltipla'}];

  export const questionTypeOperators: Record<string, string[]> = {
    0: ['==', '!=', '>', '>=', '<', '<=', 'contains'],
    1: ['==', '!=', '>', '>=', '<', '<='],
    2: ['==', '!=', '>', '>=', '<', '<='],
    3: ['==', '!=', '>', '>=', '<', '<='],
    4: ['==', '!=', '>', '>=', '<', '<='],
    5: ['==', '!='],
    8: ['==', '!=', 'contains'],
    9: ['==', '!='],
    10: ['==', '!=', 'contains'],
    score: ['==', '!=', '>', '>=', '<', '<=']
  };

export type QuestionType = 'radio'|'checkbox'|'integer'|'double'|'boolean'|'text'|'image'|'select'|'date'|'datetime';

export interface Option { value: string|number|boolean; label: string; score?: number; }
export interface ValidationRule { type: 'required'|'min'|'max'|'regex'|'minLength'|'maxLength'; value?: number|string; message?: string; }
export interface VisibilityCondition { expression?: string; }

export interface Question {
  id: string; type: QuestionType; label: string; helpText?: string; required?: boolean;
  trueLabel?: string; falseLabel?: string;
  options?: Option[]; placeholder?: string; defaultValue?: any; validations?: ValidationRule[]; visibility?: VisibilityCondition;
  weight?: number; scoreMap?: Record<string, number>;
}

export type RuleTrigger =
  | { kind:'onAnswer'; questionId:string; operator:'=='|'!='|'>'|'>='|'<'|'<='|'in'|'contains'; value:any }
  | { kind:'onFinalScore'; operator:'between'|'>='|'<='|'>'|'<'|'=='|'!='; range?: [number,number]; value?: number };

export type RuleAction =
  | { type:'openForm'; formId:string }
  | { type:'emitAlert'; alertCode:string; payload?: Record<string,any> }
  | { type:'webhook'; url:string; method?: 'POST'|'GET'; bodyTemplate?: any }
  | { type:'setTag'; tag:string }
  | { type:'setField'; fieldPath:string; value:any };

export interface Rule { id:string; name:string; description?:string; triggers:RuleTrigger[]; triggerPolicy?: 'ALL'|'ANY'; actions:RuleAction[]; }

export interface FormDefinition {
  id:string; name:string; description?:string; version:number; status:'draft'|'published'|'archived'; createdAt:string; updatedAt:string;
  questions: Question[]; rules?: Rule[]; finalScoreRules?: Rule[]; scoringPolicy?: 'sum'|'average'|'custom';
}

export interface FormResponse { formId:string; formVersion:number; answers:Record<string, any>; score?:number; triggeredActions?:RuleAction[]; completedAt?:string; }
