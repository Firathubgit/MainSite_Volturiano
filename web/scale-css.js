const fs = require('fs');

const path = 'src/components/Modals/CreditLimitModal.module.css';
let content = fs.readFileSync(path, 'utf8');

const startMarker = "/* ── Page-scoped plan cards ── */";
const endMarker = "/* SMART INDUSTRY-STANDARD BREAKPOINTS */";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

let section = content.substring(startIndex, endIndex);

const startHeaderMarker = "/* ── Page-scoped header ── */";
const startHeaderIndex = content.indexOf(startHeaderMarker);

let headerSection = content.substring(startHeaderIndex, startIndex);

function scaleSection(str) {
  return str.replace(/clamp\(([^)]+)\)/g, (match, p1) => {
    const parts = p1.split(',').map(s => s.trim());
    const scaledParts = parts.map(part => {
      return part.replace(/([\d.]+)(px|vh|vw)/g, (m, val, unit) => {
        const num = parseFloat(val);
        let scaled = num * 0.75;
        // round to 1 decimal
        scaled = Math.round(scaled * 10) / 10;
        return `${scaled}${unit}`;
      });
    });
    return `clamp(${scaledParts.join(', ')})`;
  });
}

headerSection = scaleSection(headerSection);
section = scaleSection(section);

content = content.substring(0, startHeaderIndex) + headerSection + section + content.substring(endIndex);

fs.writeFileSync(path, content);
console.log("Scaled successfully");
