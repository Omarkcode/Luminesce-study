/* ============================================================
   feedback.js
   ============================================================ */

const sb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

let currentUser = null;

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  currentUser = session.user;

  startBackground();
  document.getElementById('fbPage').style.opacity = '1';
  document.getElementById('fbPage').style.transition = 'opacity 0.4s ease';

  await loadFeedback();

  document.getElementById('btnBack').addEventListener('click', () => {
    window.location.href = 'menu.html';
  });

  document.getElementById('fbSend').addEventListener('click', sendFeedback);
  document.getElementById('fbInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendFeedback();
  });
})();

async function loadFeedback() {
  const { data, error } = await sb
    .from('feedback')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  const list = document.getElementById('fbMessages');

  if (error || !data?.length) {
    list.innerHTML = '<div class="fb-empty">No feedback sent yet. We\'d love to hear from you!</div>';
    return;
  }

  list.innerHTML = '';
  data.forEach(row => appendFeedback(row));
  list.scrollTop = list.scrollHeight;
}

function appendFeedback(row) {
  const list = document.getElementById('fbMessages');
  const el   = document.createElement('div');
  el.className = 'fb-message';

  const date = new Date(row.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  el.innerHTML = `
    <div class="fb-message-text">${escFb(row.message)}</div>
    <div class="fb-message-time">${date}</div>
  `;
  list.appendChild(el);
}

async function sendFeedback() {
  const input   = document.getElementById('fbInput');
  const message = input.value.trim();
  if (!message) return;

  const btn = document.getElementById('fbSend');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const { data, error } = await sb.from('feedback').insert({
    user_id: currentUser.id,
    message
  }).select().single();

  if (error) {
    btn.disabled = false;
    btn.textContent = 'Send';
    showToast('Could not send feedback. Please try again.');
    return;
  }

  input.value = '';
  btn.disabled = false;
  btn.textContent = 'Send';

  const list = document.getElementById('fbMessages');
  const empty = list.querySelector('.fb-empty');
  if (empty) empty.remove();

  appendFeedback(data);
  list.scrollTop = list.scrollHeight;
  showToast('Feedback sent — thank you!');
}

function showToast(msg) {
  let toast = document.getElementById('fbToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fbToast';
    toast.className = 'fb-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('fb-toast--visible');
  setTimeout(() => toast.classList.remove('fb-toast--visible'), 3000);
}

function escFb(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
