import React from 'react';
import ReactDOM from 'react-dom/client';
import HeroColorBends from './test-colorbends2.jsx';

window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.error('React Root Error:', msg, lineNo);
};

console.log("Mounting HeroColorBends...");

try {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <HeroColorBends />
    );
} catch (err) {
    console.error("Mount Error:", err);
}
