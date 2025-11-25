import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { RunFormComponent } from './run-form.component';
import { WorkflowStorageService, WorkflowSnapshot } from '../../flow/workflow-storage.service';
import { GraphModel } from '../../flow/graph.types';
import { ActivatedRoute, convertToParamMap } from '@angular/router';

describe('RunFormComponent', () => {
  let storage: jasmine.SpyObj<WorkflowStorageService>;
  let routeStub: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  const mockGraph: GraphModel = {
    nodes: [
      {
        id: 'node-1',
        kind: 'question',
        data: {
          id: 'q1',
          label: 'Qual é o seu nome?',
          type: { id: 0, label: 'Texto' },
          seq: 1
        } as any,
        position: { x: 0, y: 0 }
      },
      {
        id: 'node-2',
        kind: 'question',
        data: {
          id: 'q2',
          label: 'Aceita os termos?',
          type: { id: 5, label: 'Booleano' },
          trueLabel: 'Sim',
          falseLabel: 'Não',
          seq: 2
        } as any,
        position: { x: 120, y: 0 }
      }
    ],
    edges: []
  };

  const snapshot: WorkflowSnapshot = {
    name: 'Fluxo Teste',
    formName: 'Formulário Teste',
    savedAt: new Date().toISOString(),
    graph: mockGraph
  };

  beforeEach(() => {
    storage = jasmine.createSpyObj<WorkflowStorageService>('WorkflowStorageService', ['loadLastWorkflow', 'loadWorkflow']);
    routeStub = { snapshot: { queryParamMap: convertToParamMap({}) } };
  });

  describe('quando há um workflow salvo', () => {
    let component: RunFormComponent;
    let fixture: ComponentFixture<RunFormComponent>;

    beforeEach(async () => {
      storage.loadLastWorkflow.and.returnValue(snapshot);

      await TestBed.configureTestingModule({
        imports: [RunFormComponent, NoopAnimationsModule],
        providers: [
          { provide: WorkflowStorageService, useValue: storage },
          { provide: ActivatedRoute, useValue: routeStub }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(RunFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('deve carregar as perguntas do último workflow', () => {
      expect(component.loading()).toBeFalse();
      expect(component.questions().length).toBe(2);
      expect(component.currentQuestion()?.questionId).toBe('q1');
    });

    it('deve avançar no wizard e finalizar coletando as respostas', () => {
      component.form.get('q1')?.setValue('João Teste');
      component.goNext();

      expect(component.currentIndex()).toBe(1);
      expect(component.completed()).toBeFalse();

      component.form.get('q2')?.setValue(true);
      component.goNext();

      expect(component.completed()).toBeTrue();
      expect(component.answers()).toEqual(jasmine.objectContaining({ q1: 'João Teste', q2: true }));
    });

    it('deve mostrar o nome do arquivo em questões de imagem no resumo', () => {
      component.answers.set({
        foto: { files: [{ name: 'selfie.png' }] }
      });

      const answer = component.displayAnswer({
        questionId: 'foto',
        label: 'Envie uma foto',
        seq: 3,
        typeId: 6
      } as any);

      expect(answer).toBe('selfie.png');
    });

    it('deve mostrar o nome do arquivo em questões de upload genéricas no resumo', () => {
      component.answers.set({
        contrato: { fileNames: 'contrato.pdf' }
      });

      const answer = component.displayAnswer({
        questionId: 'contrato',
        label: 'Contrato social',
        seq: 4,
        typeId: 7
      } as any);

      expect(answer).toBe('contrato.pdf');
    });

    it('deve mostrar o label informado no objeto selecionado em listas de opções', () => {
      component.answers.set({
        categoria: { label: 'Prioridade Alta', value: 'HIGH' }
      });

      const answer = component.displayAnswer({
        questionId: 'categoria',
        label: 'Categoria',
        seq: 5,
        typeId: 8,
        options: [
          { label: 'Prioridade Alta', value: 'HIGH' },
          { label: 'Prioridade Baixa', value: 'LOW' }
        ]
      } as any);

      expect(answer).toBe('Prioridade Alta');
    });

    it('deve resolver o label da opção selecionada quando apenas o valor é informado', () => {
      component.answers.set({
        status: { value: 'APPROVED' }
      });

      const answer = component.displayAnswer({
        questionId: 'status',
        label: 'Status do pedido',
        seq: 6,
        typeId: 9,
        options: [
          { label: 'Aprovado', value: 'APPROVED' },
          { label: 'Reprovado', value: 'DENIED' }
        ]
      } as any);

      expect(answer).toBe('Aprovado');
    });
  });

  describe('quando há condições de comparação no fluxo', () => {
    let component: RunFormComponent;
    let fixture: ComponentFixture<RunFormComponent>;

    const conditionalGraph: GraphModel = {
      nodes: [
        {
          id: 'node-1',
          kind: 'question',
          data: {
            id: 'q1',
            label: 'Escolha uma opção',
            type: { id: 9, label: 'Seleção Única' },
            options: [
              { value: 'sim', label: 'Sim', score: 0 },
              { value: 'b', label: 'Opção B', score: 10 }
            ],
            seq: 1
          } as any,
          position: { x: 0, y: 0 }
        },
        {
          id: 'cond-1',
          kind: 'condition',
          data: {
            conditionType: 'comparison',
            conditions: [
              {
                id: 'cond-yes',
                type: 'comparison',
                name: 'Valor igual a sim',
                valueType: 'question',
                questionId: 'q1',
                questionValueType: 'value',
                operator: '==',
                compareValueType: 'fixed',
                compareValue: 'sim'
              },
              {
                id: 'cond-score',
                type: 'comparison',
                name: 'Pontuação alta',
                valueType: 'question',
                questionId: 'q1',
                questionValueType: 'score',
                operator: '>=',
                compareValueType: 'fixed',
                compareValue: 5
              }
            ]
          } as any,
          position: { x: 80, y: 0 }
        },
        {
          id: 'node-2',
          kind: 'question',
          data: { id: 'q2', label: 'Caminho SIM', type: { id: 0, label: 'Texto' }, seq: 2 } as any,
          position: { x: 160, y: -40 }
        },
        {
          id: 'node-3',
          kind: 'question',
          data: { id: 'q3', label: 'Caminho Score', type: { id: 0, label: 'Texto' }, seq: 3 } as any,
          position: { x: 160, y: 40 }
        }
      ],
      edges: [
        { id: 'edge-1', from: 'node-1', to: 'cond-1' },
        { id: 'edge-2', from: 'cond-1', to: 'node-2', conditionId: 'cond-yes' },
        { id: 'edge-3', from: 'cond-1', to: 'node-3', conditionId: 'cond-score' }
      ]
    };

    beforeEach(async () => {
      storage.loadLastWorkflow.and.returnValue({
        name: 'Fluxo Condicional',
        savedAt: new Date().toISOString(),
        graph: conditionalGraph
      } as WorkflowSnapshot);

      await TestBed.configureTestingModule({
        imports: [RunFormComponent, NoopAnimationsModule],
        providers: [
          { provide: WorkflowStorageService, useValue: storage },
          { provide: ActivatedRoute, useValue: routeStub }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(RunFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('deve seguir o caminho configurado quando o valor atende à condição', () => {
      component.form.get('q1')?.setValue('sim');

      component.goNext();

      expect(component.currentQuestion()?.questionId).toBe('q2');
    });

    it('deve usar o score da pergunta para avaliar a condição', () => {
      component.form.get('q1')?.setValue('b');

      component.goNext();

      expect(component.currentQuestion()?.questionId).toBe('q3');
    });

    it('não deve incluir no resumo perguntas ocultadas por condição', () => {
      component.form.get('q1')?.setValue('c');

      component.goNext();

      expect(component.completed()).toBeTrue();
      expect(component.summaryQuestions().map(question => question.questionId)).toEqual(['q1']);
    });
  });

  describe('quando há condições de comparação no fluxo', () => {
    let component: RunFormComponent;
    let fixture: ComponentFixture<RunFormComponent>;

    const conditionalGraph: GraphModel = {
      nodes: [
        {
          id: 'node-1',
          kind: 'question',
          data: {
            id: 'q1',
            label: 'Escolha uma opção',
            type: { id: 9, label: 'Seleção Única' },
            options: [
              { value: 'sim', label: 'Sim', score: 0 },
              { value: 'b', label: 'Opção B', score: 10 }
            ],
            seq: 1
          } as any,
          position: { x: 0, y: 0 }
        },
        {
          id: 'cond-1',
          kind: 'condition',
          data: {
            conditionType: 'comparison',
            conditions: [
              {
                id: 'cond-yes',
                type: 'comparison',
                name: 'Valor igual a sim',
                valueType: 'question',
                questionId: 'q1',
                questionValueType: 'value',
                operator: '==',
                compareValueType: 'fixed',
                compareValue: 'sim'
              },
              {
                id: 'cond-score',
                type: 'comparison',
                name: 'Pontuação alta',
                valueType: 'question',
                questionId: 'q1',
                questionValueType: 'score',
                operator: '>=',
                compareValueType: 'fixed',
                compareValue: 5
              }
            ]
          } as any,
          position: { x: 80, y: 0 }
        },
        {
          id: 'node-2',
          kind: 'question',
          data: { id: 'q2', label: 'Caminho SIM', type: { id: 0, label: 'Texto' }, seq: 2 } as any,
          position: { x: 160, y: -40 }
        },
        {
          id: 'node-3',
          kind: 'question',
          data: { id: 'q3', label: 'Caminho Score', type: { id: 0, label: 'Texto' }, seq: 3 } as any,
          position: { x: 160, y: 40 }
        }
      ],
      edges: [
        { id: 'edge-1', from: 'node-1', to: 'cond-1' },
        { id: 'edge-2', from: 'cond-1', to: 'node-2', conditionId: 'cond-yes' },
        { id: 'edge-3', from: 'cond-1', to: 'node-3', conditionId: 'cond-score' }
      ]
    };

    beforeEach(async () => {
      storage.loadLastWorkflow.and.returnValue({
        name: 'Fluxo Condicional',
        savedAt: new Date().toISOString(),
        graph: conditionalGraph
      } as WorkflowSnapshot);

      await TestBed.configureTestingModule({
        imports: [RunFormComponent, NoopAnimationsModule],
        providers: [
          { provide: WorkflowStorageService, useValue: storage },
          { provide: ActivatedRoute, useValue: routeStub }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(RunFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('deve seguir o caminho configurado quando o valor atende à condição', () => {
      component.form.get('q1')?.setValue('sim');

      component.goNext();

      expect(component.currentQuestion()?.questionId).toBe('q2');
    });

      it('deve usar o score da pergunta para avaliar a condição', () => {
        component.form.get('q1')?.setValue('b');

        component.goNext();

        expect(component.currentQuestion()?.questionId).toBe('q3');
      });

      it('deve finalizar o fluxo quando nenhuma condição é satisfeita', () => {
        component.form.get('q1')?.setValue('c');

        component.goNext();

        expect(component.completed()).toBeTrue();
        expect(component.currentQuestion()?.questionId).toBe('q1');
      });
    });

    describe('quando compara perguntas entre si', () => {
      let component: RunFormComponent;
      let fixture: ComponentFixture<RunFormComponent>;

      const comparisonBetweenQuestions: GraphModel = {
        nodes: [
          {
            id: 'node-1',
            kind: 'question',
            data: {
              id: 'q1',
              label: 'Primeira resposta',
              type: { id: 9, label: 'Seleção Única' },
              options: [
                { value: 'a', label: 'Opção A', score: 5 },
                { value: 'b', label: 'Opção B', score: 10 }
              ],
              seq: 1
            } as any,
            position: { x: 0, y: 0 }
          },
          {
            id: 'node-2',
            kind: 'question',
            data: {
              id: 'q2',
              label: 'Segunda resposta',
              type: { id: 9, label: 'Seleção Única' },
              options: [
                { value: 'a', label: 'Opção A', score: 5 },
                { value: 'c', label: 'Opção C', score: 5 }
              ],
              seq: 2
            } as any,
            position: { x: 120, y: 0 }
          },
          {
            id: 'cond-1',
            kind: 'condition',
            data: {
              conditionType: 'comparison',
              conditions: [
                {
                  id: 'match-values',
                  type: 'comparison',
                  name: 'Valores iguais',
                  valueType: 'question',
                  questionId: 'q1',
                  questionValueType: 'score',
                  operator: '==',
                  compareValueType: 'question',
                  compareQuestionId: 'q2',
                  compareQuestionValueType: 'score'
                }
              ]
            } as any,
            position: { x: 200, y: 0 }
          },
          {
            id: 'node-3',
            kind: 'question',
            data: {
              id: 'q3',
              label: 'Apenas quando iguais',
              type: { id: 9, label: 'Seleção Única' },
              options: [
                { value: 'x', label: 'Opção X', score: 5 },
                { value: 'y', label: 'Opção Y', score: 5 }
              ],
              seq: 3
            } as any,
            position: { x: 280, y: 0 }
          }
        ],
        edges: [
          { id: 'edge-1', from: 'node-1', to: 'node-2' },
          { id: 'edge-2', from: 'node-2', to: 'cond-1' },
          { id: 'edge-3', from: 'cond-1', to: 'node-3', conditionId: 'match-values' }
        ]
      };

      beforeEach(async () => {
        storage.loadLastWorkflow.and.returnValue({
          name: 'Fluxo Condicional',
          savedAt: new Date().toISOString(),
          graph: comparisonBetweenQuestions
        } as WorkflowSnapshot);

        await TestBed.configureTestingModule({
          imports: [RunFormComponent, NoopAnimationsModule],
          providers: [
            { provide: WorkflowStorageService, useValue: storage },
            { provide: ActivatedRoute, useValue: routeStub }
          ]
        }).compileComponents();

        fixture = TestBed.createComponent(RunFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });

      it('deve validar comparação pergunta-pergunta pelo score configurado', () => {
        component.form.get('q1')?.setValue('a');
        component.goNext();

        component.form.get('q2')?.setValue('a');
        component.goNext();

        expect(component.currentQuestion()?.questionId).toBe('q3');
      });

      it('não deve seguir quando os scores das perguntas não combinam', () => {
        component.form.get('q1')?.setValue('b');
        component.goNext();

        component.form.get('q2')?.setValue('a');
        component.goNext();

        expect(component.completed()).toBeTrue();
        expect(component.currentQuestion()?.questionId).toBe('q2');
      });
    });

    describe('quando não há workflow salvo', () => {
    let component: RunFormComponent;
    let fixture: ComponentFixture<RunFormComponent>;

    beforeEach(async () => {
      storage.loadLastWorkflow.and.returnValue(null);

      await TestBed.configureTestingModule({
        imports: [RunFormComponent, NoopAnimationsModule],
        providers: [
          { provide: WorkflowStorageService, useValue: storage },
          { provide: ActivatedRoute, useValue: routeStub }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(RunFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('deve exibir mensagem de erro orientando a salvar um fluxo', () => {
      expect(component.error()).toContain('Salve um workflow');
      expect(component.loading()).toBeFalse();
    });
  });

  describe('quando um workflow é indicado na URL', () => {
    let component: RunFormComponent;
    let fixture: ComponentFixture<RunFormComponent>;

    beforeEach(async () => {
      routeStub.snapshot.queryParamMap = convertToParamMap({ workflow: 'Fluxo Teste' });
      storage.loadWorkflow.and.returnValue(snapshot);

      await TestBed.configureTestingModule({
        imports: [RunFormComponent, NoopAnimationsModule],
        providers: [
          { provide: WorkflowStorageService, useValue: storage },
          { provide: ActivatedRoute, useValue: routeStub }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(RunFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('deve carregar o workflow informado nos parâmetros', () => {
      expect(storage.loadWorkflow).toHaveBeenCalledWith('Fluxo Teste');
      expect(component.workflowName()).toBe('Formulário Teste');
      expect(component.loading()).toBeFalse();
    });
  });

  describe('quando o workflow informado não existe', () => {
    let component: RunFormComponent;
    let fixture: ComponentFixture<RunFormComponent>;

    beforeEach(async () => {
      routeStub.snapshot.queryParamMap = convertToParamMap({ workflow: 'Inexistente' });
      storage.loadWorkflow.and.returnValue(null);

      await TestBed.configureTestingModule({
        imports: [RunFormComponent, NoopAnimationsModule],
        providers: [
          { provide: WorkflowStorageService, useValue: storage },
          { provide: ActivatedRoute, useValue: routeStub }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(RunFormComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('deve exibir erro informando que o workflow selecionado não foi encontrado', () => {
      expect(component.error()).toContain('Workflow selecionado não foi encontrado');
      expect(component.loading()).toBeFalse();
    });
  });
});
