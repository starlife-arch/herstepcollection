const panel = document.querySelector('#support-widget-panel');
document.querySelector('#support-widget-toggle').addEventListener('click', () => { panel.hidden = false; });
document.querySelector('#support-widget-close').addEventListener('click', () => { panel.hidden = true; });
