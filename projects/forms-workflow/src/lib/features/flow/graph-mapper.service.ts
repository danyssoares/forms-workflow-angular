import { Injectable } from '@angular/core';
import { GraphModel, GraphNode, ConditionNodeData, ComparisonCondition, ExpressionCondition, Condition } from './graph.types';
import { FormDefinition, Question, Rule, RuleAction, RuleTrigger } from '../../shared/models/form-models';

@Injectable({ providedIn: 'root' })
export class GraphMapperService {
  toFormDefinition(graph: GraphModel, base: Partial<FormDefinition>): FormDefinition {
    const questions: Question[] = graph.nodes
      .filter(n => n.kind === 'question')
      .map(n => {
        const q: Question = {
          id: n.data.id,
          type: n.data.type,
          label: n.data.label,
          helpText: n.data.helpText,
          required: !!n.data.required,
          weight: n.data.score,
          trueLabel: n.data.trueLabel,
          falseLabel: n.data.falseLabel,
          options: n.data.options,
        } as Question;

        // If options include per-option score, build scoreMap for scoring service
        // questionTypes from form-models (Lista de Opções, Seleção Única e Seleção Múltipla)
        if ([8, 9, 10].includes(n.data.type?.id) && Array.isArray(n.data.options)) {
          const map: Record<string, number> = {};
          (n.data.options || []).forEach((opt: any) => {
            const key = String(opt?.value);
            const score = Number(opt?.score);
            if (!Number.isNaN(score)) map[key] = score;
          });
          // Only assign if there is at least one key
          if (Object.keys(map).length) (q as any).scoreMap = map;
        }

        return q;
      });

    const rules: Rule[] = [];
    // Regras por resposta: Pergunta -> Condição -> Ação
    graph.nodes.filter(n=>n.kind==='condition').forEach(cond => {
      const nodeData = cond.data as ConditionNodeData;
      const firstCondition = nodeData.conditions[0] as Condition | undefined;
      if (!firstCondition) return;
      const incoming = graph.edges.filter(e=>e.to===cond.id).map(e=>graph.nodes.find(n=>n.id===e.from)!).filter(Boolean);
      const q = incoming.find(n=>n.kind==='question');
      const actions = graph.edges.filter(e=>e.from===cond.id).map(e=>graph.nodes.find(n=>n.id===e.to)!).filter(n=>n?.kind==='action');
      if (!q || !actions.length) return;

      let trigger: RuleTrigger;
      if (nodeData.conditionType === 'expression') {
        trigger = { kind: 'onExpression', expression: (firstCondition as ExpressionCondition).expression } as any;
      } else {
        const comp = firstCondition as ComparisonCondition;
        trigger = {
          kind: 'onAnswer',
          questionId: q.data.id,
          operator: comp.operator || '==',
          value: comp.value
        } as any;
      }
      const ruleActions: RuleAction[] = actions.map(a=>{
        const t = a.data.type as RuleAction['type'];
        switch (t) {
          case 'openForm': return { type:'openForm', formId: a.data.params?.formId||'' } as RuleAction;
          case 'emitAlert': return { type:'emitAlert', alertCode: a.data.params?.alertCode||'ALERTA' } as RuleAction;
          case 'webhook': return { type:'webhook', url: a.data.params?.url||'', method: 'POST' } as RuleAction;
          case 'setTag': return { type:'setTag', tag: a.data.params?.tag||'' } as RuleAction;
          case 'setField': return { type:'setField', fieldPath: a.data.params?.fieldPath||'', value: a.data.params?.value } as RuleAction;
          default: return { type:'emitAlert', alertCode:'UNSPEC' } as RuleAction;
        }
      });
      rules.push({ id: crypto.randomUUID(), name: 'Regra '+cond.id, triggers:[trigger], actions: ruleActions, triggerPolicy: cond.data.policy||'ANY' });
    });

    // Regras por score (ScoreGate -> Ação)
    const finalScoreRules: Rule[] = [];
    graph.nodes.filter(n=>n.kind==='scoreGate').forEach(gate => {
      const actions = graph.edges.filter(e=>e.from===gate.id).map(e=>graph.nodes.find(n=>n.id===e.to)!).filter(n=>n?.kind==='action');
      if (!actions.length) return;
      const trigger: RuleTrigger = { kind:'onFinalScore', operator: gate.data.operator||'>=', value: Number(gate.data.value)||0 } as any;
      const ruleActions: RuleAction[] = actions.map(a=>({ type:'emitAlert', alertCode: a.data.params?.alertCode || 'SCORE_TRIGGER' } as RuleAction));
      finalScoreRules.push({ id: crypto.randomUUID(), name:'ScoreGate '+gate.id, triggers:[trigger], actions:ruleActions });
    });

    // Regras por score no nó final (End -> Condições -> Ação)
    graph.nodes.filter(n=>n.kind==='end').forEach(end => {
      const conds = (end.data?.conditions || []) as any[];
      conds.forEach((c, idx) => {
        const actions = graph.edges
          .filter(e=>e.from===end.id && e.conditionId === c.id)
          .map(e=>graph.nodes.find(n=>n.id===e.to)!)
          .filter(n=>n?.kind==='action');
        if (!actions.length) return;
        const trigger: RuleTrigger = (c.operator === 'between')
          ? ({ kind: 'onFinalScore', operator: 'between', range: c.range } as any)
          : ({ kind: 'onFinalScore', operator: (c.operator || '>=') as any, value: Number(c.value)||0 } as any);
        const ruleActions: RuleAction[] = actions.map(a=>{
          const t = a.data.type as RuleAction['type'];
          switch (t) {
            case 'openForm': return { type:'openForm', formId: a.data.params?.formId||'' } as RuleAction;
            case 'emitAlert': return { type:'emitAlert', alertCode: a.data.params?.alertCode||'ALERTA' } as RuleAction;
            case 'webhook': return { type:'webhook', url: a.data.params?.url||'', method: 'POST' } as RuleAction;
            case 'setTag': return { type:'setTag', tag: a.data.params?.tag||'' } as RuleAction;
            case 'setField': return { type:'setField', fieldPath: a.data.params?.fieldPath||'', value: a.data.params?.value } as RuleAction;
            default: return { type:'emitAlert', alertCode:'UNSPEC' } as RuleAction;
          }
        });
        const ruleName = `EndScore ${end.id} #${idx+1}`;
        finalScoreRules.push({ id: crypto.randomUUID(), name: ruleName, triggers:[trigger], actions:ruleActions });
      });
    });

    const now = new Date().toISOString();
    return {
      id: base.id ?? crypto.randomUUID(),
      name: base.name ?? 'Novo Formulário',
      description: base.description ?? '',
      version: base.version ?? 1,
      status: base.status ?? 'draft',
      createdAt: base.createdAt ?? now,
      updatedAt: now,
      scoringPolicy: base.scoringPolicy ?? 'sum',
      questions,
      rules,
      finalScoreRules,
    } as FormDefinition;
  }
}
