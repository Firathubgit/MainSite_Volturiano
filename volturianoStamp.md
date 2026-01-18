# Volturiano Stamp - Copy/Paste Version

Use this code to add the Volturiano "Powered By" stamp to any client website.

## 1. HTML
Copy this into the footer HTML.
**Important:** Upload the `TornadoLogo.png` to the client's server and update the `src` attribute.

```html
<!-- Volturiano Powered By Stamp -->
<a href="https://volturiano.com" target="_blank" rel="noopener noreferrer" class="volturiano-stamp">
  <div class="stamp-content">
    <span class="stamp-text">POWERED BY</span>
    <div class="stamp-separator"></div>
  </div>
  <!-- UPDATE THIS SRC WITH THE URL TO YOUR LOGO ON THE CLIENT SITE -->
  <img src="/path/to/TornadoLogo.png" alt="Volturiano" class="stamp-logo" />
</a>
```

## 2. CSS
Copy this into the client's main stylesheet (e.g., `style.css` or `footer.css`).

```css
/* Volturiano Stamp Container */
.volturiano-stamp {
  /* Layout & Sizing */
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  padding: 0px 5px;
  width: 55px; /* Initial collapsed width */
  height: 55px;
  border-radius: 14px;
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  
  /* Positioning - Adjust these if needed for your client's specific layout */
  transform: scale(0.8); /* Scales it down slightly */
  transform-origin: right center;

  /* Premium Effects */
  border: 2px solid transparent;
  background-image: 
    linear-gradient(to bottom, #0a0a0a, #141414),
    linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(80,80,80,0.5) 50%, rgba(255,255,255,0.8) 100%);
  background-origin: padding-box, border-box;
  background-clip: padding-box, border-box;

  /* Glow Effect */
  box-shadow: 0px 4px 30px -5px rgba(255, 255, 255, 0.15);

  /* Smooth Transitions */
  transition: width 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), 
              padding 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), 
              box-shadow 0.3s ease, 
              transform 0.3s ease;
}

/* Hover State - Expansion */
.volturiano-stamp:hover {
  width: 230px; 
  padding: 0px 20px; 
  box-shadow: 0px 8px 40px -4px rgba(255, 255, 255, 0.35);
  transform: scale(0.8) translateY(-2px);
}

/* Inner Content (Text + Separator) */
.stamp-content {
  display: flex;
  align-items: center;
  gap: 15px; 
  opacity: 0;
  max-width: 0; 
  padding-right: 0;
  overflow: hidden;
  
  /* The "Reversed" Animation Magic */
  transition: max-width 0.5s cubic-bezier(0.25, 0.8, 0.25, 1),
              opacity 0.4s ease-out,
              padding-right 0.5s cubic-bezier(0.25, 0.8, 0.25, 1),
              transform 0.4s ease-out;
  transform: translateX(10px);
}

.volturiano-stamp:hover .stamp-content {
  opacity: 1;
  max-width: 200px; 
  padding-right: 15px; 
  transform: translateX(0);
}

/* "POWERED BY" Text */
.stamp-text {
  position: relative;
  z-index: 2;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  
  /* Gradient Text */
  background: linear-gradient(to bottom, #ffffff 0%, #b0b0b0 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

/* Vertical Line Separator */
.stamp-separator {
  width: 1.5px;
  height: 24px;
  background: linear-gradient(to bottom, #ffffff, rgba(255,255,255,0.5));
  border-radius: 10px;
  opacity: 0.9;
  margin-top: 2px;
  flex-shrink: 0; 
  display: block; 
}

/* Logo Image */
.stamp-logo {
  height: 45px;
  width: auto;
  display: block;
  filter: brightness(0) invert(1);
  opacity: 0.95;
  margin-top: -1px;
  flex-shrink: 0;
  margin-left: auto; 
  margin-right: auto;
}
```
