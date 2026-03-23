import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Supabase] Missing environment variables. Database features will be limited.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

/**
 * Utility to get user credit balance
 */
export async function getUserCredits(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('total_credits_remaining')
        .eq('id', userId)
        .single();

    if (error) {
        console.error(`[Supabase] Error fetching credits for ${userId}:`, error.message);
        return 0;
    }
    return data?.total_credits_remaining || 0;
}

/**
 * Utility to update credits and log transaction
 */
export async function updateCredits(userId, amount, type, metadata = {}) {
    // 1. Update Profile
    const { data: profile, error: profileError } = await supabase.rpc('increment_credits', {
        user_id: userId,
        increment_by: amount
    });

    if (profileError) {
        // Fallback if RPC doesn't exist yet
        console.warn('[Supabase] increment_credits RPC failed, falling back to manual update.');
        const { data: current, error: getError } = await supabase
            .from('profiles')
            .select('total_credits_remaining')
            .eq('id', userId)
            .single();

        if (getError) throw getError;

        const newTotal = (current?.total_credits_remaining || 0) + amount;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ total_credits_remaining: newTotal })
            .eq('id', userId);

        if (updateError) throw updateError;
    }

    // 2. Log Transaction
    const { error: transError } = await supabase
        .from('credit_transactions')
        .insert({
            user_id: userId,
            amount: amount,
            type: type,
            metadata: metadata
        });

    if (transError) {
        console.error('[Supabase] Transaction log failed:', transError.message);
        // Don't throw here as the balance was already updated
    }

    return true;
}
