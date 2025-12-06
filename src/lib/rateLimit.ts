import { supabase } from '@/integrations/supabase/client';

interface RateLimitCheckResult {
  blocked: boolean;
  failedAttempts: number;
  remainingSeconds: number;
  message: string | null;
}

interface RateLimitRecordResult {
  recorded: boolean;
  failedAttempts?: number;
  blocked?: boolean;
}

export async function checkRateLimit(email: string): Promise<RateLimitCheckResult> {
  try {
    const { data, error } = await supabase.functions.invoke('rate-limit', {
      body: { email, action: 'check' }
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return { blocked: false, failedAttempts: 0, remainingSeconds: 0, message: null };
    }

    return data as RateLimitCheckResult;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { blocked: false, failedAttempts: 0, remainingSeconds: 0, message: null };
  }
}

export async function recordFailedAttempt(email: string): Promise<RateLimitRecordResult> {
  try {
    const { data, error } = await supabase.functions.invoke('rate-limit', {
      body: { email, action: 'failed' }
    });

    if (error) {
      console.error('Record failed attempt error:', error);
      return { recorded: false };
    }

    return data as RateLimitRecordResult;
  } catch (error) {
    console.error('Record failed attempt error:', error);
    return { recorded: false };
  }
}

export async function clearLoginAttempts(email: string): Promise<void> {
  try {
    await supabase.functions.invoke('rate-limit', {
      body: { email, action: 'success' }
    });
  } catch (error) {
    console.error('Clear login attempts error:', error);
  }
}
