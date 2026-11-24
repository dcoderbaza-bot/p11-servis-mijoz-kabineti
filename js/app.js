/**
 * P11 — TechFix Servis Mijoz Kabineti Frontend Mantiqi
 * REST API (Node.js Backend) mavjud bo'lsa u orqali ishlaydi,
 * statik hostingda (GitHub Pages) esa aynan o'sha EstimatePolicy moduli + LocalStorage orqali ishlaydi.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'p11_techfix_orders_v1';
  let apiOnline = false;
  let orders = [];
  let selectedOrderId = 'ORD-101';
  let activeRole = 'customer';

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

  function showToast(message, isError) {
    const el = document.getElementById('toastBanner');
    el.textContent = message;
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
          badge.textContent = '🟢 Node.js REST API Ulangan';
          badge.classList.add('api');
          return;
        }
      }
    } catch {
      // Static mode (GitHub Pages)
    }
    apiOnline = false;
    badge.textContent = '🔵 Web Kabinet Faol (BR-P11 Moduli)';
    badge.classList.remove('api');
  }

  async function fetchOrders(searchQuery = '') {
    if (apiOnline) {
      const q = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`./api/orders${q}`);
      const data = await res.json();
      orders = data.orders || [];
    } else {
      const raw = loadLocalStore();
      const q = searchQuery.trim().toLowerCase();
      orders = raw
        .filter(
          (o) =>
            !q ||
            o.id.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerPhone.toLowerCase().includes(q) ||
            o.deviceModel.toLowerCase().includes(q)
        )
        .map(enrichLocalOrder);
    }

    if (!orders.find((o) => o.id === selectedOrderId) && orders.length > 0) {
      selectedOrderId = orders[0].id;
    }
    renderAll();
  }

  function getSelectedOrder() {
    return orders.find((o) => o.id === selectedOrderId) || orders[0] || null;
  }

  function renderSidebar() {
    const listEl = document.getElementById('orderList');
    if (!orders.length) {
      listEl.innerHTML = '<div style="font-size:13.5px;color:#64748b;">Mos buyurtma topilmadi.</div>';
      return;
    }
    listEl.innerHTML = orders
      .map((o) => {
        const isSel = o.id === selectedOrderId ? 'selected' : '';
        return `
          <div class="order-item ${isSel}" onclick="window.App.selectOrder('${o.id}')">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <strong>${o.id}</strong>
              <span class="status-pill st-${o.status}">${o.statusLabel}</span>
            </div>
            <div style="font-size:13.5px;font-weight:700;margin-top:4px;">${o.deviceModel}</div>
            <div style="font-size:12px;color:#64748b;">${o.customerName} · ${o.customerPhone}</div>
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

    // Timeline bosqichlari
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
        <div style="margin-top:14px;padding:14px;background:#f8fafc;border-radius:10px;border:1px dashed #cbd5e1;font-size:13.5px;">
          Qurilma diagnostika navbatida. Usta birinchi smetani kiritishi bilan shu sahifada ko'rinadi.
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
                  ? '<span class="status-pill st-REGISTERED">Avvalgi versiya</span>'
                  : '<span class="status-pill st-WAITING_REAPPROVAL">Tasdiq kutilmoqda</span>';

              const rows = est.items
                .map((item) => {
                  const isNew = est.version > 1 && !prevTitles.has(item.title);
                  return `
                    <tr class="${isNew ? 'new-item' : ''}">
                      <td>${isNew ? '+ ' : ''}${item.title}</td>
                      <td style="text-align:right;">${formatMoney(item.price)}</td>
                    </tr>
                  `;
                })
                .join('');

              const deltaNote =
                est.priceDelta > 0
                  ? `<div style="margin-top:8px;font-size:12.5px;color:#b45309;font-weight:700;">
                      Avvalgi versiyaga nisbatan farq: +${formatMoney(est.priceDelta)} va +${est.durationDeltaHours} soat
                    </div>`
                  : '';

              return `
                <div class="est-box ${isLatestPending ? 'latest-pending' : ''}">
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                    <strong>Smeta v${est.version}</strong>
                    ${badgeHtml}
                  </div>
                  <div style="font-size:12.5px;color:#475569;margin-top:6px;">
                    <strong>Diagnostika xulosasi:</strong> ${est.diagnosticNote}
                  </div>
                  <table class="est-table">
                    <thead>
                      <tr><th>Ishlar va ehtiyot qismlar</th><th style="text-align:right;">Narxi</th></tr>
                    </thead>
                    <tbody>
                      ${rows}
                      <tr>
                        <th>Jami (Muddat: ${est.durationHours} soat)</th>
                        <th style="text-align:right;">${formatMoney(est.totalPrice)}</th>
                      </tr>
                    </tbody>
                  </table>
                  ${deltaNote}
                  ${
                    est.rejectionReason
                      ? `<div style="margin-top:8px;font-size:12.5px;color:#b91c1c;font-weight:600;">Rad sababi: «${est.rejectionReason}»</div>`
                      : ''
                  }
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
          <div style="font-weight:800;font-size:15.5px;color:#1e3a8a;">
            Smeta v${latest.version} bo'yicha mijoz qarorini tasdiqlang
          </div>
          <p style="font-size:13px;color:#334155;margin-top:4px;">
            Asosiy biznes qoidasi (BR-P11): Sizning roziligingizsiz yangi xarajatlar bo'yicha ta'mirlash davom ettirilmaydi.
          </p>
          <div class="btn-group">
            <button class="btn btn-success" id="approveEstBtn" onclick="window.App.approveLatest('${order.id}', ${latest.version})">
              ✓ Smeta v${latest.version} ni Tasdiqlash (${formatMoney(latest.totalPrice)})
            </button>
            <button class="btn btn-danger" onclick="window.App.toggleRejectForm()">
              ✕ Smeta v${latest.version} ni Rad etish
            </button>
          </div>
          <div id="rejectFormWrap" style="display:none;margin-top:14px;padding-top:12px;border-top:1px dashed #93c5fd;">
            <label class="form-label" style="color:#991b1b;">Rad etish sababini tanlang yoki yozing:</label>
            <select id="rejectReasonSelect" class="form-control" style="margin-bottom:8px;">
              <option value="Qo'shimcha xarajat shaxsiy budjetimdan oshib ketdi">Qo'shimcha xarajat shaxsiy budjetimdan oshib ketdi</option>
              <option value="Qo'shimcha ta'mir muddati uzoq, qurilma tezroq kerak">Qo'shimcha ta'mir muddati uzoq, qurilma tezroq kerak</option>
              <option value="Hozircha faqat birinchi smetadagi asosiy ishni bajarish yetarli">Hozircha faqat birinchi smetadagi asosiy ishni bajarish yetarli</option>
            </select>
            <button class="btn btn-danger" onclick="window.App.rejectLatest('${order.id}', ${latest.version})">
              Rad etish qarorini yuborish
            </button>
          </div>
        </div>
      `;
    } else if (order.status === 'ESTIMATE_REJECTED') {
      const hasV1 = order.estimates && order.estimates.length > 1;
      actionPanelHtml = `
        <div class="followup-panel">
          <div style="font-weight:800;font-size:15.5px;color:#991b1b;">
            Smeta v${latest ? latest.version : ''} rad etildi — Keyingi amalni tanlang
          </div>
          <p style="font-size:13px;color:#7f1d1d;margin-top:4px;">
            Sabab qayd etildi: <strong>«${latest ? latest.rejectionReason : ''}»</strong>. Jarayon davom etishi uchun quyidagi variantlardan birini tanlang:
          </p>
          <div class="btn-group">
            ${
              hasV1
                ? `<button class="btn btn-primary" onclick="window.App.applyFollowUp('${order.id}', 'CONTINUE_V1')">
                    1. Faqat Smeta v1 (${formatMoney(order.estimates[0].totalPrice)}) bo'yicha davom ettirish
                  </button>`
                : `<button class="btn btn-primary" onclick="window.App.applyFollowUp('${order.id}', 'REQUEST_ALTERNATIVE')">
                    1. Arzonroq analog ehtiyot qism bilan qayta smeta so'rash
                  </button>`
            }
            <button class="btn btn-secondary" onclick="window.App.applyFollowUp('${order.id}', 'CANCEL_AND_PICKUP')">
              2. Ta'mirdan voz kechish va qurilmani olib ketish
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
          <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#64748b;font-weight:700;">
            <span>${h.actor} · ${h.action}</span>
            <span>${formatTime(h.at)}</span>
          </div>
          <div style="margin-top:2px;">${h.detail}</div>
        </div>
      `
      )
      .join('');

    container.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:flex-start;">
          <div>
            <div style="font-size:12.5px;color:#64748b;font-weight:700;">KVITANSIYA ${order.id} · SERIYA: ${order.serialNumber}</div>
            <h2 style="font-size:21px;margin-top:2px;">${order.deviceModel} (${order.deviceType})</h2>
            <div style="font-size:13.5px;color:#475569;margin-top:3px;">
              <strong>Mijoz:</strong> ${order.customerName} (${order.customerPhone}) · <strong>Mas'ul:</strong> ${order.technicianName}
            </div>
          </div>
          <span class="status-pill st-${order.status}" style="font-size:13px;padding:6px 12px;">${order.statusLabel}</span>
        </div>

        <div style="margin-top:12px;padding:11px 14px;background:#f8fafc;border-radius:9px;font-size:13.5px;">
          <strong>Mijoz shikoyati:</strong> ${order.complaint}
          ${
            order.agreedPrice
              ? `<div style="margin-top:4px;color:#15803d;font-weight:700;">Amaldagi kelishilgan narx: ${formatMoney(order.agreedPrice)} (Smeta v${order.agreedVersion})</div>`
              : ''
          }
        </div>

        <div class="timeline-steps">
          <div class="tl-step ${step1Class}">1. Ro'yxatga olindi</div>
          <div class="tl-step ${step2Class}">2. Diagnostika & Smeta</div>
          <div class="tl-step ${step3Class}">3. Mijoz roziligi</div>
          <div class="tl-step ${step4Class}">4. Ta'mir jarayoni</div>
          <div class="tl-step ${step5Class}">5. Topshirishga tayyor</div>
        </div>

        <h3 style="font-size:16px;margin-top:18px;">Smeta versiyalari va narx o'zgarishlari</h3>
        ${estimatesHtml}
        ${actionPanelHtml}

        <h3 style="font-size:15.5px;margin-top:22px;">Jarayon va qarorlar tarixi</h3>
        <div class="history-list">${historyHtml}</div>
      </div>
    `;
  }

  function renderTechnicianPanel() {
    const selectEl = document.getElementById('techOrderSelect');
    if (!selectEl) return;
    selectEl.innerHTML = orders
      .map(
        (o) =>
          `<option value="${o.id}" ${o.id === selectedOrderId ? 'selected' : ''}>${o.id} — ${o.deviceModel} (${o.statusLabel})</option>`
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
      <div style="padding:12px 14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:14px;font-size:13.5px;">
        <strong>Tanlangan qurilma:</strong> ${order.id} · ${order.deviceModel} — <span class="status-pill st-${order.status}">${order.statusLabel}</span>
        <div style="margin-top:4px;color:#475569;">Keyingi yuboriladigan smeta versiyasi: <strong>Smeta v${nextVer}</strong></div>
      </div>
    `;
  }

  function renderAll() {
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
    switchRole(role) {
      activeRole = role;
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
        document.getElementById('estItem2Title').value = 'Ultratovushli tozalash va yig\'ish xizmati';
        document.getElementById('estItem2Price').value = '200000';
      }
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
      showToast(`Buyurtma ${newOrder.id} ro'yxatga olindi!`, false);
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
      showToast("Namoyish ma'lumotlari dastlabki holatga (ORD-101 Smeta v1 va v2) qaytarildi.", false);
      await fetchOrders();
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('searchOrderInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => fetchOrders(e.target.value));
    }
    await detectBackend();
    await fetchOrders();
  });
})();
