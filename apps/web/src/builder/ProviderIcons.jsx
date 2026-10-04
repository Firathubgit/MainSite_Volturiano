import React from 'react';

/**
 * Neutral provider marks for the model picker.
 *
 * These are plain lettered badges on purpose. Provider logos are trademarks
 * of their owners and are not shipped with this project.
 */
function ProviderBadge({ letter, color, size = 18, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" role="img" {...props}>
      <rect x="1" y="1" width="22" height="22" rx="6" fill={color} />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="13"
        fontWeight="700"
        fill="#ffffff"
      >
        {letter}
      </text>
    </svg>
  );
}

export const OpenAIIcon = (props) => <ProviderBadge letter="O" color="#3f3f46" aria-label="OpenAI" {...props} />;
export const AnthropicIcon = (props) => <ProviderBadge letter="A" color="#b45309" aria-label="Anthropic" {...props} />;
export const GeminiIcon = (props) => <ProviderBadge letter="G" color="#1d4ed8" aria-label="Google Gemini" {...props} />;
