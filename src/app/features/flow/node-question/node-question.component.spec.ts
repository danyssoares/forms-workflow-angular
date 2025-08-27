import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeQuestionComponent } from './node-question.component';

describe('NodeQuestionComponent', () => {
  let component: NodeQuestionComponent;
  let fixture: ComponentFixture<NodeQuestionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeQuestionComponent]
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
