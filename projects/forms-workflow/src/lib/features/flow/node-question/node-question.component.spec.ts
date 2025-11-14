import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NodeQuestionComponent } from './node-question.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('NodeQuestionComponent', () => {
  let component: NodeQuestionComponent;
  let fixture: ComponentFixture<NodeQuestionComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NodeQuestionComponent, NoopAnimationsModule]
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(NodeQuestionComponent);
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
