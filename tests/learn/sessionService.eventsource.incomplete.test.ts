import { describe, it } from 'vitest';
import { SessionService } from '../../services/SessionService';

class FakeEventSource {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
  // minimal surface for construction only
}

/**
 * Learning test: EventSource URL construction. Fill the expected URL.
 */
describe('Learning: SessionService.createEventSource (incomplete assert)', () => {
  it('builds the correct SSE path', () => {
    // Arrange: mock EventSource
    // @ts-expect-error override for test
    global.EventSource = FakeEventSource as any;

    // Act
    const es = SessionService.createEventSource('sess_123') as unknown as FakeEventSource;

    // Assert (fill expected URL)
    // expect(es.url).toBe(/* '/api/session/sess_123/stream' */);
  });
});

