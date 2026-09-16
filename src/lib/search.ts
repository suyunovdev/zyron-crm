// Qidiruv normalizatsiyasi (o'zbekcha matn uchun).
//
// Muammo: o'zbekcha ismlarda tutuq belgisi (ʻ) juda ko'p uchraydi — "Toʻlqin",
// "Gʻani", "...oʻgʻli". Bu belgi oddiy apostrof (') EMAS, balki alohida Unicode
// belgi (U+02BB). Bazada "Toʻlqin" saqlanadi, admin esa "tolqin" yoki "to'lqin"
// deb yozadi — belgilar mos kelmaydi va hech narsa topilmaydi.
//
// Yechim: qidiruv paytida ham saqlangan qiymatni, ham so'rovni bir xil ko'rinishga
// keltiramiz — kichik harf + barcha apostrof/tutuq variantlarini olib tashlash +
// ortiqcha bo'shliqlarni siqish. Natijada "toʻlqin" = "to'lqin" = "tolqin".

// Apostrof / tutuq belgisi variantlari: modifier turned comma (U+02BB — rasmiy o'zbek),
// modifier apostrophe (U+02BC), chap/o'ng qo'shtirnoq (U+2018/2019), oddiy apostrof
// (U+0027), grave (U+0060), acute (U+00B4), prime (U+2032).
const APOSTROPHE_VARIANTS = /[ʻʼ‘’'`´′]/g;

/**
 * Matnni qidiruv uchun normallashtiradi. Saqlanadigan `searchName` ustunini
 * to'ldirish uchun ham, kelgan so'rovni tayyorlash uchun ham SHU funksiya ishlatiladi
 * (ikkala tomon bir xil qoidadan o'tishi shart).
 */
export function normalizeSearch(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .replace(APOSTROPHE_VARIANTS, '')
    .replace(/\s+/g, ' ')
    .trim();
}
