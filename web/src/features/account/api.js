import { supabase } from '../../lib/supabaseClient';

function ensureClient() {
  if (!supabase) {
    return {
      error: new Error('Supabase client is not initialised. Check environment variables.')
    };
  }
  return { client: supabase };
}

export async function signInWithPassword({ email, password }) {
  const { client, error } = ensureClient();
  if (error) return { error };
  return client.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail({ email, password, fullName }) {
  const { client, error } = ensureClient();
  if (error) return { error };
  return client.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName ?? ''
      }
    }
  });
}

export async function sendPasswordReset(email) {
  const { client, error } = ensureClient();
  if (error) return { error };
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/account/reset`
      : undefined;
  return client.auth.resetPasswordForEmail(email, { redirectTo });
}

export async function signOut() {
  const { client, error } = ensureClient();
  if (error) return { error };
  return client.auth.signOut();
}

export async function fetchProfile(userId) {
  const { client, error } = ensureClient();
  if (error) return { error };
  if (!userId) {
    return { data: null, error: new Error('Missing user id for profile lookup.') };
  }
  return client
    .from('profiles')
    .select('id, display_name, locale, avatar_url, preferences')
    .eq('id', userId)
    .single();
}

