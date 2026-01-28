import { describe, it, expect } from 'vitest';

describe('Room Code Normalization', () => {
    // Helper that mimics the normalization logic from useGameRoom
    const normalizeRoomCode = (code?: string) => code?.trim().toUpperCase();

    it('trims leading whitespace', () => {
        expect(normalizeRoomCode('  ABC123')).toBe('ABC123');
    });

    it('trims trailing whitespace', () => {
        expect(normalizeRoomCode('ABC123  ')).toBe('ABC123');
    });

    it('trims both leading and trailing whitespace', () => {
        expect(normalizeRoomCode('  ABC123  ')).toBe('ABC123');
    });

    it('converts to uppercase', () => {
        expect(normalizeRoomCode('abc123')).toBe('ABC123');
    });

    it('handles mixed case with whitespace', () => {
        expect(normalizeRoomCode('  aBc123  ')).toBe('ABC123');
    });

    it('handles undefined', () => {
        expect(normalizeRoomCode(undefined)).toBeUndefined();
    });

    it('handles empty string', () => {
        expect(normalizeRoomCode('')).toBe('');
    });

    it('handles whitespace-only string', () => {
        expect(normalizeRoomCode('   ')).toBe('');
    });

    it('preserves valid room code', () => {
        expect(normalizeRoomCode('ABC123')).toBe('ABC123');
    });

    it('handles newline characters from copy-paste', () => {
        expect(normalizeRoomCode('ABC123\n')).toBe('ABC123');
        expect(normalizeRoomCode('\nABC123')).toBe('ABC123');
    });

    it('handles tab characters', () => {
        expect(normalizeRoomCode('ABC123\t')).toBe('ABC123');
        expect(normalizeRoomCode('\tABC123')).toBe('ABC123');
    });
});
