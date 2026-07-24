# Admin qo'llanma — Zyron / Aka-Uka Ta'lim Markazi

Bu qo'llanma platformadan foydalanish uchun. Kirish: **crm.akaukalarmarkazi.uz**

## Rollar
| Rol | Nima qiladi |
|-----|-------------|
| **Superadmin** | Tizim egasi: adminlar, oylik, filial, sozlamalar, audit, xavfsizlik |
| **Admin** | Kundalik ish: o'quvchi, ustoz, guruh, to'lov, davomat, lid |
| **Ustoz** | O'z guruhlari, davomat belgilash, o'z maoshi, ticket |
| **O'quvchi** | O'z guruhi, davomati, balansi |
| **Ota-ona** | Farzand(lar) nazorati, ticket |

## 1. O'quvchi qo'shish
**O'quvchilar → "Yangi o'quvchi"** → faqat **ism** (va telefon) kiriting.
- Login/parol **avtomatik** yaratiladi — o'quvchi uchun ham, **ota-ona** uchun ham.
- Yaratilgach oynada **login/parollar** + **QR kodlar** ko'rinadi. Nusxalab yoki QR chop etib topshiring.
- Keyin o'quvchi kartasida ("Login nusxalash" yonida) login/parol va QR doim ko'rinib turadi.

## 2. Guruh yaratish va o'quvchi biriktirish
**Guruhlar → "Yangi guruh"** → nomi, fani, ustoz, narx, oyiga darslar, kun turi, vaqt.
- Darslar **avtomatik** 12 oyga generatsiya qilinadi.
- O'quvchini biriktirish: o'quvchi kartasida **"Guruhga qo'shish"**.

## 3. To'lov qabul qilish
O'quvchi kartasida **"+ Hisobni to'ldirish"** → summa, oy, usul (naqd/karta/o'tkazma).
- Balans avtomatik hisoblanadi: **to'langan − (hisoblangan darslar × dars narxi)**.

## 4. Davomat (ustoz)
Ustoz o'z guruhida davomat belgilaydi — **dars kuni oxirigacha** (ertasi 00:00 gacha).
- **Sababsiz ketma-ket ≤3 yo'qlik** — o'quvchidan pul yechiladi, ustozga oylik yoziladi (joy band).
- **>3 yo'qlik** — o'quvchi **avto-muzlatiladi**, adminga xabar boradi, billing to'xtaydi.
- Muhlatdan keyin faqat admin tuzatadi.

## 5. Ustoz oyligi (superadmin)
**Oylik** — har ustoz: tushum × ulush% (standart 70%). Oyni tanlab ko'rish mumkin.
- Ustoz o'z maoshini profil (yuqori o'ng burchak) → "Profil va maosh"da ko'radi — kunlik taqsimot bilan.

## 6. Ticketlar (so'rovlar)
Ustoz **Admin** yoki **o'quvchi ota-onasiga** ticket (so'rov/muammo) yozadi — thread (yozishma) bilan.
- Yangi javob bo'lsa sidebarda **qizil badge** chiqadi.

## 7. Superadmin bo'limlari
- **Adminlar** — admin/superadmin akkauntlari (yaratish, muzlatish, o'chirish)
- **Audit** — kim nima o'zgartirgani jurnali
- **Tizim** — sozlamalar (standart narx/ulush), analitika, filiallar, tarqatma, impersonation, zaxira, xavfsizlik, xavfli zona

## 8. Statuslar
- **Aktiv** — normal
- **Muzlatilgan** — vaqtincha to'xtatilgan (billing to'xtaydi)
- **Arxivlangan** — o'chirilgan (ro'yxatdan yashiriladi)

## Yordam / texnik
- Vaqt: O'zbekiston (Asia/Tashkent)
- Zaxira: har kuni avtomatik (03:00)
- Deploy/texnik: `docs/DEPLOYMENT.md`
