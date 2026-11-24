# TechFix Kabinet (`P11`) — Telefon va noutbuk ta’mirlash servisining mijoz kabineti

> **Fan:** Dasturiy injiniringga kirish (`DIK1305`) · Cyber University (2026–2027 o‘quv yili)  
> **Loyiha kodi:** `P11`  
> **Talaba:** Temirov Dilshod Dilmurod o‘g‘li (`SWE25`)  
> **O‘qituvchi:** Katta o‘qituvchi Ergashev Muhammadsodiq  

---

## 🌐 Jonli Havolalar (Bepul Hosting)

- **Ishlaydigan Yakuniy Mini-Ilova (Demo):** https://dcoderbaza-bot.github.io/p11-servis-mijoz-kabineti/
- **Bosiladigan UI/UX Wireframe Prototipi (01-topshiriq):** https://dcoderbaza-bot.github.io/p11-servis-mijoz-kabineti/prototype.html
- **GitHub Repozitoriy:** https://github.com/dcoderbaza-bot/p11-servis-mijoz-kabineti

---

## 📌 1. Muammo va Loyiha Vazifasi

Qurilmasini (smartfon yoki noutbuk) servis markaziga topshirgan mijoz ta’mir narxi, muddati va joriy holatini bilish uchun servisga qayta-qayta qo‘ng‘iroq qiladi. Usta ichki diagnostikada qo‘shimcha nosozlik topsa, yangi xarajat bo‘yicha mijoz roziligini shaffof qayd etishi kerak.

**Birinchi reliz imkoniyatlari:**
1. **Qabul xodimi** qurilma modeli, seriya raqami va mijoz shikoyatini ro‘yxatga oladi (`ORD-101` kvitansiya).
2. **Usta** tekshiruv natijasi, ishlar ro‘yxati, narx va muddatdan iborat **Smeta v1** va qo‘shimcha nosozlik topilganda **Smeta v2** yaratadi.
3. **Mijoz** shaxsiy kabinetda `Smeta v1` va `Smeta v2` farqini yonma-yon ko‘rib, **Tasdiqlaydi (Qabul)** yoki sababini ko‘rsatib **Rad etadi**.

---

## ⚖️ 2. Asosiy Biznes Qoidasi (`BR-P11`)

> **Qoida ta’rifi:** Ta’mirlash ishini boshlash yoki qo‘shimcha nosozlik topilganda ishni davom ettirish (`IN_PROGRESS`) faqat mijoz tomonidan eng so‘nggi amaldagi smeta versiyasi (`latestVersion`) tasdiqlangandagina ruxsat etiladi.

- **Qabul holati (`APPROVE`):** Mijoz amaldagi `Smeta v2` ni tasdiqlasa, avvalgi `Smeta v1` arxivlanadi (`SUPERSEDED`), yakuniy kelishilgan narx yangilanadi (`1 650 000 so'm`) va buyurtma `IN_PROGRESS` (*«Ta’mirlash jarayonida»*) holatiga o‘tadi.
- **Rad etish holati (`REJECT` va Himoya qoidalari):**
  1. Mijoz `Smeta v2` ni sabab ko‘rsatib rad etsa, qo‘shimcha xarajat to‘xtatiladi (`ESTIMATE_REJECTED`) va mijozga **keyingi aniq amallar** taklif etiladi (*faqat avval tasdiqlangan `Smeta v1` bo‘yicha davom ettirish* yoki *ta’mirdan voz kechib qurilmani olib ketish*).
  2. Usta mijoz hali tasdiqlamagan `Smeta v2` ustida buyurtmani `IN_PROGRESS` / `COMPLETED` ga o‘tkazmoqchi bo‘lsa, server `409 Conflict` (`ERR_UNAPPROVED_ESTIMATE`) bilan amalni bloklaydi.
  3. Yangi `Smeta v2` mavjud bo‘lganda eskirgan `Smeta v1` ni qayta tasdiqlash urinishi `ERR_OUTDATED_VERSION` bilan rad etiladi.

---

## 🏗️ 3. Arxitektura va Loyiha Tuzilmasi

Loyiha **Klient–Server (SPA Frontend + Modul-Monolit Node.js REST API)** arxitekturasi asosida qurilgan. Hujjat va sxemalar [`docs/`](./docs/) katalogida joylashgan:

- [`docs/architecture.svg`](./docs/architecture.svg) — Komponentlar va ma’lumot oqimi diagrammasi
- [`docs/wireframes.svg`](./docs/wireframes.svg) — 4 ta interfeys sxemasi (Wireframes) va foydalanuvchi oqimi
- [`docs/ci-cd-pipeline.svg`](./docs/ci-cd-pipeline.svg) — CI/CD konveyeri va Rollback modeli
- [`src/domain/estimatePolicy.js`](./src/domain/estimatePolicy.js) — `BR-P11` biznes qoidasi moduli
- [`backend/server.js`](./backend/server.js) — Bepul Node.js HTTP REST API serveri (`vercel.json` va `render.yaml` bilan mos)
- [`index.html`](./index.html) / [`prototype.html`](./prototype.html) — Asosiy mini-ilova va interaktiv UI/UX prototip
- [`tests/`](./tests/) — Avtomatlashtirilgan birlik (unit) va HTTP API integratsion testlar

---

## 🚀 4. Lokal Ishga Tushirish va Sinash Tartibi

**Talablar:** Node.js `v18+` (qo‘shimcha pullik paketlar talab etilmaydi).

```bash
# 1. Repozitoriyni yuklab olish
git clone https://github.com/dcoderbaza-bot/p11-servis-mijoz-kabineti.git
cd p11-servis-mijoz-kabineti

# 2. Sintaksis tekshiruvi
npm run lint:check

# 3. Avtomatlashtirilgan testlarni ishga tushirish (Qabul va Rad etish holatlari)
npm test

# 4. Lokal Full-Stack REST API + Veb serverni ishga tushirish
npm start
```

> *Eslatma (Windows PowerShell uchun):* Agar PowerShell’da ExecutionPolicy cheklovi bo‘lsa, `npm.cmd test` va `npm.cmd start` (yoki `node --test tests/*.test.js` va `node backend/server.js`) buyruqlaridan foydalaning.

Server ishga tushgach brauzerda oching:
- **Asosiy ilova:** `http://localhost:3000`
- **UI/UX Prototip:** `http://localhost:3000/prototype.html`
- **Health API:** `http://localhost:3000/api/health`

---

## 🔄 5. Reliz va Avvalgi Versiyaga Qaytish (Rollback) Tartibi

- **Joriy demo versiyasi:** `v1.0.0` (`GitHub Releases` + `GitHub Pages` avtomatik joylashtirish).
- **CI/CD himoyasi:** Har bir `push` va `Pull Request` da `.github/workflows/ci-cd.yml` avtomatik testlarni (`npm test`) ishga tushiradi. Kamida bitta test muvaffaqiyatsiz bo‘lsa, `deploy-release` bosqichi avtomatik to‘xtatiladi.
- **Rollback (Avvalgi versiyaga qaytish) qadamlari:**
  1. Nosoz commit aniqlanganda `main` tarmog‘ida teskari commit yaratiladi:
     ```bash
     git revert HEAD --no-edit
     git push origin main
     ```
  2. GitHub Actions qayta ishga tushib, testlardan o‘tgan barqaror versiyani (`v1.0.0`) avtomatik GitHub Pages’ga tiklaydi.
  3. Favqulodda holatda `GitHub Releases` bo‘limidan avvalgi barqaror `v1.0.0` reliz paketini (`dist/`) yuklab olish mumkin.

---

## 🔍 6. Qisqa Retrospektiva

1. **Nima yaxshi ishladi?**  
   Asosiy biznes qoidasini alohida universal modulda (`src/domain/estimatePolicy.js`) yozish ham Node.js REST API backendida, ham statik GitHub Pages muhitida, ham `tests/estimatePolicy.test.js` avtomatik testlarida 100% bir xil natija olishni ta’minladi.
2. **Qanday qiyinchilik bo‘ldi?**  
   Mijoz `Smeta v2` ni rad etganida buyurtma umuman to‘xtab qolmasligi uchun avval tasdiqlangan `Smeta v1` holatini yo‘qotmaslik masalasi chiqdi. Buni `SUPERSEDED` maqomi va `applyFollowUpAction('CONTINUE_V1')` yechimi orqali hal qildik (`prototype.html` dagi 3B-ekran sxemasi va `TEST-02` sinovi bunga dalil).
3. **Keyingi versiyada (`v1.1`) nimani o‘zgartiramiz?**  
   Telegram Bot webhook bildirishnomasini ulash (yangi `Smeta v2` chiqqanda mijoz telefoniga bir zumda xabar borishi uchun) hamda ehtiyot qismlar ombori qoldig‘i bilan integratsiya qilish rejalashtirilgan.
