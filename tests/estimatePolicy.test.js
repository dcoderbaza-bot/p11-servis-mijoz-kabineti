'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const EstimatePolicy = require('../src/domain/estimatePolicy');
const { getInitialOrders } = require('../data/seedOrders');

function cloneOrd101() {
  return JSON.parse(JSON.stringify(getInitialOrders()[0]));
}

test('TEST-01 [QABUL HOLATI]: Mijoz Smeta v2 ni tasdiqlaganda buyurtma IN_PROGRESS ga o\'tadi va usta ishni davom ettira oladi', () => {
  const order = cloneOrd101();
  assert.equal(order.status, 'WAITING_REAPPROVAL');

  const decisionResult = EstimatePolicy.evaluateCustomerDecision(order, {
    decision: 'APPROVE',
    version: 2,
    comment: 'Yangi 1 650 000 so\'m smetaga roziman'
  });

  assert.equal(decisionResult.accepted, true);
  assert.equal(decisionResult.code, 'ESTIMATE_APPROVED');
  assert.equal(decisionResult.approvedVersion, 2);
  assert.equal(decisionResult.agreedPrice, 1650000);
  assert.equal(order.status, 'IN_PROGRESS');
  assert.equal(order.estimates[0].status, 'SUPERSEDED');
  assert.equal(order.estimates[1].status, 'APPROVED');

  const finishResult = EstimatePolicy.advanceRepairStatus(order, 'COMPLETED');
  assert.equal(finishResult.accepted, true);
  assert.equal(order.status, 'COMPLETED');
});

test('TEST-02 [RAD ETISH HOLATI]: Mijoz Smeta v2 ni rad etganda sabab saqlanadi, qo\'shimcha ish to\'xtatiladi va keyingi amallar qaytariladi', () => {
  const order = cloneOrd101();

  const rejectResult = EstimatePolicy.evaluateCustomerDecision(order, {
    decision: 'REJECT',
    version: 2,
    reason: 'Qo\'shimcha 450 000 so\'m xarajat budjetdan yuqori'
  });

  assert.equal(rejectResult.accepted, false);
  assert.equal(rejectResult.decisionRecorded, true);
  assert.equal(rejectResult.code, 'ESTIMATE_REJECTED');
  assert.equal(order.status, 'ESTIMATE_REJECTED');
  assert.equal(order.estimates[1].status, 'REJECTED');
  assert.equal(order.estimates[1].rejectionReason, 'Qo\'shimcha 450 000 so\'m xarajat budjetdan yuqori');
  assert.ok(rejectResult.nextActions.some((a) => a.id === 'CONTINUE_V1'));
  assert.ok(rejectResult.nextActions.some((a) => a.id === 'CANCEL_AND_PICKUP'));

  // Keyingi amal: faqat tasdiqlangan Smeta v1 bo'yicha davom ettirish
  const followUp = EstimatePolicy.applyFollowUpAction(order, 'CONTINUE_V1');
  assert.equal(followUp.accepted, true);
  assert.equal(order.status, 'IN_PROGRESS_PARTIAL');
  assert.equal(order.agreedPrice, 1200000);
});

test('TEST-03 [RAD ETISH HIMOYASI]: Usta mijoz tasdiqlamagan Smeta v2 ustida ta\'mirni davom ettirmoqchi bo\'lsa tizim rad etadi', () => {
  const order = cloneOrd101();

  const guardResult = EstimatePolicy.advanceRepairStatus(order, 'IN_PROGRESS');
  assert.equal(guardResult.accepted, false);
  assert.equal(guardResult.code, 'ERR_UNAPPROVED_ESTIMATE');
  assert.equal(order.status, 'WAITING_REAPPROVAL');
});

test('TEST-04 [RAD ETISH HIMOYASI]: Yangi Smeta v2 mavjud bo\'lganda eskirgan Smeta v1 ni tasdiqlash urinishi rad etiladi', () => {
  const order = cloneOrd101();

  const outdatedAttempt = EstimatePolicy.evaluateCustomerDecision(order, {
    decision: 'APPROVE',
    version: 1
  });

  assert.equal(outdatedAttempt.accepted, false);
  assert.equal(outdatedAttempt.code, 'ERR_OUTDATED_VERSION');
});
