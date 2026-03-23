import React from 'react';

/**
 * CodeIntegration - A premium section showing a code editor interface.
 */
function CodeIntegration(props) {
    const headline = props.headline || 'Simplicity by Design.';
    const description = props.description || "We've abstracted the complexity of neural networks into a single, type-safe primitive. Drop it into your codebase and let the engine handle the rest.";
    const codeSnippet = props.codeSnippet || "import { Agent } from '@volturiano/core';\n\n// Initialize the neural link\nconst link = await Agent.connect({\n  mode: 'autonomous',\n  sync: true\n});\n\nlink.on('thought', (t) => console.log(t));";

    const codeLines = codeSnippet.split('\n');

    return (
        <section className="relative w-full py-32 bg-black flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent opacity-50"></div>

            <div className="relative z-10 max-w-6xl w-full px-6 flex flex-col md:flex-row items-center gap-16 md:gap-24">
                <div className="flex-1 text-left space-y-8">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-white leading-[1.1]">
                        {headline.split(' ').slice(0, -1).join(' ')} <br />
                        <span className="text-zinc-500">{headline.split(' ').slice(-1)}</span>
                    </h2>
                    <p className="text-lg text-zinc-400 font-light leading-relaxed max-w-md">
                        {description}
                    </p>
                    <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between group cursor-pointer">
                            <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">Documentation</span>
                            <svg className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </div>
                        <div className="flex items-center justify-between group cursor-pointer">
                            <span className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">API Reference</span>
                            <svg className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full relative group perspective-1000">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl blur-2xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>
                    <div className="relative rounded-xl bg-[#050505] border border-white/10 shadow-2xl overflow-hidden transform transition-transform duration-500 ease-out hover:rotate-y-2 hover:scale-[1.01]">
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700"></div>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-[10px] text-zinc-600 font-mono">BASH</span>
                            </div>
                        </div>
                        <div className="p-6 md:p-8 overflow-x-auto bg-black/40 backdrop-blur-sm">
                            <pre className="font-mono text-[13px] md:text-sm leading-relaxed text-zinc-300">
                                <code>
                                    {codeLines.map((line, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <span className="text-zinc-700 select-none w-4">{idx + 1}</span>
                                            <span>{line}</span>
                                        </div>
                                    ))}
                                    <div className="flex gap-4">
                                        <span className="text-zinc-700 select-none w-4">{codeLines.length + 1}</span>
                                        <span className="animate-pulse w-2 h-5 bg-white/50"></span>
                                    </div>
                                </code>
                            </pre>
                        </div>
                        <div className="px-5 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                <span className="text-[10px] text-zinc-500 font-mono">TS 5.3</span>
                            </div>
                            <span className="text-[10px] text-zinc-600 font-mono">Ln {codeLines.length}, Col 42</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default CodeIntegration;
