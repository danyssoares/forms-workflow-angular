import { TestBed } from '@angular/core/testing';

import { GraphStateService } from './graph-state.service';

describe('GraphStateService', () => {
  let service: GraphStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
