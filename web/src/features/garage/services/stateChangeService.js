/**
 * Centralized state change service
 * Handles all state transitions with validation, milestone creation, and activity logging
 * Can be called from manual UI, Stripe webhooks, admin tools, etc.
 */

import { updateGarageState, createMilestone, createActivityLog } from '../../../features/account/api';
import { validateTransition } from '../utils/stateTransitions';

/**
 * Change garage item state with full validation and logging
 * @param {string} itemId - Garage item ID
 * @param {string} newState - Target state
 * @param {Object} options - Options for state change
 * @param {string} options.source - Source of change ('manual' | 'stripe' | 'admin' | 'system')
 * @param {string} options.reason - Optional reason for change
 * @param {Object} options.metadata - Optional metadata (Stripe data, etc.)
 * @param {boolean} options.createMilestone - Whether to create milestone (default: true)
 * @param {boolean} options.logActivity - Whether to log activity (default: true)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function changeItemState(itemId, newState, options = {}) {
  console.log('[StateChangeService] changeItemState called');
  console.log('[StateChangeService] Parameters:', { itemId, newState, options });
  const startTime = Date.now();

  const {
    source = 'manual',
    reason = null,
    metadata = {},
    createMilestone: shouldCreateMilestone = true,
    logActivity: shouldLogActivity = true
  } = options;

  try {
    // Step 1: Fetch current item state
    console.log('[StateChangeService] Fetching current item state...');
    const { supabase } = await import('../../../lib/supabaseClient');
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const { data: currentItem, error: fetchError } = await supabase
      .from('garage_items')
      .select('state, owner_id')
      .eq('id', itemId)
      .single();

    if (fetchError) {
      console.error('[StateChangeService] Failed to fetch current item:', fetchError);
      return { data: null, error: fetchError };
    }

    if (!currentItem) {
      return { data: null, error: new Error('Item not found') };
    }

    // Verify ownership
    if (currentItem.owner_id !== user.id) {
      return { data: null, error: new Error('Access denied') };
    }

    const fromState = currentItem.state;
    console.log('[StateChangeService] Current state:', fromState);

    // Step 2: Validate transition
    if (fromState !== newState) {
      try {
        validateTransition(fromState, newState);
        console.log('[StateChangeService] Transition validated:', fromState, '→', newState);
      } catch (validationError) {
        console.error('[StateChangeService] Invalid transition:', validationError);
        return { data: null, error: validationError };
      }
    } else {
      console.log('[StateChangeService] Same state, no-op');
      // Same state is valid but no-op - still return success
      return { data: currentItem, error: null };
    }

    // Step 3: Update state
    console.log('[StateChangeService] Updating state...');
    const { data: updatedItem, error: updateError } = await updateGarageState(itemId, newState);
    if (updateError) {
      console.error('[StateChangeService] Failed to update state:', updateError);
      return { data: null, error: updateError };
    }

    console.log('[StateChangeService] State updated successfully');

    // Step 4: Create milestone (if enabled)
    if (shouldCreateMilestone) {
      try {
        console.log('[StateChangeService] Creating milestone...');
        // Map to standardized milestone types
        const milestoneType = source === 'stripe' ? 'purchased' : 'updated';
        const milestoneData = {
          milestone_type: milestoneType,
          from_state: fromState,
          to_state: newState,
          note: reason || null,
          metadata: {
            source,
            reason,
            ...metadata
          }
        };

        const { error: milestoneError } = await createMilestone(itemId, milestoneData);
        if (milestoneError) {
          console.warn('[StateChangeService] Failed to create milestone (non-critical):', milestoneError);
          // Don't fail the whole operation if milestone creation fails
        } else {
          console.log('[StateChangeService] Milestone created successfully');
        }
      } catch (milestoneErr) {
        console.warn('[StateChangeService] Exception creating milestone (non-critical):', milestoneErr);
        // Don't fail the whole operation
      }
    }

    // Step 5: Log activity (if enabled)
    if (shouldLogActivity) {
      try {
        console.log('[StateChangeService] Logging activity...');
        const activityMetadata = {
          from_state: fromState,
          to_state: newState,
          source,
          reason,
          ...metadata
        };

        const { error: activityError } = await createActivityLog(itemId, 'state_changed', activityMetadata);
        if (activityError) {
          console.warn('[StateChangeService] Failed to log activity (non-critical):', activityError);
          // Don't fail the whole operation if activity logging fails
        } else {
          console.log('[StateChangeService] Activity logged successfully');
        }
      } catch (activityErr) {
        console.warn('[StateChangeService] Exception logging activity (non-critical):', activityErr);
        // Don't fail the whole operation
      }
    }

    const duration = Date.now() - startTime;
    console.log('[StateChangeService] changeItemState completed in', duration, 'ms');
    return { data: updatedItem, error: null };
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error('[StateChangeService] Exception changing state:', err);
    console.error('[StateChangeService] Exception stack:', err.stack);
    console.log('[StateChangeService] changeItemState failed after', duration, 'ms');
    return { data: null, error: err };
  }
}

