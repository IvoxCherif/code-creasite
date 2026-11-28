// Curseur avant / après (sorti du HTML pour permettre une CSP sans script inline)
const cmp = document.getElementById('compare');
cmp.querySelector('input').addEventListener('input', e => cmp.style.setProperty('--pos', e.target.value + '%'));
