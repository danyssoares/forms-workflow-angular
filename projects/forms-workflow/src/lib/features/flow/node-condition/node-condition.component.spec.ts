import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NodeConditionComponent } from './node-condition.component';

describe('NodeConditionComponent', () => {
  let component: NodeConditionComponent;
  let fixture: ComponentFixture<NodeConditionComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NodeConditionComponent]
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NodeConditionComponent);
    component = fixture.componentInstance;
    httpMock.expectOne('assets/i18n/pt-BR.json').flush({});
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => {
    httpMock.verify();
  });
});
