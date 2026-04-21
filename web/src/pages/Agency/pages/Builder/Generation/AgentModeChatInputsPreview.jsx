import React, { useState } from 'react';
import AgentModeChatInputs from './AgentModeChatInputs';
import { AgentToolCard, AgentSummaryBadge, AgentThinkingPill } from './AgentChatCards';
import volturianoLogo from '../../../../../assets/Logo/TornadoLogo.png';
import styles from './AgentModeChatInputs.module.css';

/**
 * AgentModeChatInputsPreview — A dedicated preview component for configuring 
 * and visualizing the Agent Mode chat inputs and agentic status cards.
 */
const AgentModeChatInputsPreview = () => {
  const [lastAction, setLastAction] = useState(null);
  const [active, setActive] = useState(true);

  return (
    <div style={{ padding: '60px 40px', background: '#050505', minHeight: '100vh', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
           <img src="https://antigravity-assets.s3.amazonaws.com/tornado_logo.png" alt="Logo" style={{ width: '40px', marginBottom: '20px' }} />
           <h1 style={{ fontSize: '32px', marginBottom: '12px', fontWeight: '900', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Agent Mode UI Kit
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '400px', margin: '0 auto' }}>
            Iterative agentic workspace for premium builder interactions and file-system control.
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '40px' }}>
          {/* Section 1: Inputs */}
          <section>
            <h2 style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Chat Input Controls</h2>
            <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '32px', background: 'rgba(255,255,255,0.01)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
              <AgentModeChatInputs 
                active={active} 
                onAction={(id) => setLastAction(id)} 
              />
              
              <div style={{ 
                marginTop: '16px', 
                width: '100%', 
                height: '120px', 
                background: '#030304', 
                border: '1px solid rgba(255,255,255,0.05)', 
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.15)',
                fontWeight: '500'
              }}>
                Main Chat Input Placeholder
              </div>
            </div>
          </section>

          {/* Section 2: Agent Activity */}
          <section>
            <h2 style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Agent Activity Timeline</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <AgentThinkingPill stage="Thinking about project structure" volturianoLogo={volturianoLogo} />
              <AgentThinkingPill stage="Searching for relevant components" type="search" />
              
              <AgentToolCard 
                toolName="search_files" 
                args={{ query: 'navbar components' }} 
                status="completed" 
                success={true} 
                result={{ count: 12 }}
              />

              <AgentThinkingPill stage="Reading" type="read" fileName="Navbar.jsx" />
              
              <AgentToolCard 
                toolName="read_file" 
                args={{ path: 'src/components/Navbar.jsx' }} 
                status="completed" 
                success={true} 
              />
              
              <AgentThinkingPill stage="Editing" type="edit" fileName="App.jsx" />

              <AgentThinkingPill stage="Reading" type="read" fileName="App.jsx" />

              <AgentToolCard 
                toolName="edit_file" 
                args={{ path: 'src/App.jsx' }} 
                status="completed" 
                success={true}
                result={{ 
                  diff: { 
                    oldPreview: '- <Navbar />', 
                    newPreview: '+ <PremiumNavbar variant="glass" />' 
                  } 
                }}
              />

              <AgentThinkingPill stage="Thinking about layout fixes" volturianoLogo={volturianoLogo} />

              <AgentToolCard 
                toolName="create_file" 
                args={{ path: 'src/components/NewButton.jsx' }} 
                status="completed" 
                success={true} 
              />

              <AgentToolCard 
                toolName="get_build_errors" 
                args={{}} 
                status="completed" 
                success={true} 
                result={{ buildPassed: true }}
              />

              <AgentToolCard 
                toolName="get_build_errors" 
                args={{}} 
                status="completed" 
                success={false} 
                result={{ buildPassed: false, error: 'Lint error in App.jsx: L24' }}
              />

              <div style={{ marginTop: '20px' }}>
                <AgentSummaryBadge 
                  summary="Agent successfully refactored 3 components and updated the layout." 
                  onUndo={() => console.log('Undo clicked')} 
                />
              </div>
            </div>
          </section>
        </div>

        {lastAction && (
          <div style={{ 
            background: 'rgba(129, 140, 248, 0.1)', 
            border: '1px solid rgba(129, 140, 248, 0.2)', 
            padding: '12px', 
            borderRadius: '8px',
            fontSize: '12px',
            color: '#818cf8'
          }}>
            Last Action Triggered: <strong>{lastAction}</strong>
          </div>
        )}

        <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setActive(!active)}
            style={{ 
              background: '#818cf8', 
              border: 'none', 
              borderRadius: '6px', 
              padding: '8px 16px', 
              color: 'white', 
              fontSize: '12px', 
              fontWeight: '600',
              cursor: 'pointer' 
            }}
          >
            Toggle Visibility
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentModeChatInputsPreview;
