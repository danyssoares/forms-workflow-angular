import { TestBed } from '@angular/core/testing';
import { WorkflowStorageService, WorkflowSnapshot } from './workflow-storage.service';
import { GraphModel } from './graph.types';

describe('WorkflowStorageService', () => {
  let service: WorkflowStorageService;
  let setItemSpy: jasmine.Spy;
  let getItemSpy: jasmine.Spy;
  let removeItemSpy: jasmine.Spy;
  let storage: Record<string, string>;

  const graphMock: GraphModel = { nodes: [], edges: [] };

  beforeEach(() => {
    storage = {};
    setItemSpy = spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      storage[key] = value;
    });
    getItemSpy = spyOn(localStorage, 'getItem').and.callFake((key: string) => storage[key] ?? null);
    removeItemSpy = spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete storage[key];
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkflowStorageService);
  });

  it('should save workflow in localStorage', () => {
    const snapshot = service.saveWorkflow('Teste', graphMock, 'Form Teste');

    expect(snapshot.name).toBe('Teste');
    expect(setItemSpy).toHaveBeenCalled();
    expect(storage['flowDesigner:workflow:Teste']).toBeTruthy();
    const parsed = JSON.parse(storage['flowDesigner:workflow:Teste']) as WorkflowSnapshot;
    expect(parsed.graph).toEqual(graphMock);
    expect(parsed.formName).toBe('Form Teste');
  });

  it('should list saved workflows', () => {
    service.saveWorkflow('A', graphMock);
    service.saveWorkflow('B', graphMock);

    const list = service.listWorkflows();
    expect(list.length).toBe(2);
    expect(list.map(l => l.name).sort()).toEqual(['A', 'B']);
  });

  it('should throw error when saving without name', () => {
    expect(() => service.saveWorkflow('', graphMock)).toThrow();
  });

  it('should return null when workflow not found', () => {
    const workflow = service.loadWorkflow('unknown');
    expect(workflow).toBeNull();
  });

  it('should delete workflow and update index', () => {
    service.saveWorkflow('A', graphMock);
    service.saveWorkflow('B', graphMock);

    service.deleteWorkflow('A');

    expect(removeItemSpy).toHaveBeenCalledWith('flowDesigner:workflow:A');
    const index = JSON.parse(storage['flowDesigner:workflow:index']) as string[];
    expect(index).toEqual(['B']);
    expect(service.loadWorkflow('A')).toBeNull();
    expect(service.listWorkflows().map(w => w.name)).toEqual(['B']);
  });
});
