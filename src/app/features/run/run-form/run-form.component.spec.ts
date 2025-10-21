import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { RunFormComponent } from './run-form.component';
import { WorkflowStorageService, WorkflowSnapshot } from '../../flow/workflow-storage.service';
import { GraphModel } from '../../flow/graph.types';

describe('RunFormComponent', () => {
  let storage: jasmine.SpyObj<WorkflowStorageService>;

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
    storage = jasmine.createSpyObj<WorkflowStorageService>('WorkflowStorageService', ['loadLastWorkflow']);
  });

  describe('quando há um workflow salvo', () => {
    let component: RunFormComponent;
    let fixture: ComponentFixture<RunFormComponent>;

    beforeEach(async () => {
      storage.loadLastWorkflow.and.returnValue(snapshot);

      await TestBed.configureTestingModule({
        imports: [RunFormComponent, NoopAnimationsModule],
        providers: [{ provide: WorkflowStorageService, useValue: storage }]
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
  });

  describe('quando não há workflow salvo', () => {
    let component: RunFormComponent;
    let fixture: ComponentFixture<RunFormComponent>;

    beforeEach(async () => {
      storage.loadLastWorkflow.and.returnValue(null);

      await TestBed.configureTestingModule({
        imports: [RunFormComponent, NoopAnimationsModule],
        providers: [{ provide: WorkflowStorageService, useValue: storage }]
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
});
