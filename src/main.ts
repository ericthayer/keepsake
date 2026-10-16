// Entry point. Defines the components, then resolves where the locker lives.
import { fetchPublishedEnvelope } from './core/persistence.ts';
import { store } from './ui/context.ts';
import './ui/appearance.ts';
import './components/toast.ts';
import './components/app.ts';

// <ll-app start="sample"> opens straight into the sample locker (demos and previews).
const autostart = document.querySelector('ll-app')?.getAttribute('start');
void store.init(fetchPublishedEnvelope()).then(() => {
  if (autostart === 'sample' && store.state.status === 'setup') store.explore();
});
window.addEventListener('pagehide', () => void store.flush());
