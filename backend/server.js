/**
 * P11 — Telefon va noutbuk ta'mirlash servisining mijoz kabineti
 * Zero-dependency Node.js REST API Backend + Static Server
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const EstimatePolicy = require('../src/domain/estimatePolicy');
const { getInitialOrders } = require('../data/seedOrders');

const ROOT_DIR = path.resolve(__dirname, '..');
const RUNTIME_DB_PATH = path.join(ROOT_DIR, 'data', 'runtime-db.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function createStore(options = {}) {
  const inMemory = Boolean(options.inMemory);
  let memoryOrders = null;

  function loadOrders() {
    if (inMemory) {
      if (!memoryOrders) {
        memoryOrders = JSON.parse(JSON.stringify(getInitialOrders()));
      }
      return memoryOrders;
    }
    if (!fs.existsSync(RUNTIME_DB_PATH)) {
      const initial = getInitialOrders();
      fs.mkdirSync(path.dirname(RUNTIME_DB_PATH), { recursive: true });
      fs.writeFileSync(RUNTIME_DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    return JSON.parse(fs.readFileSync(RUNTIME_DB_PATH, 'utf8'));
  }

  function saveOrders(orders) {
    if (inMemory) {
      memoryOrders = orders;
      return;
    }
    fs.mkdirSync(path.dirname(RUNTIME_DB_PATH), { recursive: true });
    fs.writeFileSync(RUNTIME_DB_PATH, JSON.stringify(orders, null, 2), 'utf8');
  }

  function resetOrders() {
    const fresh = JSON.parse(JSON.stringify(getInitialOrders()));
    saveOrders(fresh);
    return fresh;
  }

  return { loadOrders, saveOrders, resetOrders };
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("So'rov hajmi juda katta."));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Noto'g'ri JSON formati yuborildi."));
      }
    });
    req.on('error', reject);
  });
}

function enrichOrder(order) {
  const copy = JSON.parse(JSON.stringify(order));
  if (copy.estimates && copy.estimates.length >= 2) {
    const prev = copy.estimates[copy.estimates.length - 2];
    const curr = copy.estimates[copy.estimates.length - 1];
    copy.latestComparison = EstimatePolicy.compareEstimates(prev, curr);
  } else {
    copy.latestComparison = null;
  }
  return copy;
}

function createRequestHandler(options = {}) {
  const store = createStore(options);

  return async function handleRequest(req, res) {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    try {
      // 1. Health check
      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, {
          status: 'ok',
          projectCode: 'P11',
          service: "Telefon va noutbuk ta'mirlash servisining mijoz kabineti API",
          timestamp: new Date().toISOString()
        });
      }

      // 2. Demo ma'lumotlarini boshlang'ich holatga qaytarish
      if (pathname === '/api/reset' && req.method === 'POST') {
        const fresh = store.resetOrders();
        return sendJson(res, 200, {
          accepted: true,
          message: "Namoyish ma'lumotlari dastlabki holatga qaytarildi.",
          orders: fresh.map(enrichOrder)
        });
      }

      // 3. Barcha buyurtmalarni olish yoki yangi buyurtma ochish
      if (pathname === '/api/orders' && req.method === 'GET') {
        const query = (parsedUrl.searchParams.get('q') || '').trim().toLowerCase();
        let orders = store.loadOrders();
        if (query) {
          orders = orders.filter(
            (o) =>
              o.id.toLowerCase().includes(query) ||
              o.customerName.toLowerCase().includes(query) ||
              o.customerPhone.toLowerCase().includes(query) ||
              o.deviceModel.toLowerCase().includes(query)
          );
        }
        return sendJson(res, 200, { orders: orders.map(enrichOrder) });
      }

      if (pathname === '/api/orders' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const customerName = String(body.customerName || '').trim();
        const customerPhone = String(body.customerPhone || '').trim();
        const deviceType = String(body.deviceType || 'Smartfon').trim();
        const deviceModel = String(body.deviceModel || '').trim();
        const complaint = String(body.complaint || '').trim();

        if (!customerName || !customerPhone || !deviceModel || !complaint) {
          return sendJson(res, 400, {
            accepted: false,
            code: 'ERR_VALIDATION',
            message: "Mijoz ismi, telefoni, qurilma modeli va shikoyat to'ldirilishi shart."
          });
        }

        const orders = store.loadOrders();
        const nextNum = 101 + orders.length;
        const now = new Date().toISOString();
        const newOrder = {
          id: `ORD-${nextNum}`,
          customerName,
          customerPhone,
          deviceType,
          deviceModel,
          serialNumber: String(body.serialNumber || `SN-${nextNum}`).trim(),
          complaint,
          technicianName: String(body.technicianName || 'Usta Karimov Anvar').trim(),
          createdAt: now,
          status: 'REGISTERED',
          statusLabel: EstimatePolicy.ORDER_STATUS_LABELS.REGISTERED,
          agreedVersion: null,
          agreedPrice: null,
          agreedDurationHours: null,
          estimates: [],
          history: [
            {
              at: now,
              actor: 'QABUL_XODIMI',
              action: 'BUYURTMA_OCHILDI',
              detail: `Qurilma qabul qilindi: ${deviceModel}. Shikoyat: ${complaint}`
            }
          ]
        };

        orders.unshift(newOrder);
        store.saveOrders(orders);
        return sendJson(res, 201, {
          accepted: true,
          message: `Buyurtma ${newOrder.id} muvaffaqiyatli ro'yxatga olindi.`,
          order: enrichOrder(newOrder)
        });
      }

      // 4. Bitta buyurtma ustida amallar (/api/orders/:id...)
      const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)(?:\/([^/]+))?$/);
      if (orderMatch) {
        const orderId = decodeURIComponent(orderMatch[1]).toUpperCase();
        const subAction = orderMatch[2] || null;
        const orders = store.loadOrders();
        const order = orders.find((o) => o.id.toUpperCase() === orderId);

        if (!order) {
          return sendJson(res, 404, {
            accepted: false,
            code: 'ERR_NOT_FOUND',
            message: `Buyurtma topilmadi: ${orderId}`
          });
        }

        if (!subAction && req.method === 'GET') {
          return sendJson(res, 200, { order: enrichOrder(order) });
        }

        if (subAction === 'estimates' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = EstimatePolicy.createEstimateVersion(order, body);
          if (!result.accepted) {
            return sendJson(res, 400, result);
          }
          store.saveOrders(orders);
          return sendJson(res, 201, { ...result, order: enrichOrder(order) });
        }

        if (subAction === 'decision' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = EstimatePolicy.evaluateCustomerDecision(order, body);
          if (result.accepted || result.decisionRecorded) {
            store.saveOrders(orders);
            return sendJson(res, 200, { ...result, order: enrichOrder(order) });
          }
          const status = result.code === 'ERR_REASON_REQUIRED' ? 400 : 409;
          return sendJson(res, status, { ...result, order: enrichOrder(order) });
        }

        if (subAction === 'followup' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = EstimatePolicy.applyFollowUpAction(order, body.actionId);
          if (!result.accepted) {
            return sendJson(res, 400, result);
          }
          store.saveOrders(orders);
          return sendJson(res, 200, { ...result, order: enrichOrder(order) });
        }

        if (subAction === 'status' && req.method === 'POST') {
          const body = await readJsonBody(req);
          const result = EstimatePolicy.advanceRepairStatus(order, body.targetStatus);
          if (!result.accepted) {
            return sendJson(res, 409, { ...result, order: enrichOrder(order) });
          }
          store.saveOrders(orders);
          return sendJson(res, 200, { ...result, order: enrichOrder(order) });
        }
      }

      // 5. Statik Frontend va Prototip fayllarini uzatish
      let relativePath = pathname === '/' ? '/index.html' : pathname;
      relativePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
      const filePath = path.join(ROOT_DIR, relativePath);

      if (filePath.startsWith(ROOT_DIR) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        return fs.createReadStream(filePath).pipe(res);
      }

      return sendJson(res, 404, {
        accepted: false,
        message: "Sahifa yoki API manzili topilmadi."
      });
    } catch (err) {
      return sendJson(res, 500, {
        accepted: false,
        code: 'ERR_SERVER',
        message: err.message || 'Ichki server xatoligi'
      });
    }
  };
}

function createAppServer(options = {}) {
  return http.createServer(createRequestHandler(options));
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`[P11 TechFix Kabinet] Server ishga tushdi: http://localhost:${port}`);
    console.log(`[P11 UI/UX Prototip]  http://localhost:${port}/prototype.html`);
  });
}

module.exports = { createAppServer, createRequestHandler };
