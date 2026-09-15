(function(){
  'use strict';

  const BUILD = '5.6.16';
  const LAST_BACKUP_KEY = 'mdp_last_backup_at';
  const BACKUP_REMINDER_KEY = 'mdp_backup_reminder_dismissed_at';
  const REMINDER_AFTER_DAYS = 7;
  const REMIND_AGAIN_DAYS = 30;

  function isoNow(){ return new Date().toISOString(); }
  function daysSince(iso){
    if (!iso) return Infinity;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? (Date.now() - t) / 86400000 : Infinity;
  }
  function hasUserData(){
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i) || '';
      if (k.startsWith('mdp_') && k !== LAST_BACKUP_KEY && k !== BACKUP_REMINDER_KEY) return true;
    }
    return false;
  }
  function backupObject(){
    const data = {};
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i) || '';
      if (k.startsWith('mdp_')) data[k] = localStorage.getItem(k);
    }
    data._thalify_backup = {
      format: 1,
      app_version: BUILD,
      created_at: isoNow()
    };
    return data;
  }
  function backupFile(){
    const payload = JSON.stringify(backupObject(), null, 2);
    const date = new Date().toISOString().slice(0,10);
    return new File([payload], `thalify-backup-${date}.json`, {type:'application/json'});
  }
  function markBackedUp(){
    localStorage.setItem(LAST_BACKUP_KEY, isoNow());
    localStorage.removeItem(BACKUP_REMINDER_KEY);
    refreshBackupUi();
  }
  function fallbackDownload(file){
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  }
  async function shareBackup(){
    markBackedUp();
    const file = backupFile();
    try{
      if (navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share({
          title:'Thalify backup',
          text:'Thalify data backup. Keep this file somewhere safe so it can be restored after reinstalling.',
          files:[file]
        });
        return;
      }
    }catch(err){
      if (err && err.name === 'AbortError') return;
    }
    fallbackDownload(file);
  }

  function formatBackupStatus(){
    const last = localStorage.getItem(LAST_BACKUP_KEY);
    if (!last) return hasUserData() ? 'No backup recorded yet' : 'No local data yet';
    const d = new Date(last);
    if (Number.isNaN(d.getTime())) return 'Backup date unavailable';
    return `Last backup: ${d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`;
  }

  function ensureBackupStyles(){
    if (document.getElementById('thalify-backup-styles')) return;
    const s = document.createElement('style');
    s.id = 'thalify-backup-styles';
    s.textContent = `
      .thalify-backup-card{border:1px solid color-mix(in srgb,var(--turmeric) 26%,var(--line));}
      .thalify-backup-title{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .thalify-backup-title .ttl{font-family:'Fraunces',Georgia,serif;font-size:17px;font-weight:650}
      .thalify-backup-status{font-size:11px;color:var(--faint);white-space:nowrap}
      .thalify-backup-copy{font-size:12.5px;color:var(--muted);line-height:1.5;margin-top:8px}
      .thalify-backup-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .thalify-backup-actions button{flex:1;min-width:135px}
      .thalify-backup-main{background:var(--turmeric);color:#1a1508;padding:10px 12px;font-weight:700}
      .thalify-backup-secondary{background:var(--cardsoft);border:1px solid var(--line);color:var(--text);padding:10px 12px;font-weight:600}
      .thalify-backup-note{font-size:10.5px;color:var(--faint);line-height:1.45;margin-top:10px}
      .thalify-backup-reminder{border:1px solid color-mix(in srgb,var(--turmeric) 34%,var(--line));background:color-mix(in srgb,var(--turmeric) 7%,var(--card));}
      .thalify-backup-reminder .backup-reminder-row{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .thalify-backup-reminder .backup-reminder-title{font-weight:700;font-size:13.5px}
      .thalify-backup-reminder .backup-reminder-copy{font-size:12px;color:var(--muted);line-height:1.45;margin-top:3px}
      .thalify-backup-reminder .backup-reminder-x{background:none;color:var(--faint);font-size:18px;padding:0 2px;line-height:1}
      .thalify-backup-reminder .backup-reminder-actions{display:flex;gap:8px;margin-top:10px}
      .thalify-backup-reminder .backup-reminder-actions button{flex:1;padding:9px 10px;font-weight:650}
    `;
    document.head.appendChild(s);
  }

  function ensureBackupCard(){
    ensureBackupStyles();
    const host = document.getElementById('profileContent');
    if (!host || document.getElementById('thalify-backup-card')) return;
    const card = document.createElement('div');
    card.className = 'card thalify-backup-card';
    card.id = 'thalify-backup-card';
    card.innerHTML = `
      <div class="thalify-backup-title">
        <div class="ttl">Data &amp; Backup</div>
        <div class="thalify-backup-status" id="thalify-backup-status"></div>
      </div>
      <div class="thalify-backup-copy">
        Your Thalify history is stored on this device. Keep a backup so you can restore it after reinstalling the web app, changing phones, or clearing website data.
      </div>
      <div class="thalify-backup-actions">
        <button type="button" class="thalify-backup-main" id="thalify-backup-now">Back up now</button>
        <button type="button" class="thalify-backup-secondary" id="thalify-restore-now">Restore backup</button>
      </div>
      <div class="thalify-backup-note">
        On iPhone, “Back up now” opens the share sheet when supported. Choose <b>Save to Files</b> and iCloud Drive for the safest copy. Thalify never deletes your local history during an app update.
      </div>`;
    host.appendChild(card);
    document.getElementById('thalify-backup-now')?.addEventListener('click', shareBackup);
    document.getElementById('thalify-restore-now')?.addEventListener('click', ()=>document.getElementById('importFile')?.click());
    refreshBackupUi();
  }

  function refreshBackupUi(){
    const next = formatBackupStatus();
    const status = document.getElementById('thalify-backup-status');
    if (status && status.textContent !== next) status.textContent = next;
    const reminderStatus = document.getElementById('thalify-backup-reminder-status');
    if (reminderStatus && reminderStatus.textContent !== next) reminderStatus.textContent = next;
  }

  function shouldShowReminder(){
    if (!hasUserData()) return false;
    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    const dismissed = localStorage.getItem(BACKUP_REMINDER_KEY);
    if (lastBackup && daysSince(lastBackup) < REMIND_AGAIN_DAYS) return false;
    if (dismissed && daysSince(dismissed) < REMINDER_AFTER_DAYS) return false;
    return true;
  }

  function ensureReminder(){
    if (!shouldShowReminder()) return;
    const today = document.getElementById('tab-today');
    if (!today || document.getElementById('thalify-backup-reminder')) return;
    ensureBackupStyles();
    const card = document.createElement('div');
    card.className = 'card thalify-backup-reminder';
    card.id = 'thalify-backup-reminder';
    card.innerHTML = `
      <div class="backup-reminder-row">
        <div>
          <div class="backup-reminder-title">Protect your Thalify history</div>
          <div class="backup-reminder-copy">A backup lets you restore your data after reinstalling or moving to a new phone.</div>
        </div>
        <button type="button" class="backup-reminder-x" aria-label="Dismiss backup reminder">×</button>
      </div>
      <div class="backup-reminder-copy" id="thalify-backup-reminder-status" style="margin-top:7px"></div>
      <div class="backup-reminder-actions">
        <button type="button" class="thalify-backup-main">Back up now</button>
        <button type="button" class="thalify-backup-secondary">Later</button>
      </div>`;
    const firstCard = today.querySelector('.card');
    if (firstCard) firstCard.insertAdjacentElement('afterend', card);
    else today.prepend(card);
    card.querySelector('.thalify-backup-main')?.addEventListener('click', shareBackup);
    const dismiss = ()=>{
      localStorage.setItem(BACKUP_REMINDER_KEY, isoNow());
      card.remove();
    };
    card.querySelector('.backup-reminder-x')?.addEventListener('click', dismiss);
    card.querySelector('.thalify-backup-secondary')?.addEventListener('click', dismiss);
    refreshBackupUi();
  }

  function wrapExistingBackup(){
    if (typeof window.exportData !== 'function' || window.exportData.__thalifyWrapped) return;
    const original = window.exportData;
    const wrapped = function(){
      const out = original.apply(this, arguments);
      markBackedUp();
      return out;
    };
    wrapped.__thalifyWrapped = true;
    window.exportData = wrapped;
  }

  async function requestPersistentStorage(){
    try{
      if (!navigator.storage || !navigator.storage.persisted || !navigator.storage.persist) return;
      const already = await navigator.storage.persisted();
      if (!already) await navigator.storage.persist();
    }catch(_){ }
  }

  function hardenServiceWorkerUpdates(){
    if (!('serviceWorker' in navigator)) return;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      if (reloading) return;
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker.register('./sw.js', {updateViaCache:'none'}).then(reg=>{
      reg.update().catch(()=>{});
      const update = ()=>reg.update().catch(()=>{});
      window.addEventListener('focus', update);
      document.addEventListener('visibilitychange', ()=>{ if (!document.hidden) update(); });
      setInterval(update, 6 * 60 * 60 * 1000);
    }).catch(()=>{});
  }

  function showRestoreHintForFreshInstall(){
    if (hasUserData()) return;
    const host = document.getElementById('profileContent');
    if (!host || document.getElementById('thalify-fresh-restore-hint')) return;
    const box = document.createElement('div');
    box.id = 'thalify-fresh-restore-hint';
    box.className = 'card';
    box.style.border = '1px dashed var(--line)';
    box.innerHTML = `
      <div style="font-weight:700;font-size:13.5px">Reinstalled Thalify?</div>
      <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px">If you saved a Thalify backup on this phone, restore it before setting up a new profile.</div>
      <button type="button" class="thalify-backup-secondary" style="width:100%;margin-top:10px">Restore an existing backup</button>`;
    host.appendChild(box);
    box.querySelector('button')?.addEventListener('click', ()=>document.getElementById('importFile')?.click());
  }

  function refreshInjectedUi(){
    wrapExistingBackup();
    ensureBackupCard();
    showRestoreHintForFreshInstall();
    ensureReminder();
  }

  hardenServiceWorkerUpdates();
  requestPersistentStorage();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshInjectedUi, {once:true});
  else refreshInjectedUi();

  const observer = new MutationObserver(()=>refreshInjectedUi());
  observer.observe(document.documentElement, {subtree:true, childList:true});
})();
