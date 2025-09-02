import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeQuestionComponent } from './node-question.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('NodeQuestionComponent', () => {
  let component: NodeQuestionComponent;
  let fixture: ComponentFixture<NodeQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeQuestionComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NodeQuestionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
