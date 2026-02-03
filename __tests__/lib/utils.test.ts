/**
 * Tests for debounce utility
 * Critical: Used for auto-save, needs to work perfectly
 */

import { debounce } from '@/lib/utils';

// Helper to wait for a delay
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('delays function execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 1000);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(999);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('resets delay on repeated calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 1000);

    debounced();
    jest.advanceTimersByTime(500);
    
    debounced(); // Reset timer
    jest.advanceTimersByTime(500);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('calls function with correct arguments', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('arg1', 'arg2', 123);
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  test('cancel method prevents execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 1000);

    debounced();
    debounced.cancel();
    jest.advanceTimersByTime(1000);

    expect(fn).not.toHaveBeenCalled();
  });

  test('cancel can be called multiple times safely', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 1000);

    debounced();
    debounced.cancel();
    debounced.cancel(); // Should not throw
    jest.advanceTimersByTime(1000);

    expect(fn).not.toHaveBeenCalled();
  });

  test('cancel works when no pending execution', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 1000);

    debounced.cancel(); // No pending call
    expect(() => debounced.cancel()).not.toThrow();
  });

  test('handles rapid calls correctly', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 1000);

    // Call 10 times rapidly
    for (let i = 0; i < 10; i++) {
      debounced(i);
      jest.advanceTimersByTime(50);
    }

    jest.advanceTimersByTime(1000);

    // Should only call once with last argument
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(9);
  });

  test('works with async functions', () => {
    const fn = jest.fn(async () => 'result');
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalled();
  });

  test('preserves function context', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    
    debounced();
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalled();
  });
});
