// WhatsApp click-to-chat helper
// To change the support number, update BUSINESS_WA_NUMBER below (E.164, no +).
// Example for Ghana: country code 233, then local number without leading 0.
// 0548363844 → 233548363844
export const BUSINESS_WA_NUMBER = "233548363844";
export const BUSINESS_WA_DISPLAY = "+233 54 836 3844";

export function whatsappLink(message: string, number: string = BUSINESS_WA_NUMBER) {
  // wa.me is the official short link - deep-links to the WhatsApp app on
  // mobile and opens WhatsApp Web/Desktop on desktop. More reliable than
  // web.whatsapp.com/send which some networks block.
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// Normalize a local Ghana number (e.g. 0548363844) to E.164 without "+"
export function toE164Ghana(local: string): string {
  const digits = local.replace(/\D/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return "233" + digits.slice(1);
  return "233" + digits;
}
