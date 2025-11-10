import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowStorageService } from '../workflow-storage.service';
import { FlowDesignerComponent } from './flow-designer.component';

describe('FlowDesignerComponent', () => {
  let component: FlowDesignerComponent;
  let fixture: ComponentFixture<FlowDesignerComponent>;
  let httpMock: HttpTestingController;
  let routeStub: { snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> } };

  beforeEach(async () => {
    routeStub = {
      snapshot: { queryParamMap: convertToParamMap({}) }
    };
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, FlowDesignerComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: routeStub
        }
      ]
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  function createComponent() {
    fixture = TestBed.createComponent(FlowDesignerComponent);
    httpMock.expectOne('assets/i18n/pt-BR.json').flush({});
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should save workflow using storage service', () => {
    createComponent();
    const storage = TestBed.inject(WorkflowStorageService);
    const snack = TestBed.inject(MatSnackBar);
    const saveSpy = spyOn(storage, 'saveWorkflow').and.returnValue({
      name: 'Fluxo Teste',
      graph: { nodes: [], edges: [] },
      savedAt: new Date().toISOString()
    });
    spyOn(localStorage, 'setItem');
    spyOn(snack, 'open');

    component.formNameControl.setValue('Fluxo Teste');
    component.saveForm();

    expect(saveSpy).toHaveBeenCalledWith(
      'Fluxo Teste',
      jasmine.objectContaining({ nodes: [], edges: [] }),
      'Fluxo Teste'
    );
  });

  it('should load workflow when query parameter is present', () => {
    const storage = TestBed.inject(WorkflowStorageService);
    const graph = { nodes: [], edges: [] };
    spyOn(storage, 'loadWorkflow').and.returnValue({
      name: 'Existente',
      formName: 'Existente',
      graph,
      savedAt: new Date().toISOString()
    });
    routeStub.snapshot.queryParamMap = convertToParamMap({ workflow: 'Existente' });

    createComponent();

    expect(storage.loadWorkflow).toHaveBeenCalledWith('Existente');
    expect(component.formNameControl.value).toBe('Existente');
  });

  it('should replace stored workflow entry when name changes', () => {
    const storage = TestBed.inject(WorkflowStorageService);
    const graph = { nodes: [], edges: [] };
    routeStub.snapshot.queryParamMap = convertToParamMap({ workflow: 'Original' });
    spyOn(storage, 'loadWorkflow').and.returnValue({
      name: 'Original',
      formName: 'Original',
      graph,
      savedAt: new Date().toISOString()
    });

    createComponent();

    const saveSpy = spyOn(storage, 'saveWorkflow').and.returnValue({
      name: 'Renomeado',
      graph,
      savedAt: new Date().toISOString()
    });
    const deleteSpy = spyOn(storage, 'deleteWorkflow');
    component.formNameControl.setValue('Renomeado');
    component.saveForm();

    expect(saveSpy).toHaveBeenCalledWith('Renomeado', jasmine.objectContaining(graph), 'Renomeado');
    expect(deleteSpy).toHaveBeenCalledWith('Original');
  });
});
