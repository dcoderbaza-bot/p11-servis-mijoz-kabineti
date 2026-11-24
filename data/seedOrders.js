/**
 * P11 — Namoyish ssenariysi uchun boshlang'ich buyurtmalar to'plami
 * (Briefdagi namoyish ssenariysiga 100% mos)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SeedOrders = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function getInitialOrders() {
    return [
      {
        id: 'ORD-101',
        customerName: 'Azizov Jasur',
        customerPhone: '+998 90 123 45 67',
        deviceType: 'Smartfon',
        deviceModel: 'iPhone 14 Pro (256 GB)',
        serialNumber: 'SN-IP14P-8841',
        complaint: "Ekran singan, sensor ishlamayapti va telefon tez qizib quvvati tushib ketyapti.",
        technicianName: 'Usta Karimov Anvar',
        createdAt: '2026-11-24T09:00:00+05:00',
        status: 'WAITING_REAPPROVAL',
        statusLabel: "Qo'shimcha nosozlik: Smeta v2 tasdig'i kutilmoqda",
        agreedVersion: 1,
        agreedPrice: 1200000,
        agreedDurationHours: 24,
        estimates: [
          {
            version: 1,
            diagnosticNote: "Tashqi ko'rik: OLED displey moduli darz ketgan, almashtirish talab etiladi.",
            technicianName: 'Usta Karimov Anvar',
            durationHours: 24,
            totalPrice: 1200000,
            items: [
              { title: 'Original OLED ekran moduli (iPhone 14 Pro)', category: 'Ehtiyot qism', price: 1050000 },
              { title: "Displeyni almashtirish va germetik yig'ish", category: 'Ish haqi', price: 150000 }
            ],
            priceDelta: 0,
            durationDeltaHours: 0,
            status: 'APPROVED',
            createdAt: '2026-11-24T09:40:00+05:00',
            decidedAt: '2026-11-24T10:05:00+05:00',
            customerComment: "Ekran almashtirish narxini tasdiqlayman.",
            rejectionReason: null
          },
          {
            version: 2,
            diagnosticNote: "Korpus ochilganda ona platadagi Tristar/Charging IC quvvat kontrollerida qisqa tutashuv aniqlandi. Uni almashtirmasa yangi ekran ham qizib ishdan chiqishi mumkin.",
            technicianName: 'Usta Karimov Anvar',
            durationHours: 36,
            totalPrice: 1650000,
            items: [
              { title: 'Original OLED ekran moduli (iPhone 14 Pro)', category: 'Ehtiyot qism', price: 1050000 },
              { title: "Displeyni almashtirish va germetik yig'ish", category: 'Ish haqi', price: 150000 },
              { title: 'Quvvat kontrolleri mikrosxemasi (Charging IC)', category: 'Qo\'shimcha qism', price: 300000 },
              { title: 'Mikrosxemani BGA kavsharlash va sinov', category: 'Qo\'shimcha ish', price: 150000 }
            ],
            priceDelta: 450000,
            durationDeltaHours: 12,
            status: 'PENDING',
            createdAt: '2026-11-24T11:30:00+05:00',
            decidedAt: null,
            customerComment: null,
            rejectionReason: null
          }
        ],
        history: [
          {
            at: '2026-11-24T09:00:00+05:00',
            actor: 'QABUL_XODIMI',
            action: 'BUYURTMA_OCHILDI',
            detail: "Qurilma qabul qilindi: iPhone 14 Pro. Shikoyat: ekran singan va quvvat tez tushadi."
          },
          {
            at: '2026-11-24T09:40:00+05:00',
            actor: 'USTA',
            action: 'SMETA_V1_YUBORILDI',
            detail: "Dastlabki Smeta v1 taqdim etildi: 1 200 000 so'm, 24 soat."
          },
          {
            at: '2026-11-24T10:05:00+05:00',
            actor: 'MIJOZ',
            action: 'SMETA_V1_TASDIQLANDI',
            detail: "Mijoz ekran almashtirish narxini (1 200 000 so'm) tasdiqladi."
          },
          {
            at: '2026-11-24T11:30:00+05:00',
            actor: 'USTA',
            action: 'SMETA_V2_YUBORILDI',
            detail: "Qo'shimcha nosozlik (Charging IC) topildi. Smeta v2 yuborildi: 1 650 000 so'm (+450 000 so'm, +12 soat)."
          }
        ]
      },
      {
        id: 'ORD-102',
        customerName: 'Rahimova Madina',
        customerPhone: '+998 93 555 22 11',
        deviceType: 'Noutbuk',
        deviceModel: 'ASUS VivoBook 15 OLED',
        serialNumber: 'SN-ASUS-4092',
        complaint: "Noutbuk qizib o'chib qolyapti, sovutish tizimi shovqinli ishlaydi va SSD xotira to'lgan.",
        technicianName: 'Usta Toshmatov Bekzod',
        createdAt: '2026-11-24T10:15:00+05:00',
        status: 'WAITING_APPROVAL',
        statusLabel: "Smeta v1 mijoz tasdig'ini kutmoqda",
        agreedVersion: null,
        agreedPrice: null,
        agreedDurationHours: null,
        estimates: [
          {
            version: 1,
            diagnosticNote: "Kuler podshipnigi yeyilgan, termopasta qurigan. NVMe 512 GB SSD o'rnatish va profilaktika tavsiya etiladi.",
            technicianName: 'Usta Toshmatov Bekzod',
            durationHours: 6,
            totalPrice: 680000,
            items: [
              { title: 'Original ASUS CPU sovutish kuleri', category: 'Ehtiyot qism', price: 220000 },
              { title: 'Kingston NV2 512 GB NVMe SSD', category: 'Ehtiyot qism', price: 380000 },
              { title: 'Profilaktika, termopasta (MX-6) va tizim ko\'chirish', category: 'Ish haqi', price: 80000 }
            ],
            priceDelta: 0,
            durationDeltaHours: 0,
            status: 'PENDING',
            createdAt: '2026-11-24T11:00:00+05:00',
            decidedAt: null,
            customerComment: null,
            rejectionReason: null
          }
        ],
        history: [
          {
            at: '2026-11-24T10:15:00+05:00',
            actor: 'QABUL_XODIMI',
            action: 'BUYURTMA_OCHILDI',
            detail: "ASUS VivoBook 15 OLED qabul qilindi."
          },
          {
            at: '2026-11-24T11:00:00+05:00',
            actor: 'USTA',
            action: 'SMETA_V1_YUBORILDI',
            detail: "Dastlabki Smeta v1 taqdim etildi: 680 000 so'm, 6 soat."
          }
        ]
      },
      {
        id: 'ORD-103',
        customerName: 'Tursunov Sardor',
        customerPhone: '+998 99 777 88 99',
        deviceType: 'Noutbuk',
        deviceModel: 'MacBook Air M2 (13-inch)',
        serialNumber: 'SN-MBA-M2-1190',
        complaint: "Klaviatura ustiga qahva to'kilgan, Space va Enter tugmalari yopishib qolmoqda.",
        technicianName: 'Usta Karimov Anvar',
        createdAt: '2026-11-24T12:10:00+05:00',
        status: 'REGISTERED',
        statusLabel: "Qabul qilindi (Diagnostika kutilmoqda)",
        agreedVersion: null,
        agreedPrice: null,
        agreedDurationHours: null,
        estimates: [],
        history: [
          {
            at: '2026-11-24T12:10:00+05:00',
            actor: 'QABUL_XODIMI',
            action: 'BUYURTMA_OCHILDI',
            detail: "MacBook Air M2 diagnostika navbatiga qo'yildi."
          }
        ]
      }
    ];
  }

  return { getInitialOrders };
});
