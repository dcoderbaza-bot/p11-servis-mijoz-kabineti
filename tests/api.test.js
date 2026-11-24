'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAppServer } = require('../backend/server');

async function withServer(fn) {
  const server = createAppServer({ inMemory: true });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('API-01 [INTEGRATSIYA - QABUL]: POST /api/orders/ORD-101/decision orqali Smeta v2 tasdiqlanadi', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/orders/ORD-101/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'APPROVE', version: 2 })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.accepted, true);
    assert.equal(body.order.status, 'IN_PROGRESS');
    assert.equal(body.order.agreedPrice, 1650000);
  });
});

test('API-02 [INTEGRATSIYA - RAD ETISH]: Tasdiqlanmagan Smeta v2 ustida POST /api/orders/ORD-101/status 409 Conflict qaytaradi', async () => {
  await withServer(async (baseUrl) => {
    const blockedRes = await fetch(`${baseUrl}/api/orders/ORD-101/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetStatus: 'COMPLETED' })
    });
    assert.equal(blockedRes.status, 409);
    const blockedBody = await blockedRes.json();
    assert.equal(blockedBody.accepted, false);
    assert.equal(blockedBody.code, 'ERR_UNAPPROVED_ESTIMATE');

    const rejectRes = await fetch(`${baseUrl}/api/orders/ORD-101/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision: 'REJECT',
        version: 2,
        reason: 'Muddat uzoq, faqat ekran almashtirilsin'
      })
    });
    assert.equal(rejectRes.status, 200);
    const rejectBody = await rejectRes.json();
    assert.equal(rejectBody.code, 'ESTIMATE_REJECTED');
    assert.equal(rejectBody.order.status, 'ESTIMATE_REJECTED');
  });
});
