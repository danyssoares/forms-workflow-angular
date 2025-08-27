import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeConditionComponent } from './node-condition.component';

describe('NodeConditionComponent', () => {
  let component: NodeConditionComponent;
  let fixture: ComponentFixture<NodeConditionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeConditionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NodeConditionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
