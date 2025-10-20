import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { WorkflowSnapshot, WorkflowStorageService } from '../workflow-storage.service';
import { WorkflowListComponent } from './workflow-list.component';

describe('WorkflowListComponent', () => {
  let component: WorkflowListComponent;
  let fixture: ComponentFixture<WorkflowListComponent>;
  let storage: WorkflowStorageService;
  let listSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, WorkflowListComponent]
    }).compileComponents();

    storage = TestBed.inject(WorkflowStorageService);
    listSpy = spyOn(storage, 'listWorkflows').and.returnValue([]);
  });

  function createComponent() {
    fixture = TestBed.createComponent(WorkflowListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should delete workflow and refresh list', () => {
    const initialList: WorkflowSnapshot[] = [
      {
        name: 'Fluxo Principal',
        graph: { nodes: [], edges: [] },
        savedAt: new Date().toISOString()
      }
    ];
    listSpy.and.returnValue(initialList);
    const deleteSpy = spyOn(storage, 'deleteWorkflow').and.stub();

    createComponent();

    listSpy.and.returnValue([]);
    component.deleteWorkflow(initialList[0]);

    expect(deleteSpy).toHaveBeenCalledWith('Fluxo Principal');
    expect(listSpy).toHaveBeenCalledTimes(2);
    expect(component.workflows()).toEqual([]);
  });
});
