import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NodeActionComponent } from './node-action.component';
import { GraphNode } from '../graph.types';

describe('NodeActionComponent', () => {
  let component: NodeActionComponent;
  let fixture: ComponentFixture<NodeActionComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NodeActionComponent]
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NodeActionComponent);
    component = fixture.componentInstance;
    httpMock.expectOne('assets/i18n/pt-BR.json').flush({});
    component.node = {
      id: 'action-1',
      kind: 'action',
      data: { type: 'sendNotification', seq: 1 },
      position: { x: 0, y: 0 }
    } satisfies GraphNode;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map known action types to friendly labels', () => {
    expect(component.labelKey()).toBe('ACTION_TYPE_SEND_NOTIFICATION');
    component.node = {
      id: 'action-2',
      kind: 'action',
      data: { type: 'emitAlert', seq: 2 },
      position: { x: 0, y: 0 }
    };
    expect(component.labelKey()).toBe('ACTION_TYPE_EMIT_ALERT');
  });
});
