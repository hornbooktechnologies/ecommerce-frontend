(() => {
  const panel = document.querySelector('[data-newsletter-action]');
  const form = document.getElementById('preferences-form');
  const button = document.getElementById('submit');
  const feedback = document.getElementById('feedback');
  const heading = document.getElementById('heading');
  const action = panel?.getAttribute('data-newsletter-action');
  if (!panel || !form || !button || !feedback || !heading || !['confirm', 'unsubscribe'].includes(action)) return;
  const initialButton = button.textContent; let controller = null; let revision = 0;
  const token = () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
  function renderLink() {
    revision += 1; controller?.abort(); controller = null; button.disabled = false; button.textContent = initialButton;
    form.removeAttribute('aria-busy');
    const valid = /^[a-f0-9]{64}$/.test(token()); form.hidden = !valid;
    heading.textContent = action === 'confirm' ? 'Confirm your subscription.' : 'Stop newsletter emails?';
    feedback.className = valid ? '' : 'error'; feedback.setAttribute('role', valid ? 'status' : 'alert');
    feedback.textContent = valid ? 'Select the button above to save your choice.'
      : 'Open the complete link from your latest confirmation email. To subscribe, request a new link from the homepage newsletter form.';
  }
  window.addEventListener('hashchange', renderLink);
  window.addEventListener('pagehide', () => { revision += 1; controller?.abort(); controller = null; });
  window.addEventListener('pageshow', (event) => { if (event.persisted) renderLink(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (controller || !/^[a-f0-9]{64}$/.test(token())) return;
    const current = new AbortController(); controller = current; const snapshot = revision;
    const timeout = setTimeout(() => current.abort(), 50000);
    button.disabled = true; button.textContent = 'Saving…'; form.setAttribute('aria-busy', 'true');
    feedback.className = ''; feedback.setAttribute('role', 'status'); feedback.textContent = 'Saving your preference…';
    try {
      const response = await fetch(`/api/newsletter/${action}`, { method: 'POST', cache: 'no-store', credentials: 'omit',
        signal: current.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'Your request could not be completed. Please try again.');
      if (typeof payload.data?.message !== 'string') throw new Error('Unexpected response. Please try again.');
      if (snapshot !== revision) return;
      form.hidden = true; heading.textContent = action === 'confirm' ? 'You’re on the list.' : 'You’re unsubscribed.';
      feedback.className = 'success'; feedback.textContent = payload.data.message; feedback.focus();
    } catch (error) {
      if (snapshot !== revision) return;
      feedback.className = 'error'; feedback.setAttribute('role', 'alert');
      feedback.textContent = current.signal.aborted ? 'The request timed out. Please try the same link again.' : error.message || 'Please try again later.';
      feedback.focus();
    } finally {
      clearTimeout(timeout);
      if (controller === current) controller = null;
      if (snapshot === revision) { button.disabled = false; button.textContent = initialButton; form.removeAttribute('aria-busy'); }
    }
  });
  renderLink();
})();
