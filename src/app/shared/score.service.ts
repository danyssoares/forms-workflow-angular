import { Injectable } from '@angular/core';
import { FormDefinition, Question } from './models/form-models';

@Injectable({ providedIn: 'root' })
export class ScoreService {
  compute(form: FormDefinition, answers: Record<string, any>): number {
    const values = form.questions.map(q => this.scoreForQuestion(q, answers[q.id]));
    if (form.scoringPolicy === 'average') {
      const nums = values as number[]; return nums.length ? nums.reduce((a,b)=>a+b,0) / nums.length : 0;
    }
    return values.reduce((a,b)=>a+b,0);
  }
  private scoreForQuestion(q: Question, value: any): number {
    if (q.scoreMap) {
      if (Array.isArray(value)) return value.map(v => q.scoreMap![String(v)] ?? 0).reduce((a,b)=>a+b,0);
      return q.scoreMap[String(value)] ?? 0;
    }
    if (value===undefined || value===null || value==='' || (Array.isArray(value)&&!value.length)) return 0;
    return q.weight ?? 0;
  }
}