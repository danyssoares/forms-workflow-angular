export interface QuestionTypeDefinition {
  id: number;
  labelKey: string;
  promptKey: string;
}

export interface QuestionTypeOption {
  id: number;
  label: string;
}

export const questionTypeDefinitions: QuestionTypeDefinition[] = [
  { id: 0, labelKey: 'QUESTION_TYPE_TEXT', promptKey: 'QUESTION_PROMPT_TEXT' },
  { id: 1, labelKey: 'QUESTION_TYPE_NUMBER', promptKey: 'QUESTION_PROMPT_NUMBER' },
  { id: 2, labelKey: 'QUESTION_TYPE_DATE', promptKey: 'QUESTION_PROMPT_DATE' },
  { id: 3, labelKey: 'QUESTION_TYPE_TIME', promptKey: 'QUESTION_PROMPT_TIME' },
  { id: 4, labelKey: 'QUESTION_TYPE_DATETIME', promptKey: 'QUESTION_PROMPT_DATETIME' },
  { id: 5, labelKey: 'QUESTION_TYPE_BOOLEAN', promptKey: 'QUESTION_PROMPT_BOOLEAN' },
  { id: 6, labelKey: 'QUESTION_TYPE_IMAGE', promptKey: 'QUESTION_PROMPT_IMAGE' },
  { id: 7, labelKey: 'QUESTION_TYPE_FILE', promptKey: 'QUESTION_PROMPT_FILE' },
  { id: 8, labelKey: 'QUESTION_TYPE_OPTIONS', promptKey: 'QUESTION_PROMPT_OPTIONS' },
  { id: 9, labelKey: 'QUESTION_TYPE_SINGLE_SELECT', promptKey: 'QUESTION_PROMPT_SINGLE_SELECT' },
  { id: 10, labelKey: 'QUESTION_TYPE_MULTI_SELECT', promptKey: 'QUESTION_PROMPT_MULTI_SELECT' }
];

export function getQuestionTypeDefinition(typeId?: number): QuestionTypeDefinition {
  const fallback = questionTypeDefinitions[0];
  if (typeId === undefined || typeId === null) return fallback;
  return questionTypeDefinitions.find(def => def.id === typeId) ?? fallback;
}

export function getQuestionTypePromptKey(typeId?: number): string {
  return getQuestionTypeDefinition(typeId).promptKey;
}

export function createQuestionTypeOption(
  def: QuestionTypeDefinition,
  translate: (key: string) => string
): QuestionTypeOption {
  return { id: def.id, label: translate(def.labelKey) };
}

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
