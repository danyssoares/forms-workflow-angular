import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeActionComponent } from './node-action.component';

describe('NodeActionComponent', () => {
  let component: NodeActionComponent;
  let fixture: ComponentFixture<NodeActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodeActionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NodeActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
