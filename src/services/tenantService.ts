import { apiConfig, apiRequest } from '@/lib/api';
import { mockDelay, requireRecord } from '@/lib/mock-utils';
import { mockTenants } from '@/mocks/tenants';
import type { Tenant } from '@/types/index';
export const tenantService = {
  async list(): Promise<Tenant[]> {
    if (!apiConfig.useMock) return apiRequest('/tenants');
    await mockDelay();
    return mockTenants;
  },
  async getBySlug(slug: string): Promise<Tenant> {
    if (!apiConfig.useMock) return apiRequest(`/tenants/${slug}`);
    await mockDelay();
    return requireRecord(
      mockTenants.find((t) => t.slug === slug),
      'Tenant',
    );
  },
  async resolve(hostname: string, override?: string): Promise<Tenant> {
    if (override) return this.getBySlug(override);
    const subdomain = hostname.split('.')[0];
    return this.getBySlug(
      mockTenants.some((t) => t.slug === subdomain) ? subdomain : 'aura',
    );
  },
};
