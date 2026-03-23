/**
 * ═══════════════════════════════════════════════════════════════
 * Phase S25: useCredits — 4-Bucket Reactive Wallet Hook
 * ═══════════════════════════════════════════════════════════════
 * 
 * Provides a real-time view of the user's multi-bucket credit state.
 * Wraps the profile data from BuilderAuthContext and computes
 * derived balances for the UI.
 * 
 * Usage:
 *   const { totalAvailable, monthlyFreeRemaining, isPaid, refreshCredits } = useCredits();
 */

import { useMemo, useCallback } from 'react';
import { useBuilderAuth } from '../contexts/BuilderAuthContext';

export function useCredits() {
  const { profile, user, refreshProfile, isAuthenticated } = useBuilderAuth();

  const credits = useMemo(() => {
    if (!profile || !isAuthenticated) {
      return {
        plan: 'free',
        subscriptionStatus: 'active',
        subscriptionPeriodEnd: null,
        monthlyFreeRemaining: 3,
        signupBonusRemaining: 0,
        subscriptionRemaining: 0,
        purchasedRemaining: 0,
        totalAvailable: 3,
        dailyLimit: 3,
        monthlyFreeCap: 12,
        monthlyFreeEarned: 0,
        isLow: false,
        isOut: false,
        isUnlimited: false,
        isPaid: false,
        loaded: false,
      };
    }

    const plan = profile.plan || 'free';
    const isUnlimited = plan === 'admin' || plan === 'enterprise';

    // Daily reset check
    const dailyResetAt = profile.daily_credits_reset_at ? new Date(profile.daily_credits_reset_at) : null;
    const needsDailyReset = dailyResetAt && dailyResetAt < new Date();
    const effectiveDailyUsed = needsDailyReset ? 0 : (profile.daily_credits_used ?? 0);
    const dailyLimit = profile.daily_credits_limit ?? 3;

    // Monthly reset check
    const monthlyResetAt = profile.monthly_free_reset_at ? new Date(profile.monthly_free_reset_at) : null;
    const needsMonthlyReset = monthlyResetAt && monthlyResetAt < new Date();
    const effectiveMonthlyEarned = needsMonthlyReset ? 0 : (profile.monthly_free_earned ?? 0);
    const monthlyFreeCap = profile.monthly_free_cap ?? 12;

    // Signup bonus expiry check
    const bonusExpiresAt = profile.signup_bonus_expires_at ? new Date(profile.signup_bonus_expires_at) : null;
    const isBonusExpired = bonusExpiresAt && bonusExpiresAt < new Date();
    const signupBonusRemaining = Math.max(0, isBonusExpired ? 0 : (profile.signup_bonus_credits ?? 0));

    // Calculate remaining monthly free
    const monthlyFreeRemaining = Math.max(0, Math.min(
      Math.max(0, dailyLimit - effectiveDailyUsed),
      Math.max(0, monthlyFreeCap - effectiveMonthlyEarned)
    ));

    const subscriptionRemaining = Math.max(0, profile.subscription_credits ?? 0);
    const purchasedRemaining = Math.max(0, profile.purchased_credits ?? 0);

    const totalAvailable = isUnlimited
      ? Infinity
      : monthlyFreeRemaining + signupBonusRemaining + subscriptionRemaining + purchasedRemaining;

    const subscriptionPlan = profile.subscription_plan || 'free';
    const subscriptionStatus = profile.subscription_status || 'active';
    const isPaid = subscriptionPlan !== 'free';

    return {
      plan: subscriptionPlan, // use 'subscription_plan' instead of base 'plan'
      subscriptionStatus,
      subscriptionPeriodEnd: profile.subscription_period_end ? new Date(profile.subscription_period_end) : null,

      monthlyFreeRemaining,
      signupBonusRemaining,
      subscriptionRemaining,
      purchasedRemaining,
      totalAvailable,

      dailyLimit,
      monthlyFreeCap,
      monthlyFreeEarned: effectiveMonthlyEarned,

      isLow: !isUnlimited && totalAvailable > 0 && totalAvailable <= 5,
      isOut: !isUnlimited && totalAvailable <= 0,
      isUnlimited,
      isPaid,
      loaded: true,
    };
  }, [profile, isAuthenticated]);

  // Refresh credits from the database
  const refreshCredits = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  return {
    ...credits,
    refreshCredits,
    isAuthenticated,
    userId: user?.id || null,
  };
}

export default useCredits;

