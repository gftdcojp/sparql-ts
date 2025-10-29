import { describe, it, expect } from 'vitest';
import * as entry from '../index.js';

describe('index exports', () => {
  it('exposes createSparqlServer', () => {
    expect(typeof entry.createSparqlServer).toBe('function');
  });
});


