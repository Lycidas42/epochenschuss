// Erzeugt eigenständige Einzeldateien (alle Skripte eingebettet):
//   dist/epochenschuss.html   – komplette Seite, z. B. zum Teilen als Datei
//   dist/artifact.html  – ohne <head>/<body>-Gerüst für die Claude-Artifact-Vorschau
// Aufruf: node tools/build-single.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script src="([\w.-]+\.js)"><\/script>/g, (m, f) => '<script>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '\n</script>');
// Einzeldateien haben keine Icons/Manifest/Service Worker neben sich: diese Verweise entfernen
html = html.replace(/<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n?/g, '').replace(/<script>\nif \('serviceWorker'[\s\S]*?<\/script>\n?/, '');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'epochenschuss.html'), html);
// Artifact: Gerüst entfernen, Titel + Font + Styles behalten; :root-Padding übernimmt der Viewer
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta[^>]*>\n?/g, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const art = head.trim() + '\n<style>#app { padding-top: 0; }</style>\n' + body.trim() + '\n';
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), art);
console.log('dist/epochenschuss.html', (html.length / 1024).toFixed(1), 'KB · dist/artifact.html', (art.length / 1024).toFixed(1), 'KB');
