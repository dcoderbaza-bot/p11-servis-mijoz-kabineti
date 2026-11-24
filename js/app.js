/**
 * P11 — TechFix Servis Mijoz Kabineti (Modern SaaS Edition)
 * REST API (Node.js Backend) mavjud bo'lsa u orqali ishlaydi,
 * statik hostingda (GitHub Pages) esa aynan o'sha EstimatePolicy moduli + LocalStorage orqali ishlaydi.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'p11_techfix_orders_v1';
  const THEME_KEY = 'p11_techfix_theme';
  let apiOnline = false;
  let allOrders = [];
  let orders = [];
  let selectedOrderId = 'ORD-101';
  let activeFilter = 'ALL';
  let searchQuery = '';

  function formatMoney(amount) {
    if (amount == null || Number.isNaN(Number(amount))) return '—';
    return Number(amount).toLocaleString('ru-RU') + " so'm";
  }

  function formatTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function actorShort(actor) {
    if (actor === 'MIJOZ') return 'MJ';
    if (actor === 'USTA') return 'US';
    return 'QX';
  }

  function showToast(message, isError) {
    const el = document.getElementById('toastBanner');
    el.innerHTML = `
      <span>${isError ? '✕ ' : '✓ '}${message}</span>
      <button onclick="document.getElementById('toastBanner').className='toast-banner'" style="background:none;border:none;color:inherit;font-weight:800;cursor:pointer;">✕</button>
    `;
    el.className = 'toast-banner show ' + (isError ? 'err' : 'ok');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function enrichLocalOrder(order) {
    const copy = JSON.parse(JSON.stringify(order));
    if (copy.estimates && copy.estimates.length >= 2) {
      copy.latestComparison = window.EstimatePolicy.compareEstimates(
        copy.estimates[copy.estimates.length - 2],
        copy.estimates[copy.estimates.length - 1]
      );
    } else {
      copy.latestComparison = null;
    }
    return copy;
  }

  function loadLocalStore() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore storage error
    }
    const seed = window.SeedOrders.getInitialOrders();
    saveLocalStore(seed);
    return seed;
  }

  function saveLocalStore(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // ignore storage error
    }
  }

  async function detectBackend() {
    const badge = document.getElementById('engineBadge');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const res = await fetch('./api/health', { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && data.projectCode === 'P11') {
          apiOnline = true;
          badge.textContent = '● Node.js REST API Faol';
          badge.classList.add('api');
          return;
        }
      }
    } catch {
      // Static mode (GitHub Pages)
    }
    apiOnline = false;
    badge.textContent = '● BR-P11 Web Engine Faol';
    badge.classList.remove('api');
  }

  function applyClientFilter() {
    const q = searchQuery.trim().toLowerCase();
    orders = allOrders.filter((o) => {
      const matchQuery =
        !q ||
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.deviceModel.toLowerCase().includes(q);
      if (!matchQuery) return false;
      if (activeFilter === 'PENDING') {
        return o.status === 'WAITING_APPROVAL' || o.status === 'WAITING_REAPPROVAL' || o.status === 'ESTIMATE_REJECTED';
      }
      if (activeFilter === 'ACTIVE') {
        return o.status === 'IN_PROGRESS' || o.status === 'IN_PROGRESS_PARTIAL' || o.status === 'COMPLETED';
      }
      return true;
    });

    if (!orders.find((o) => o.id === selectedOrderId) && orders.length > 0) {
      selectedOrderId = orders[0].id;
    }
  }

  async function fetchOrders() {
    if (apiOnline) {
      const res = await fetch('./api/orders');
      const data = await res.json();
      allOrders = data.orders || [];
    } else {
      allOrders = loadLocalStore().map(enrichLocalOrder);
    }
    applyClientFilter();
    renderAll();
  }

  function getSelectedOrder() {
    return orders.find((o) => o.id === selectedOrderId) || allOrders.find((o) => o.id === selectedOrderId) || allOrders[0] || null;
  }

  function renderKpis() {
    const kpiEl = document.getElementById('kpiStrip');
    if (!kpiEl) return;
    const total = allOrders.length;
    const waiting = allOrders.filter(
      (o) => o.status === 'WAITING_APPROVAL' || o.status === 'WAITING_REAPPROVAL'
    ).length;
    const inWork = allOrders.filter(
      (o) => o.status === 'IN_PROGRESS' || o.status === 'IN_PROGRESS_PARTIAL' || o.status === 'COMPLETED'
    ).length;
    const totalAgreed = allOrders.reduce((acc, o) => acc + (Number(o.agreedPrice) || 0), 0);

    const badge = document.getElementById('pendingCountBadge');
    if (badge) {
      badge.textContent = waiting > 0 ? `${waiting} tasdiq kutmoqda` : 'Hammasi ko‘rilgan';
    }

    kpiEl.innerHTML = `
      <div class="kpi-card">
        <div>
          <div class="kpi-label">Jami servis buyurtmalari</div>
          <div class="kpi-value jakarta">${total} ta</div>
          <div class="kpi-sub">Smartfon va noutbuklar</div>
        </div>
        <div class="kpi-icon" style="background:var(--brand-soft);color:var(--brand);">📱</div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-label">Mijoz roziligini kutmoqda</div>
          <div class="kpi-value jakarta" style="color:var(--amber);">${waiting} ta</div>
          <div class="kpi-sub">Smeta v1 / v2 tasdig‘i</div>
        </div>
        <div class="kpi-icon" style="background:var(--amber-soft);color:var(--amber);">⚡</div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-label">Jarayonda va yakunlangan</div>
          <div class="kpi-value jakarta" style="color:var(--emerald);">${inWork} ta</div>
          <div class="kpi-sub">Tasdiqlangan smetalar</div>
        </div>
        <div class="kpi-icon" style="background:var(--emerald-soft);color:var(--emerald);">✓</div>
      </div>
      <div class="kpi-card">
        <div>
          <div class="kpi-label">Kelishilgan smeta hajmi</div>
          <div class="kpi-value mono" style="font-size:17.5px;">${formatMoney(totalAgreed)}</div>
          <div class="kpi-sub">100% mijoz tasdig‘i bilan</div>
        </div>
        <div class="kpi-icon" style="background:var(--brand-soft);color:var(--brand);">🛡️</div>
      </div>
    `;
  }

  function renderSidebar() {
    const listEl = document.getElementById('orderList');
    const countLabel = document.getElementById('orderCountLabel');
    if (countLabel) countLabel.textContent = `${orders.length} ta`;

    if (!orders.length) {
      listEl.innerHTML = '<div style="font-size:13.5px;color:var(--muted);padding:12px 4px;">Mos buyurtma topilmadi.</div>';
      return;
    }

    listEl.innerHTML = orders
      .map((o) => {
        const isSel = o.id === selectedOrderId ? 'selected' : '';
        const icon = o.deviceType === 'Noutbuk' ? '💻' : '📱';
        const latest = o.estimates && o.estimates.length ? o.estimates[o.estimates.length - 1] : null;
        const priceHint = latest ? formatMoney(latest.totalPrice) : 'Diagnostika';
        return `
          <div class="order-item ${isSel}" onclick="window.App.selectOrder('${o.id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <span class="mono" style="font-size:12.5px;font-weight:800;color:var(--brand);">#${o.id}</span>
              <span class="status-pill st-${o.status}">${o.statusLabel}</span>
            </div>
            <div style="font-size:14.5px;font-weight:700;margin-top:6px;">${icon} ${o.deviceModel}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:12px;color:var(--muted);">
              <span>${o.customerName}</span>
              <strong class="mono" style="color:var(--ink-2);">${priceHint}</strong>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function renderCustomerDetail() {
    const container = document.getElementById('customerOrderDetail');
    const order = getSelectedOrder();
    if (!order) {
      container.innerHTML = '<div class="card">Buyurtmani tanlang.</div>';
      return;
    }

    const hasEst = order.estimates && order.estimates.length > 0;
    const latest = hasEst ? order.estimates[order.estimates.length - 1] : null;
    const isRejected = order.status === 'ESTIMATE_REJECTED';
    const icon = order.deviceType === 'Noutbuk' ? '💻' : '📱';

    const step1Class = 'done';
    const step2Class = hasEst ? 'done' : 'active';
    const step3Class = isRejected
      ? 'alert'
      : latest && latest.status === 'PENDING'
      ? 'active'
      : latest && (latest.status === 'APPROVED' || order.status === 'IN_PROGRESS_PARTIAL')
      ? 'done'
      : '';
    const step4Class =
      order.status === 'IN_PROGRESS' || order.status === 'IN_PROGRESS_PARTIAL'
        ? 'active'
        : order.status === 'COMPLETED'
        ? 'done'
        : '';
    const step5Class = order.status === 'COMPLETED' ? 'done' : '';

    let estimatesHtml = '';
    if (!hasEst) {
      estimatesHtml = `
        <div style="margin-top:14px;padding:18px;background:var(--surface-2);border-radius:14px;border:1.5px dashed var(--border-strong);font-size:13.5px;color:var(--muted);">
          🔬 Qurilma hozir diagnostika navbatida. Usta birinchi smetani shakllantirishi bilan shu oynada ko‘rinadi.
        </div>
      `;
    } else {
      const prevTitles =
        order.estimates.length >= 2
          ? new Set(order.estimates[0].items.map((i) => i.title))
          : new Set();

      estimatesHtml = `
        <div class="compare-grid">
          ${order.estimates
            .map((est) => {
              const isLatestPending = est.version === latest.version && est.status === 'PENDING';
              const badgeHtml =
                est.status === 'APPROVED'
                  ? '<span class="status-pill st-IN_PROGRESS">✓ Tasdiqlangan</span>'
                  : est.status === 'REJECTED'
                  ? '<span class="status-pill st-ESTIMATE_REJECTED">✕ Rad etilgan</span>'
                  : est.status === 'SUPERSEDED'
                  ? '<span class="status-pill st-REGISTERED">Arxivlangan versiya</span>'
                  : '<span class="status-pill st-WAITING_REAPPROVAL">⚡ Qaror kutilmoqda</span>';

              const rows = est.items
                .map((item) => {
                  const isNew = est.version > 1 && !prevTitles.has(item.title);
                  return `
                    <tr class="${isNew ? 'new-item' : ''}">
                      <td>${isNew ? '<span class="new-tag">+YANGI</span>' : ''}${item.title}</td>
                      <td class="mono" style="text-align:right;font-weight:600;">${formatMoney(item.price)}</td>
                    </tr>
                  `;
                })
                .join('');

              const deltaNote =
                est.priceDelta > 0
                  ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">
                      <span class="status-pill st-WAITING_REAPPROVAL">Farq: +${formatMoney(est.priceDelta)}</span>
                      <span class="status-pill st-WAITING_REAPPROVAL">Muddat: +${est.durationDeltaHours} soat</span>
                    </div>`
                  : '';

              return `
                <div class="est-box ${isLatestPending ? 'latest-pending' : ''}">
                  <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                      <strong class="jakarta" style="font-size:16px;">Smeta v${est.version}</strong>
                      ${badgeHtml}
                    </div>
                    <div style="font-size:12.8px;color:var(--muted);margin-top:7px;">
                      <strong>Diagnostika:</strong> ${est.diagnosticNote}
                    </div>
                    <table class="est-table">
                      <thead>
                        <tr><th>Ishlar va ehtiyot qismlar</th><th style="text-align:right;">Narxi</th></tr>
                      </thead>
                      <tbody>
                        ${rows}
                      </tbody>
                    </table>
                  </div>
                  <div style="margin-top:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;">
                      <span style="font-size:12.5px;color:var(--muted);">⏱ Muddat: <strong>${est.durationHours} soat</strong></span>
                      <strong class="mono" style="font-size:17.5px;color:var(--ink);">${formatMoney(est.totalPrice)}</strong>
                    </div>
                    ${deltaNote}
                    ${
                      est.rejectionReason
                        ? `<div style="margin-top:8px;font-size:12.5px;color:var(--rose);font-weight:700;">Rad sababi: «${est.rejectionReason}»</div>`
                        : ''
                    }
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
    }

    let actionPanelHtml = '';
    if (latest && latest.status === 'PENDING') {
      actionPanelHtml = `
        <div class="decision-panel">
          <div class="jakarta" style="font-weight:800;font-size:16px;color:var(--ink);">
            ⚖️ Smeta v${latest.version} bo‘yicha mijoz qarorini tasdiqlang
          </div>
          <p style="font-size:13px;color:var(--ink-2);margin-top:4px;">
            Asosiy biznes qoidasi (BR-P11): Sizning roziligingizsiz yangi xarajatlar bo‘yicha ta’mirlash davom ettirilmaydi.
          </p>
          <div class="btn-group">
            <button class="btn btn-success" id="approveEstBtn" onclick="window.App.approveLatest('${order.id}', ${latest.version})">
              ✓ Smeta v${latest.version} ni Tasdiqlash · ${formatMoney(latest.totalPrice)}
            </button>
            <button class="btn btn-secondary" style="color:var(--rose);border-color:rgba(225,29,72,0.4);" onclick="window.App.toggleRejectForm()">
              ✕ Smeta v${latest.version} ni Rad etish
            </button>
          </div>
          <div id="rejectFormWrap" style="display:none;margin-top:14px;padding-top:14px;border-top:1px dashed var(--border-strong);">
            <label class="form-label" style="color:var(--rose);">Rad etish sababini tanlang (majburiy):</label>
            <select id="rejectReasonSelect" class="form-control" style="margin-bottom:10px;">
              <option value="Qo'shimcha xarajat shaxsiy budjetimdan oshib ketdi">Qo'shimcha xarajat shaxsiy budjetimdan oshib ketdi</option>
              <option value="Qo'shimcha ta'mir muddati uzoq, qurilma tezroq kerak">Qo'shimcha ta'mir muddati uzoq, qurilma tezroq kerak</option>
              <option value="Hozircha faqat birinchi smetadagi asosiy ishni bajarish yetarli">Hozircha faqat birinchi smetadagi asosiy ishni bajarish yetarli</option>
            </select>
            <button class="btn btn-danger" onclick="window.App.rejectLatest('${order.id}', ${latest.version})">
              Rad etish qarorini tasdiqlash →
            </button>
          </div>
        </div>
      `;
    } else if (order.status === 'ESTIMATE_REJECTED') {
      const hasV1 = order.estimates && order.estimates.length > 1;
      actionPanelHtml = `
        <div class="followup-panel">
          <div class="jakarta" style="font-weight:800;font-size:16px;color:var(--rose);">
            ✕ Smeta v${latest ? latest.version : ''} rad etildi — Keyingi amalni tanlang
          </div>
          <p style="font-size:13.5px;color:var(--ink-2);margin-top:5px;">
            Sabab qayd etildi: <strong>«${latest ? latest.rejectionReason : ''}»</strong>. Jarayon to‘xtab qolmasligi uchun muqobil yo‘lni tanlang:
          </p>
          <div class="btn-group">
            ${
              hasV1
                ? `<button class="btn btn-primary" onclick="window.App.applyFollowUp('${order.id}', 'CONTINUE_V1')">
                    1. Faqat Smeta v1 (${formatMoney(order.estimates[0].totalPrice)}) bo‘yicha davom ettirish
                  </button>`
                : `<button class="btn btn-primary" onclick="window.App.applyFollowUp('${order.id}', 'REQUEST_ALTERNATIVE')">
                    1. Arzonroq analog ehtiyot qism bilan qayta smeta so‘rash
                  </button>`
            }
            <button class="btn btn-secondary" onclick="window.App.applyFollowUp('${order.id}', 'CANCEL_AND_PICKUP')">
              2. Ta’mirdan voz kechish va qurilmani olib ketish
            </button>
          </div>
        </div>
      `;
    }

    const historyHtml = (order.history || [])
      .slice()
      .reverse()
      .map(
        (h) => `
        <div class="history-entry">
          <div class="actor-avatar av-${h.actor}">${actorShort(h.actor)}</div>
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;font-size:11.5px;color:var(--muted);font-weight:700;">
              <span>${h.actor} · ${h.action}</span>
              <span class="mono">${formatTime(h.at)}</span>
            </div>
            <div style="margin-top:3px;color:var(--ink);">${h.detail}</div>
          </div>
        </div>
      `
      )
      .join('');

    container.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;align-items:flex-start;">
          <div>
            <div class="mono" style="font-size:12px;color:var(--brand);font-weight:800;">KVITANSIYA #${order.id} · SERIYA: ${order.serialNumber}</div>
            <h2 class="jakarta" style="font-size:22px;margin-top:3px;">${icon} ${order.deviceModel}</h2>
            <div style="font-size:13.5px;color:var(--muted);margin-top:3px;">
              <strong>Mijoz:</strong> ${order.customerName} (${order.customerPhone}) · <strong>Mas’ul:</strong> ${order.technicianName}
            </div>
          </div>
          <span class="status-pill st-${order.status}" style="font-size:12.5px;padding:6px 13px;">${order.statusLabel}</span>
        </div>

        <div class="passport-hero">
          <div>
            <div style="font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;">Mijoz shikoyati</div>
            <div style="font-size:13.5px;margin-top:3px;">${order.complaint}</div>
          </div>
          <div>
            <div style="font-size:11.5px;font-weight:700;color:var(--muted);text-transform:uppercase;">Amaldagi kelishilgan summa</div>
            <div class="mono" style="font-size:16px;font-weight:800;margin-top:3px;color:var(--emerald);">
              ${order.agreedPrice ? `${formatMoney(order.agreedPrice)} (Smeta v${order.agreedVersion})` : 'Hali tasdiqlanmagan'}
            </div>
          </div>
        </div>

        <div class="timeline-steps">
          <div class="tl-step ${step1Class}">1. Ro‘yxatga olindi</div>
          <div class="tl-step ${step2Class}">2. Diagnostika &amp; Smeta</div>
          <div class="tl-step ${step3Class}">3. Mijoz roziligi</div>
          <div class="tl-step ${step4Class}">4. Ta’mir jarayoni</div>
          <div class="tl-step ${step5Class}">5. Topshirishga tayyor</div>
        </div>

        <h3 class="jakarta" style="font-size:16.5px;margin-top:18px;">Smeta versiyalari va narx o‘zgarishlari</h3>
        ${estimatesHtml}
        ${actionPanelHtml}

        <h3 class="jakarta" style="font-size:16px;margin-top:24px;">Elektron audit va qarorlar tarixi</h3>
        <div class="history-list">${historyHtml}</div>
      </div>
    `;
  }

  function renderTechnicianPanel() {
    const selectEl = document.getElementById('techOrderSelect');
    if (!selectEl) return;
    selectEl.innerHTML = allOrders
      .map(
        (o) =>
          `<option value="${o.id}" ${o.id === selectedOrderId ? 'selected' : ''}>#${o.id} — ${o.deviceModel} (${o.statusLabel})</option>`
      )
      .join('');

    const order = getSelectedOrder();
    const summaryEl = document.getElementById('techOrderSummary');
    if (!order) {
      summaryEl.innerHTML = '';
      return;
    }
    const nextVer = (order.estimates ? order.estimates.length : 0) + 1;
    summaryEl.innerHTML = `
      <div style="padding:14px 16px;background:var(--surface-2);border-radius:14px;border:1px solid var(--border);margin-bottom:16px;font-size:13.5px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center;">
        <div>
          <strong>Tanlangan qurilma:</strong> <span class="mono">#${order.id}</span> · ${order.deviceModel}
          <span style="margin-left:8px;" class="status-pill st-${order.status}">${order.statusLabel}</span>
        </div>
        <div>Keyingi yuboriladigan versiya: <strong style="color:var(--brand);">Smeta v${nextVer}</strong></div>
      </div>
    `;
  }

  function renderAll() {
    renderKpis();
    renderSidebar();
    renderCustomerDetail();
    renderTechnicianPanel();
  }

  async function mutateOrder(apiPath, localMutator) {
    if (apiOnline) {
      const res = await fetch(apiPath.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPath.body)
      });
      const data = await res.json();
      if (!res.ok && !data.decisionRecorded) {
        showToast(data.message || 'Amal rad etildi.', true);
        await fetchOrders();
        return;
      }
      showToast(data.message, !data.accepted);
      await fetchOrders();
      return;
    }

    const rawOrders = loadLocalStore();
    const target = rawOrders.find((o) => o.id === apiPath.orderId);
    const result = localMutator(target, rawOrders);
    if (result.accepted || result.decisionRecorded) {
      saveLocalStore(rawOrders);
    }
    showToast(result.message, !result.accepted);
    await fetchOrders();
  }

  window.App = {
    toggleTheme() {
      const root = document.documentElement;
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      const btn = document.getElementById('themeToggleBtn');
      if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
      try { localStorage.setItem(THEME_KEY, next); } catch {}
    },

    setFilter(filterName) {
      activeFilter = filterName;
      document.querySelectorAll('.f-chip').forEach((c) => {
        c.classList.toggle('active', c.dataset.filter === filterName);
      });
      applyClientFilter();
      renderAll();
    },

    switchRole(role) {
      document.querySelectorAll('.role-tab').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.role === role);
      });
      document.querySelectorAll('.role-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `panel-${role}`);
      });
      renderAll();
    },

    selectOrder(orderId) {
      selectedOrderId = orderId;
      renderAll();
    },

    toggleRejectForm() {
      const el = document.getElementById('rejectFormWrap');
      if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
    },

    updateLiveTotal() {
      const p1 = Number(document.getElementById('estItem1Price').value) || 0;
      const p2 = Number(document.getElementById('estItem2Price').value) || 0;
      const el = document.getElementById('liveEstimateTotal');
      if (el) el.textContent = formatMoney(p1 + p2);
    },

    async approveLatest(orderId, version) {
      await mutateOrder(
        {
          orderId,
          url: `./api/orders/${orderId}/decision`,
          body: { decision: 'APPROVE', version }
        },
        (order) => window.EstimatePolicy.evaluateCustomerDecision(order, { decision: 'APPROVE', version })
      );
    },

    async rejectLatest(orderId, version) {
      const reason = document.getElementById('rejectReasonSelect').value;
      await mutateOrder(
        {
          orderId,
          url: `./api/orders/${orderId}/decision`,
          body: { decision: 'REJECT', version, reason }
        },
        (order) => window.EstimatePolicy.evaluateCustomerDecision(order, { decision: 'REJECT', version, reason })
      );
    },

    async applyFollowUp(orderId, actionId) {
      await mutateOrder(
        {
          orderId,
          url: `./api/orders/${orderId}/followup`,
          body: { actionId }
        },
        (order) => window.EstimatePolicy.applyFollowUpAction(order, actionId)
      );
    },

    fillSampleEstimate() {
      const order = getSelectedOrder();
      const isSecond = order && order.estimates && order.estimates.length >= 1;
      if (isSecond) {
        document.getElementById('estDiagNote').value =
          "Ichki tekshiruvda qo'shimcha batareya kontrolleri eskirgani aniqlandi. Almashtirish tavsiya etiladi.";
        document.getElementById('estDuration').value = '30';
        document.getElementById('estItem1Title').value = order.estimates[0].items[0].title;
        document.getElementById('estItem1Price').value = order.estimates[0].items[0].price;
        document.getElementById('estItem2Title').value = "Qo'shimcha batareya/kontroller almashtirish";
        document.getElementById('estItem2Price').value = '320000';
      } else {
        document.getElementById('estDiagNote').value =
          "Klaviatura shleyfi oksidlangan, ultratovushli tozalash va shleyf almashtirish kerak.";
        document.getElementById('estDuration').value = '18';
        document.getElementById('estItem1Title').value = 'Original klaviatura shleyfi';
        document.getElementById('estItem1Price').value = '450000';
        document.getElementById('estItem2Title').value = "Ultratovushli tozalash va yig'ish xizmati";
        document.getElementById('estItem2Price').value = '200000';
      }
      window.App.updateLiveTotal();
    },

    async submitNewEstimate(event) {
      event.preventDefault();
      const orderId = document.getElementById('techOrderSelect').value;
      selectedOrderId = orderId;
      const diagnosticNote = document.getElementById('estDiagNote').value;
      const durationHours = Number(document.getElementById('estDuration').value);
      const items = [];
      const t1 = document.getElementById('estItem1Title').value.trim();
      const p1 = Number(document.getElementById('estItem1Price').value);
      const t2 = document.getElementById('estItem2Title').value.trim();
      const p2 = Number(document.getElementById('estItem2Price').value);
      if (t1) items.push({ title: t1, price: p1 });
      if (t2) items.push({ title: t2, price: p2 });

      await mutateOrder(
        {
          orderId,
          url: `./api/orders/${orderId}/estimates`,
          body: { diagnosticNote, durationHours, items }
        },
        (order) => window.EstimatePolicy.createEstimateVersion(order, { diagnosticNote, durationHours, items })
      );
    },

    async updateTechStatus(targetStatus) {
      const orderId = document.getElementById('techOrderSelect').value;
      selectedOrderId = orderId;
      await mutateOrder(
        {
          orderId,
          url: `./api/orders/${orderId}/status`,
          body: { targetStatus }
        },
        (order) => window.EstimatePolicy.advanceRepairStatus(order, targetStatus)
      );
    },

    async registerOrder(event) {
      event.preventDefault();
      const payload = {
        customerName: document.getElementById('recName').value.trim(),
        customerPhone: document.getElementById('recPhone').value.trim(),
        deviceType: document.getElementById('recType').value,
        deviceModel: document.getElementById('recModel').value.trim(),
        serialNumber: document.getElementById('recSerial').value.trim(),
        complaint: document.getElementById('recComplaint').value.trim()
      };

      if (apiOnline) {
        const res = await fetch('./api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        showToast(data.message, !res.ok);
        if (res.ok && data.order) selectedOrderId = data.order.id;
        await fetchOrders();
        if (res.ok) event.target.reset();
        return;
      }

      const raw = loadLocalStore();
      if (!payload.customerName || !payload.customerPhone || !payload.deviceModel || !payload.complaint) {
        showToast("Mijoz ismi, telefoni, qurilma modeli va shikoyat kiritilishi shart.", true);
        return;
      }
      const nextNum = 101 + raw.length;
      const now = new Date().toISOString();
      const newOrder = {
        id: `ORD-${nextNum}`,
        ...payload,
        serialNumber: payload.serialNumber || `SN-${nextNum}`,
        technicianName: 'Usta Karimov Anvar',
        createdAt: now,
        status: 'REGISTERED',
        statusLabel: window.EstimatePolicy.ORDER_STATUS_LABELS.REGISTERED,
        agreedVersion: null,
        agreedPrice: null,
        agreedDurationHours: null,
        estimates: [],
        history: [
          {
            at: now,
            actor: 'QABUL_XODIMI',
            action: 'BUYURTMA_OCHILDI',
            detail: `Qurilma qabul qilindi: ${payload.deviceModel}. Shikoyat: ${payload.complaint}`
          }
        ]
      };
      raw.unshift(newOrder);
      saveLocalStore(raw);
      selectedOrderId = newOrder.id;
      showToast(`Buyurtma #${newOrder.id} muvaffaqiyatli ro'yxatga olindi!`, false);
      event.target.reset();
      await fetchOrders();
    },

    async resetDemo() {
      if (apiOnline) {
        await fetch('./api/reset', { method: 'POST' });
      } else {
        saveLocalStore(window.SeedOrders.getInitialOrders());
      }
      selectedOrderId = 'ORD-101';
      activeFilter = 'ALL';
      showToast("Namoyish ma'lumotlari dastlabki holatga (#ORD-101 Smeta v1 va v2) qaytarildi.", false);
      await fetchOrders();
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        const btn = document.getElementById('themeToggleBtn');
        if (btn) btn.textContent = '☀️';
      }
    } catch {}

    const searchInput = document.getElementById('searchOrderInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        applyClientFilter();
        renderAll();
      });
    }
    await detectBackend();
    await fetchOrders();
  });
})();
