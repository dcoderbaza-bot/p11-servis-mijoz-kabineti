/**
 * P11 — Telefon va noutbuk ta'mirlash servisining mijoz kabineti
 * Asosiy biznes qoidasi moduli (BR-P11: Smeta versiyasi va mijoz roziligi qoidasi)
 *
 * Ushbu modul ham Node.js REST API backendida, ham brauzer mijoz kabinetida,
 * ham avtomatlashtirilgan CI/CD testlarida bir xil ishlaydi.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EstimatePolicy = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const ORDER_STATUS_LABELS = {
    REGISTERED: "Qabul qilindi (Diagnostika kutilmoqda)",
    WAITING_APPROVAL: "Smeta v1 mijoz tasdig'ini kutmoqda",
    IN_PROGRESS: "Smeta tasdiqlandi — Ta'mirlash jarayonida",
    WAITING_REAPPROVAL: "Qo'shimcha nosozlik: Smeta v2 tasdig'i kutilmoqda",
    ESTIMATE_REJECTED: "Smeta rad etildi — Keyingi amal kutilmoqda",
    IN_PROGRESS_PARTIAL: "Faqat Smeta v1 doirasida ta'mirlanmoqda",
    READY_FOR_PICKUP_UNREPAIRED: "Ta'mirdan voz kechildi — Olib ketishga tayyor",
    COMPLETED: "Ta'mirlash yakunlandi — Topshirishga tayyor"
  };

  function calculateTotals(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Smetada kamida bitta ish yoki ehtiyot qism bo'lishi shart.");
    }
    let totalPrice = 0;
    for (const item of items) {
      const price = Number(item.price);
      if (!item.title || String(item.title).trim().length < 2) {
        throw new Error("Har bir smeta bandida ish nomi ko'rsatilishi shart.");
      }
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`"${item.title}" uchun narx musbat son bo'lishi shart.`);
      }
      totalPrice += price;
    }
    return totalPrice;
  }

  function getLatestEstimate(order) {
    if (!order || !Array.isArray(order.estimates) || order.estimates.length === 0) {
      return null;
    }
    return order.estimates[order.estimates.length - 1];
  }

  function compareEstimates(v1, v2) {
    if (!v1 || !v2) return null;
    const v1Titles = new Set(v1.items.map((i) => i.title));
    const addedItems = v2.items.filter((i) => !v1Titles.has(i.title));
    return {
      fromVersion: v1.version,
      toVersion: v2.version,
      oldPrice: v1.totalPrice,
      newPrice: v2.totalPrice,
      priceDelta: v2.totalPrice - v1.totalPrice,
      oldDurationHours: v1.durationHours,
      newDurationHours: v2.durationHours,
      durationDeltaHours: v2.durationHours - v1.durationHours,
      addedItems
    };
  }

  /**
   * Usta tomonidan yangi smeta versiyasini (v1 yoki v2) yaratish
   */
  function createEstimateVersion(order, payload, nowIso) {
    const timestamp = nowIso || new Date().toISOString();
    const durationHours = Number(payload.durationHours);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return {
        accepted: false,
        code: 'ERR_INVALID_DURATION',
        message: "Ta'mirlash muddati (soatlarda) musbat son bo'lishi shart."
      };
    }

    let totalPrice;
    try {
      totalPrice = calculateTotals(payload.items);
    } catch (err) {
      return {
        accepted: false,
        code: 'ERR_INVALID_ITEMS',
        message: err.message
      };
    }

    const previous = getLatestEstimate(order);
    if (previous && previous.status === 'PENDING') {
      return {
        accepted: false,
        code: 'ERR_PENDING_EXISTS',
        message: `Smeta v${previous.version} hali mijoz tomonidan ko'rib chiqilmagan.`
      };
    }

    const nextVersion = previous ? previous.version + 1 : 1;
    const newEstimate = {
      version: nextVersion,
      diagnosticNote: String(payload.diagnosticNote || '').trim() || 'Diagnostika yakunlandi',
      technicianName: String(payload.technicianName || order.technicianName || 'Usta Karimov A.'),
      durationHours,
      totalPrice,
      items: payload.items.map((i) => ({
        title: String(i.title).trim(),
        category: i.category || 'Xizmat / Qism',
        price: Number(i.price)
      })),
      priceDelta: previous ? totalPrice - previous.totalPrice : 0,
      durationDeltaHours: previous ? durationHours - previous.durationHours : 0,
      status: 'PENDING',
      createdAt: timestamp,
      decidedAt: null,
      customerComment: null,
      rejectionReason: null
    };

    order.estimates = order.estimates || [];
    order.estimates.push(newEstimate);
    order.status = nextVersion === 1 ? 'WAITING_APPROVAL' : 'WAITING_REAPPROVAL';
    order.statusLabel = ORDER_STATUS_LABELS[order.status];
    order.history = order.history || [];
    order.history.push({
      at: timestamp,
      actor: 'USTA',
      action: `SMETA_V${nextVersion}_YUBORILDI`,
      detail:
        nextVersion === 1
          ? `Dastlabki Smeta v1 taqdim etildi: ${totalPrice.toLocaleString('ru-RU')} so'm, ${durationHours} soat.`
          : `Qo'shimcha nosozlik aniqlandi. Yangi Smeta v${nextVersion} yuborildi: ${totalPrice.toLocaleString('ru-RU')} so'm (farq: +${(totalPrice - previous.totalPrice).toLocaleString('ru-RU')} so'm).`
    });

    return {
      accepted: true,
      code: `ESTIMATE_V${nextVersion}_CREATED`,
      estimate: newEstimate,
      comparison: previous ? compareEstimates(previous, newEstimate) : null,
      orderStatus: order.status,
      message:
        nextVersion === 1
          ? "Smeta v1 yaratildi va mijoz kabinetiga tasdiqlash uchun yuborildi."
          : `Yangi Smeta v${nextVersion} yaratildi. Mijoz roziligisiz qo'shimcha ish bajarilmaydi.`
    };
  }

  /**
   * ASOSIY BIZNES QOIDASI (BR-P11):
   * Mijozning smeta versiyasi bo'yicha QABUL (APPROVE) yoki RAD ETISH (REJECT) qarorini baholash.
   */
  function evaluateCustomerDecision(order, payload, nowIso) {
    const timestamp = nowIso || new Date().toISOString();
    const latest = getLatestEstimate(order);

    if (!latest) {
      return {
        accepted: false,
        code: 'ERR_NO_ESTIMATE',
        message: "Buyurtma bo'yicha hali smeta shakllantirilmagan.",
        nextActions: []
      };
    }

    const targetVersion = Number(payload.version ?? latest.version);

    // 1-himoya qoidasi: eskirgan smeta versiyasini tasdiqlashni rad etish
    if (targetVersion !== latest.version) {
      return {
        accepted: false,
        code: 'ERR_OUTDATED_VERSION',
        message: `Rad etildi: Smeta v${targetVersion} eskirgan. Qo'shimcha nosozlik tufayli amaldagi Smeta v${latest.version} bo'yicha qaror qabul qiling.`,
        nextActions: [
          {
            id: 'OPEN_LATEST_V' + latest.version,
            label: `Amaldagi Smeta v${latest.version} ni ko'rib chiqish`
          }
        ]
      };
    }

    if (latest.status !== 'PENDING') {
      return {
        accepted: false,
        code: 'ERR_ALREADY_DECIDED',
        message: `Smeta v${latest.version} bo'yicha qaror allaqachon qayd etilgan (${latest.status}).`,
        nextActions: []
      };
    }

    const decision = String(payload.decision || '').toUpperCase();

    // QABUL YO'LI (ACCEPT PATH)
    if (decision === 'APPROVE') {
      order.estimates.forEach((est) => {
        if (est.version < latest.version && est.status === 'APPROVED') {
          est.status = 'SUPERSEDED';
        }
      });
      latest.status = 'APPROVED';
      latest.decidedAt = timestamp;
      latest.customerComment = payload.comment ? String(payload.comment).trim() : "Mijoz narx va muddatga rozilik bildirdi.";

      order.agreedVersion = latest.version;
      order.agreedPrice = latest.totalPrice;
      order.agreedDurationHours = latest.durationHours;
      order.status = 'IN_PROGRESS';
      order.statusLabel = ORDER_STATUS_LABELS[order.status];

      order.history = order.history || [];
      order.history.push({
        at: timestamp,
        actor: 'MIJOZ',
        action: `SMETA_V${latest.version}_TASDIQLANDI`,
        detail: `Mijoz Smeta v${latest.version} ni tasdiqladi (${latest.totalPrice.toLocaleString('ru-RU')} so'm, ${latest.durationHours} soat). Ta'mirlash davom ettirilmoqda.`
      });

      return {
        accepted: true,
        code: 'ESTIMATE_APPROVED',
        approvedVersion: latest.version,
        agreedPrice: latest.totalPrice,
        agreedDurationHours: latest.durationHours,
        orderStatus: order.status,
        statusLabel: order.statusLabel,
        message: `Smeta v${latest.version} muvaffaqiyatli tasdiqlandi! Yakuniy kelishilgan narx: ${latest.totalPrice.toLocaleString('ru-RU')} so'm. Usta ta'mirlashni davom ettiradi.`,
        nextActions: []
      };
    }

    // RAD ETISH YO'LI (REJECT PATH)
    if (decision === 'REJECT') {
      const reason = String(payload.reason || '').trim();
      if (reason.length < 4) {
        return {
          accepted: false,
          code: 'ERR_REASON_REQUIRED',
          message: "Smetani rad etish uchun sababni tanlang yoki kamida 4 ta belgidan iborat izoh kiriting.",
          nextActions: []
        };
      }

      latest.status = 'REJECTED';
      latest.decidedAt = timestamp;
      latest.rejectionReason = reason;

      order.status = 'ESTIMATE_REJECTED';
      order.statusLabel = ORDER_STATUS_LABELS[order.status];

      const previousApproved = order.estimates.find(
        (e) => e.version < latest.version && (e.status === 'APPROVED' || e.status === 'SUPERSEDED')
      );

      const nextActions = previousApproved
        ? [
            {
              id: 'CONTINUE_V1',
              label: `Faqat tasdiqlangan Smeta v${previousApproved.version} (${previousApproved.totalPrice.toLocaleString('ru-RU')} so'm) bo'yicha davom ettirish`
            },
            {
              id: 'CANCEL_AND_PICKUP',
              label: "Ta'mirdan to'liq voz kechish va qurilmani olib ketish vaqtini belgilash"
            }
          ]
        : [
            {
              id: 'REQUEST_ALTERNATIVE',
              label: "Arzonroq analog ehtiyot qism bilan qayta smeta so'rash"
            },
            {
              id: 'CANCEL_AND_PICKUP',
              label: "Ta'mirdan voz kechish va qurilmani olib ketish"
            }
          ];

      order.history = order.history || [];
      order.history.push({
        at: timestamp,
        actor: 'MIJOZ',
        action: `SMETA_V${latest.version}_RAD_ETILDI`,
        detail: `Mijoz Smeta v${latest.version} ni rad etdi. Sabab: "${reason}". Qo'shimcha xarajat to'xtatildi.`
      });

      return {
        accepted: false,
        decisionRecorded: true,
        code: 'ESTIMATE_REJECTED',
        rejectedVersion: latest.version,
        reason,
        orderStatus: order.status,
        statusLabel: order.statusLabel,
        message: `Smeta v${latest.version} rad etildi (Sabab: ${reason}). Qo'shimcha nosozlik bo'yicha ish to'xtatildi — quyidagi keyingi amallardan birini tanlang.`,
        nextActions
      };
    }

    return {
      accepted: false,
      code: 'ERR_UNKNOWN_DECISION',
      message: "Noma'lum qaror turi. Faqat APPROVE yoki REJECT qabul qilinadi.",
      nextActions: []
    };
  }

  /**
   * Rad etishdan keyingi keyingi amalni qo'llash (masalan: faqat v1 bo'yicha davom ettirish yoki olib ketish)
   */
  function applyFollowUpAction(order, actionId, nowIso) {
    const timestamp = nowIso || new Date().toISOString();
    if (order.status !== 'ESTIMATE_REJECTED') {
      return {
        accepted: false,
        code: 'ERR_INVALID_FOLLOWUP_STATE',
        message: "Qo'shimcha amal faqat smeta rad etilgandan so'ng tanlanadi."
      };
    }

    if (actionId === 'CONTINUE_V1') {
      const v1 = order.estimates.find((e) => e.version === 1);
      if (!v1) {
        return {
          accepted: false,
          code: 'ERR_NO_V1',
          message: "Avvalgi Smeta v1 topilmadi."
        };
      }
      v1.status = 'APPROVED';
      order.agreedVersion = v1.version;
      order.agreedPrice = v1.totalPrice;
      order.agreedDurationHours = v1.durationHours;
      order.status = 'IN_PROGRESS_PARTIAL';
      order.statusLabel = ORDER_STATUS_LABELS[order.status];
      order.history.push({
        at: timestamp,
        actor: 'MIJOZ',
        action: 'SMETA_V1_DOIRASIDA_DAVOM_ETTIRISH',
        detail: `Mijoz qo'shimcha v2 ishini rad etib, faqat Smeta v1 (${v1.totalPrice.toLocaleString('ru-RU')} so'm) bo'yicha davom ettirishni tanladi.`
      });
      return {
        accepted: true,
        code: 'CONTINUED_WITH_V1',
        orderStatus: order.status,
        statusLabel: order.statusLabel,
        agreedPrice: order.agreedPrice,
        message: `Buyurtma faqat Smeta v1 (${v1.totalPrice.toLocaleString('ru-RU')} so'm) doirasida davom ettiriladi.`
      };
    }

    if (actionId === 'CANCEL_AND_PICKUP' || actionId === 'REQUEST_ALTERNATIVE') {
      order.status =
        actionId === 'CANCEL_AND_PICKUP' ? 'READY_FOR_PICKUP_UNREPAIRED' : 'REGISTERED';
      order.statusLabel = ORDER_STATUS_LABELS[order.status];
      order.history.push({
        at: timestamp,
        actor: 'MIJOZ',
        action: actionId,
        detail:
          actionId === 'CANCEL_AND_PICKUP'
            ? "Mijoz ta'mirdan voz kechdi. Qurilma olib ketishga tayyorlandi."
            : "Mijoz arzonroq analog ehtiyot qism bo'yicha qayta smeta so'radi."
      });
      return {
        accepted: true,
        code: actionId,
        orderStatus: order.status,
        statusLabel: order.statusLabel,
        message:
          actionId === 'CANCEL_AND_PICKUP'
            ? "Buyurtma to'xtatildi. Qurilmangizni servis qabulxonasidan olib ketishingiz mumkin."
            : "So'rovingiz ustaga yuborildi. Analog qism bo'yicha yangi smeta tayyorlanadi."
      };
    }

    return {
      accepted: false,
      code: 'ERR_UNKNOWN_ACTION',
      message: "Noma'lum keyingi amal tanlandi."
    };
  }

  /**
   * Usta ta'mirlashni davom ettirishi yoki yakunlashi uchun ruxsat tekshiruvi
   */
  function advanceRepairStatus(order, targetStatus, nowIso) {
    const timestamp = nowIso || new Date().toISOString();
    const latest = getLatestEstimate(order);

    if (!latest) {
      return {
        accepted: false,
        code: 'ERR_UNAPPROVED_ESTIMATE',
        message: "Ta'mirni boshlash rad etildi: Smeta hali tuzilmagan."
      };
    }

    const canWork =
      latest.status === 'APPROVED' || order.status === 'IN_PROGRESS_PARTIAL';

    if (!canWork) {
      return {
        accepted: false,
        code: 'ERR_UNAPPROVED_ESTIMATE',
        message: `Biznes qoida xatoligi (BR-P11): Smeta v${latest.version} mijoz tomonidan tasdiqlanmagan (${latest.status})! Mijoz roziligisiz ta'mirni davom ettirish taqiqlanadi.`
      };
    }

    if (targetStatus !== 'IN_PROGRESS' && targetStatus !== 'COMPLETED') {
      return {
        accepted: false,
        code: 'ERR_INVALID_TARGET_STATUS',
        message: "Faqat IN_PROGRESS yoki COMPLETED holatiga o'tkazish mumkin."
      };
    }

    order.status = targetStatus;
    order.statusLabel = ORDER_STATUS_LABELS[targetStatus];
    order.history.push({
      at: timestamp,
      actor: 'USTA',
      action: targetStatus === 'COMPLETED' ? 'TAMIR_YAKUNLANDI' : 'TAMIR_DAVOM_ETMOQDA',
      detail:
        targetStatus === 'COMPLETED'
          ? `Ta'mirlash kelishilgan ${order.agreedPrice.toLocaleString('ru-RU')} so'm smeta asosida yakunlandi.`
          : `Usta tasdiqlangan Smeta v${order.agreedVersion} bo'yicha ishni davom ettirmoqda.`
    });

    return {
      accepted: true,
      code: 'STATUS_UPDATED',
      orderStatus: order.status,
      statusLabel: order.statusLabel,
      message: order.statusLabel
    };
  }

  return {
    ORDER_STATUS_LABELS,
    calculateTotals,
    getLatestEstimate,
    compareEstimates,
    createEstimateVersion,
    evaluateCustomerDecision,
    applyFollowUpAction,
    advanceRepairStatus
  };
});
