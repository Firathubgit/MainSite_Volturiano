const html = `
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/svg+xml" href="/vite.svg" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vite + React</title>
</head>
`;

let newHtml = html.replace(/<link\s+rel=["'](shortcut icon|icon|apple-touch-icon)["'].*?>/ig, '');
console.log(newHtml);
