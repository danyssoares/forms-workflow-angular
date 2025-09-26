import { Injectable } from '@angular/core';
import { FormDefinition, Rule, RuleAction, RuleTrigger } from './models/form-models';

@Injectable({ providedIn: 'root' })
export class RulesService {
  evaluateOnAnswers(form: FormDefinition, answers: Record<string, any>): RuleAction[] {
    const res: RuleAction[] = [];
    for (const rule of form.rules ?? []) if (this.checkRule(rule, answers, null)) res.push(...rule.actions);
    return res;
  }
  evaluateOnFinalScore(form: FormDefinition, score: number, answers: Record<string, any>): RuleAction[] {
    const res: RuleAction[] = [];
    for (const rule of form.finalScoreRules ?? []) if (this.checkRule(rule, answers, score)) res.push(...rule.actions);
    return res;
  }
  private checkRule(rule: Rule, answers: Record<string, any>, score: number | null): boolean {
    const policy = rule.triggerPolicy ?? 'ANY';
    const results = rule.triggers.map(t => this.checkTrigger(t, answers, score));
    return policy === 'ALL' ? results.every(Boolean) : results.some(Boolean);
  }
  private checkTrigger(t: RuleTrigger, answers: Record<string, any>, score: number | null): boolean {
    if (t.kind === 'onAnswer') {
      const v = answers[t.questionId];
      switch (t.operator) {
        case '==': return v == t.value; case '!=': return v != t.value; case '>': return Number(v) > Number(t.value);
        case '>=': return Number(v) >= Number(t.value); case '<': return Number(v) < Number(t.value); case '<=': return Number(v) <= Number(t.value);
        case 'in': return Array.isArray(t.value) && t.value.includes(v); case 'contains': return Array.isArray(v) && v.includes(t.value);
      }
    }
    if (t.kind === 'onFinalScore' && score !== null) {
      switch (t.operator) {
        case 'between': return !!t.range && score >= t.range[0] && score <= t.range[1];
        case '>=': return score >= (t.value ?? 0); case '<=': return score <= (t.value ?? 0);
        case '>': return score > (t.value ?? 0); case '<': return score < (t.value ?? 0);
        case '==': return score == (t.value ?? 0);
        case '!=': return score != (t.value ?? 0);
      }
    }
    return false;
  }
}
