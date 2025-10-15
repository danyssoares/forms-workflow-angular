import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NodeEndComponent } from './node-end.component';
import { GraphNode } from '../graph.types';

describe('NodeEndComponent', () => {
  let component: NodeEndComponent;
  let fixture: ComponentFixture<NodeEndComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NodeEndComponent]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NodeEndComponent);
    component = fixture.componentInstance;
    httpMock.expectOne('assets/i18n/pt-BR.json').flush({});
    component.node = {
      id: 'end-1',
      kind: 'end',
      data: { label: 'Fim', seq: 1, conditions: [] },
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

  it('should report custom label when provided', () => {
    expect(component.hasCustomLabel()).toBeTrue();
  });

  it('should detect missing custom label', () => {
    component.node = {
      id: 'end-2',
      kind: 'end',
      data: { label: '', seq: 2 },
      position: { x: 0, y: 0 }
    };
    fixture.detectChanges();
    expect(component.hasCustomLabel()).toBeFalse();
  });
});
