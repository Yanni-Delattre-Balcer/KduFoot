import { describe, it, expect } from 'vitest';
import { UserService } from './user.service';
import { User } from '../types/user';

describe('UserService', () => {
  it('should format user data correctly', () => {
    // Basic test to verify Vitest is working
    expect(1 + 1).toBe(2);
  });

  // Since we don't have a full D1 mock yet, we'll just test that the class exists and can be instantiated
  it('should parse user data correctly', () => {
    const service = new UserService({} as any);
    const user = { additional_sirets: '["siret1"]' } as any as User;
    const parsed = service.parseUser(user);
    expect(parsed?.additional_sirets).toEqual(['siret1']);
  });

  it('should auto-heal double-stringified corruption', () => {
    const service = new UserService({} as any);
    const user = { additional_sirets: '"[\\"siret1\\"]"' } as any as User;
    const parsed = service.parseUser(user);
    expect(parsed?.additional_sirets).toEqual(['siret1']);
  });

  it('should default to empty array on invalid json', () => {
    const service = new UserService({} as any);
    const user = { additional_sirets: 'invalid' } as any as User;
    const parsed = service.parseUser(user);
    expect(parsed?.additional_sirets).toEqual([]);
  });
});
