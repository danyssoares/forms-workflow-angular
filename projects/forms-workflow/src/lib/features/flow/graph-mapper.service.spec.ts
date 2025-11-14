import { TestBed } from '@angular/core/testing';

import { GraphMapperService } from './graph-mapper.service';

describe('GraphMapperService', () => {
  let service: GraphMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphMapperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
