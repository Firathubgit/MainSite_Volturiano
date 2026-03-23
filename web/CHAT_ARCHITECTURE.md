# Chat Architecture & Message Flow Analysis

This document traces where the "chat messages" come from in the Volturiano Builder.

## 1. The Welcome Message (Client-Side)
- **Source:** `src/pages/Agency/pages/Builder/Generation/Generation.jsx`
- **Mechanism:** Hardcoded initial state in the React component.
- **Code:**
  ```javascript
  const [chatMessages, setChatMessages] = useState([
    { 
      content: 'Welcome! Describe what you want to build and I\'ll generate it for you.', 
      type: 'system', 
      timestamp: new Date() 
    }
  ]);
  ```
- **Trigger:** Page load.

## 2. "Creating sandbox environment..." (Client-Side)
- **Source:** `Generation.jsx` -> `startGeneration()`
- **Mechanism:** Immediate state update before calling the API.
- **Code:**
  ```javascript
  addChatMessage('Creating sandbox environment...', 'system');
  ```
- **Trigger:** User submits a prompt, and no sandbox exists yet.

## 3. "Premium Mode OFF..." (Client-Side)
- **Source:** `Generation.jsx` -> `startGeneration()`
- **Mechanism:** Conditional logic check.
- **Code:**
  ```javascript
  addChatMessage('Premium Mode OFF: Skipping premium selection. Generating custom components.', 'system');
  ```
- **Trigger:** `usePremiumComponents` is false.

## 4. "Planning X components..." (Client-Side, using Server Data)
- **Source:** `Generation.jsx` -> `startGeneration()`
- **Mechanism:** Uses the response from `/api/plan-website-components`.
- **Code:**
  ```javascript
  addChatMessage(
    `Planning ${components.length} components: ${premiumComponents.length} premium, ${generatedComponents.length} custom...`,
    'system'
  );
  ```
- **Trigger:** After the planning API call returns successfully.

## 5. "Installing dependencies..." (Client-Side)
- **Source:** `Generation.jsx` -> `startGeneration()`
- **Mechanism:** Uses the `requiredPackages` array from the planning API response.
- **Code:**
  ```javascript
  addChatMessage(`Installing dependencies: ${planData.requiredPackages.join(', ')}`, 'system');
  ```
- **Trigger:** If the plan includes new packages (e.g. `framer-motion`).

## 6. Real-Time Status Updates (Server-Side Streams)
- **Source:** `server/routes/apply-ai-code-stream.js`
- **Mechanism:** Server-Sent Events (SSE). The server streams JSON objects with `type` and `message` fields, which the frontend's `applyGeneratedCode` function listens to.
- **Key Events:**
  - `verify-start` -> "Verifying build compatibility..."
  - `verify-passed` -> "Build verification passed."
  - `verify-failed` -> "Build verification failed! Check logs below."
  - `rollback-done` -> "Rollback complete. Sandbox restored..."
  - `repair-done` -> "Auto-Repair successful! Fixed files..."

## 7. "Code generated and applied!" (Client-Side)
- **Source:** `Generation.jsx` -> `applyGeneratedCode` (completion handler)
- **Code:** 
  (Implicitly handled by UI state `status` or sometimes explicit messages in previous versions, currently the loop finishes and updates the preview).

## Summary Table

| Message / Event | Source | Trigger | Type |
| :--- | :--- | :--- | :--- |
| **Welcome!** | `Generation.jsx` | Page Load | Hardcoded |
| **Creating sandbox...** | `Generation.jsx` | `startGeneration()` | Logic |
| **Premium Mode OFF** | `Generation.jsx` | `startGeneration()` | Logic |
| **Planning 9 components** | `Generation.jsx` | API Response (`/api/plan...`) | Data-Driven |
| **Installing dependencies** | `Generation.jsx` | API Response | Data-Driven |
| **Verifying build...** | `apply-ai-code-stream.js` | SSE Stream | Server Event |
| **Build failed!** | `apply-ai-code-stream.js` | SSE Stream | Server Event |
| **Rollback complete** | `apply-ai-code-stream.js` | SSE Stream | Server Event |

Most "chat" messages are actually **system log messages** masquerading as chat queries to keep the user informed of the background process. They are generated deterministically by the code, not by an LLM (except for the *content* of the plan, which comes from the LLM).
