import { normalizeTelemetryProperties } from '@/services/analytics/analyticsService';

describe('normalizeTelemetryProperties', () => {
  it('stringifies booleans and numbers for telemetry API', () => {
    expect(
      normalizeTelemetryProperties({
        cloud_save_enabled: true,
        economy_source: 'remote',
        economy_version: 3,
      }),
    ).toEqual({
      cloud_save_enabled: 'true',
      economy_source: 'remote',
      economy_version: '3',
    });
  });

  it('returns empty object when properties are omitted', () => {
    expect(normalizeTelemetryProperties(undefined)).toEqual({});
  });
});
