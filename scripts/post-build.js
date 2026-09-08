import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('Post-build: copying assets...');

// Copy css folder to dist/css for project pages (they reference /css/style.css)
const cssSrc = path.join(root, 'css');
const cssDest = path.join(dist, 'css');
if (fs.existsSync(cssSrc)) {
  copyRecursive(cssSrc, cssDest);
  console.log(`  Copied ${cssSrc} -> ${cssDest}`);
}

// Ensure projects are in dist/projects (via public, but also ensure)
const publicProjects = path.join(root, 'public', 'projects');
const projectsSrc = path.join(root, 'projects');
const distProjects = path.join(dist, 'projects');

if (fs.existsSync(publicProjects)) {
  // Already copied by Vite from public, but ensure
  console.log(`  public/projects already handled by Vite`);
} else if (fs.existsSync(projectsSrc)) {
  copyRecursive(projectsSrc, distProjects);
  console.log(`  Copied ${projectsSrc} -> ${distProjects}`);
} else {
  console.log('  No projects folder found to copy');
}

// Also ensure /projects index
if (fs.existsSync(projectsSrc) && !fs.existsSync(path.join(distProjects, 'index.html'))) {
  const idxSrc = path.join(projectsSrc, 'index.html');
  if (fs.existsSync(idxSrc)) {
    fs.mkdirSync(distProjects, { recursive: true });
    fs.copyFileSync(idxSrc, path.join(distProjects, 'index.html'));
    console.log('  Copied projects/index.html');
  }
}

console.log('Post-build done.');
