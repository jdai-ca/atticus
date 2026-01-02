import telemetry from '../telemetry';

describe('telemetry module', () => {
    it('exports expected metrics', () => {
        expect(telemetry).toBeDefined();
        expect(telemetry.requestsTotal).toBeDefined();
        expect(telemetry.providerDuration).toBeDefined();
        expect(telemetry.register).toBeDefined();
    });

    it('register contains default metrics contentType', () => {
        expect(typeof telemetry.register.contentType).toBe('string');
    });
});
