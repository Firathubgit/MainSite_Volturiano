/**
 * Compatibility Rules Engine
 * Evaluates compatibility rules and resolves conflicts
 */

/**
 * Resolve conflicts between current selection and new selection
 * @param {Array} rules - Compatibility rules from database
 * @param {object} currentSelection - Current selected options {optionId: valueId}
 * @param {object} newSelection - New selection to evaluate
 * @returns {object} {valid, autoAdd, autoRemove, messages}
 */
export function resolveConflicts(rules, currentSelection, newSelection) {
  const result = {
    valid: true,
    autoAdd: [],
    autoRemove: [],
    messages: []
  };

  if (!rules || rules.length === 0) {
    return result;
  }

  // Combine current and new selections
  const combinedSelection = { ...currentSelection, ...newSelection };

  // Evaluate each rule
  rules.forEach(rule => {
    const primarySelected = combinedSelection[rule.primary_option_value_id];
    const secondarySelected = combinedSelection[rule.secondary_option_value_id];

    if (rule.rule_type === 'requires') {
      // If primary is selected but secondary is not
      if (primarySelected && !secondarySelected) {
        result.valid = false;
        result.autoAdd.push({
          optionId: rule.secondary_option_value_id,
          reason: rule.message || 'Required option'
        });
        result.messages.push(rule.message || 'This option requires another option');
      }
    } else if (rule.rule_type === 'incompatible') {
      // If both are selected
      if (primarySelected && secondarySelected) {
        result.valid = false;
        result.autoRemove.push({
          optionId: rule.secondary_option_value_id,
          reason: rule.message || 'Incompatible option'
        });
        result.messages.push(rule.message || 'These options are incompatible');
      }
    }
  });

  return result;
}

/**
 * Evaluate rules against current selection
 * @param {Array} rules - Compatibility rules
 * @param {object} selection - Selected options {optionId: valueId}
 * @returns {Array} Array of violations
 */
export function evaluateRules(rules, selection) {
  const violations = [];

  if (!rules || rules.length === 0) {
    return violations;
  }

  rules.forEach(rule => {
    const primarySelected = selection[rule.primary_option_value_id];
    const secondarySelected = selection[rule.secondary_option_value_id];

    if (rule.rule_type === 'requires') {
      if (primarySelected && !secondarySelected) {
        violations.push({
          type: 'requires_missing',
          ruleId: rule.rule_id,
          primaryOption: rule.primary_option_value_id,
          secondaryOption: rule.secondary_option_value_id,
          message: rule.message || 'Required option is missing',
          autoResolve: rule.auto_resolve || false
        });
      }
    } else if (rule.rule_type === 'incompatible') {
      if (primarySelected && secondarySelected) {
        violations.push({
          type: 'incompatible_selected',
          ruleId: rule.rule_id,
          primaryOption: rule.primary_option_value_id,
          secondaryOption: rule.secondary_option_value_id,
          message: rule.message || 'Incompatible options selected',
          autoResolve: false
        });
      }
    }
  });

  return violations;
}

