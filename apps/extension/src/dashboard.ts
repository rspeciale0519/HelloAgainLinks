// HelloAgain — Dashboard Content Script
// Runs on helloagainlinks.com so the dashboard always knows the extension ID
// and receives live bookmark change events.
localStorage.setItem('hal_extension_id', chrome.runtime.id);

// Watch the hal_post_ids cache for single-item changes.
// The background always updates this cache on save/delete, so this fires reliably
// regardless of whether the tab was open when the message was sent.
chrome.storage.local.onChanged.addListener((changes) => {
  // Forward bulk import progress to the dashboard page
  if (changes.import_progress) {
    const progress = changes.import_progress.newValue;
    if (progress) {
      const type = progress.done
        ? (progress.error ? 'BULK_IMPORT_ERROR' : 'BULK_IMPORT_DONE')
        : 'BULK_IMPORT_PROGRESS';
      window.postMessage({ source: 'hal-extension', type, ...progress }, '*');
    }
  }

  if (!changes.hal_post_ids) return;

  const oldIds: string[] = changes.hal_post_ids.oldValue || [];
  const newIds: string[] = changes.hal_post_ids.newValue || [];

  const oldSet = new Set(oldIds);
  const newSet = new Set(newIds);
  const added = newIds.filter((id) => !oldSet.has(id));
  const removed = oldIds.filter((id) => !newSet.has(id));

  // Only react to single-item changes to avoid false-firing on the initial bulk sync
  if (added.length === 1 && removed.length === 0) {
    window.postMessage({ source: 'hal-extension', type: 'HAL_BOOKMARK_ADDED' }, '*');
  } else if (removed.length === 1 && added.length === 0) {
    window.postMessage({ source: 'hal-extension', type: 'HAL_BOOKMARK_DELETED', postId: removed[0] }, '*');
  }
});

// Listen for dashboard-initiated bulk import commands
window.addEventListener('message', (event) => {
  if (event.data?.source !== 'hal-dashboard') return;

  if (event.data.type === 'START_BULK_IMPORT') {
    chrome.runtime.sendMessage({ type: 'START_BULK_IMPORT' });
  } else if (event.data.type === 'STOP_BULK_IMPORT') {
    chrome.runtime.sendMessage({ type: 'BULK_IMPORT_STOP' });
  }
});
