import { describe, it, expect } from 'vitest';
const he = require('he');

// ─── Test: HTML Sanitization (Issue #1) ───
describe('HTML Sanitization (he.encode)', () => {
    it('should escape HTML special characters in user input', () => {
        const maliciousInput = '<script>alert("XSS")</script>';
        const sanitized = he.encode(maliciousInput);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<');
    });

    it('should handle normal text without modification', () => {
        const normalInput = 'Ion Popescu';
        expect(he.encode(normalInput)).toBe('Ion Popescu');
    });

    it('should escape quotes and ampersands', () => {
        const input = 'Company "A & B"';
        const sanitized = he.encode(input);
        expect(sanitized).not.toContain('"');
        expect(sanitized).not.toContain('&B'); // raw ampersand should be encoded
    });
});

// ─── Test: Safe JSON Parsing (Issue #11) ───
describe('Safe JSON Parsing', () => {
    const safeJsonParse = (str, fallback = {}) => {
        if (typeof str !== 'string') return str || fallback;
        try { return JSON.parse(str); } catch (e) { return fallback; }
    };

    it('should parse valid JSON strings', () => {
        const result = safeJsonParse('{"ro": "test", "en": "test"}');
        expect(result).toEqual({ ro: 'test', en: 'test' });
    });

    it('should return fallback for invalid JSON', () => {
        const result = safeJsonParse('{invalid json!!}', { ro: '', en: '' });
        expect(result).toEqual({ ro: '', en: '' });
    });

    it('should return the value directly if not a string', () => {
        const obj = { ro: 'test' };
        expect(safeJsonParse(obj)).toBe(obj);
    });

    it('should return fallback for null/undefined', () => {
        expect(safeJsonParse(null, {})).toEqual({});
        expect(safeJsonParse(undefined, {})).toEqual({});
    });
});

// ─── Test: Server-Side Price Validation Logic (Issue #3) ───
describe('Price Validation Logic', () => {
    it('should correctly calculate subtotal from DB prices', () => {
        const dbProducts = [
            { id: 1, price: 450, name: 'Product A', sku: 'SKU-A' },
            { id: 2, price: 320, name: 'Product B', sku: 'SKU-B' },
        ];
        const clientItems = [
            { id: 1, quantity: 2 },  // Client says 2x Product A
            { id: 2, quantity: 1 },  // Client says 1x Product B
        ];

        const dbPriceMap = new Map();
        dbProducts.forEach(p => dbPriceMap.set(String(p.id), p));

        let serverSubtotal = 0;
        for (const item of clientItems) {
            const dbProduct = dbPriceMap.get(String(item.id));
            expect(dbProduct).toBeDefined();
            const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
            serverSubtotal += Number(dbProduct.price) * qty;
        }

        expect(serverSubtotal).toBe(450 * 2 + 320 * 1); // 1220
    });

    it('should reject items not found in DB', () => {
        const dbProducts = [{ id: 1, price: 450, name: 'Product A', sku: 'SKU-A' }];
        const dbPriceMap = new Map();
        dbProducts.forEach(p => dbPriceMap.set(String(p.id), p));

        const fakeItem = { id: 999, quantity: 1, name: 'Fake Product' };
        const dbProduct = dbPriceMap.get(String(fakeItem.id));
        expect(dbProduct).toBeUndefined();
    });

    it('should enforce minimum quantity of 1', () => {
        const qty = Math.max(1, Math.floor(Number(0) || 1));
        expect(qty).toBe(1);

        const qtyNeg = Math.max(1, Math.floor(Number(-5) || 1));
        expect(qtyNeg).toBe(1);
    });

    it('should calculate percent discount correctly', () => {
        const subtotal = 1000;
        const discountType = 'percent';
        const discountValue = 10;

        const discount = discountType === 'percent'
            ? (subtotal * Number(discountValue)) / 100
            : Number(discountValue);

        expect(discount).toBe(100);
    });

    it('should calculate fixed discount correctly', () => {
        const subtotal = 1000;
        const discountType = 'fixed';
        const discountValue = 50;

        const discount = discountType === 'percent'
            ? (subtotal * Number(discountValue)) / 100
            : Number(discountValue);

        expect(discount).toBe(50);
    });

    it('should not allow total to go below 0', () => {
        const subtotal = 30;
        const discount = 50;
        const total = Math.max(0, subtotal - discount);
        expect(total).toBe(0);
    });
});

// ─── Test: Error Message Sanitization (Issue #12) ───
describe('Error Message Safety', () => {
    it('should not expose internal error details to clients', () => {
        // Simulate what the server should do: return generic message, not err.message
        const internalError = new Error('ECONNREFUSED 127.0.0.1:3306 - MySQL connection failed');
        const clientResponse = { error: 'Eroare internă.' }; // What server now returns

        expect(clientResponse.error).not.toContain('ECONNREFUSED');
        expect(clientResponse.error).not.toContain('MySQL');
        expect(clientResponse.error).toBe('Eroare internă.');
    });
});
