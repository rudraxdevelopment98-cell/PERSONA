import { z } from "zod";

/** Quick cards: five one-minute situations a day. Pick A or B, the card flips to show the stronger move. */
export const CARDS_PER_DAY = 5;

export const cardSchema = z.object({
  skill: z.string().describe("One of: Confidence, Communication, Decisions, Emotional intelligence, Assertiveness, Boundaries, Leadership, Critical thinking"),
  situation: z.string().describe("A real everyday situation in one or two short sentences, max 160 characters"),
  a: z.string().describe("Option A, max 80 characters"),
  b: z.string().describe("Option B, max 80 characters"),
  better: z.enum(["a", "b"]).describe("Which option is the stronger, healthier move"),
  why: z.string().describe("One sentence on why, practical and kind, max 160 characters"),
});
export const deckSchema = z.object({ cards: z.array(cardSchema).length(CARDS_PER_DAY) });
export type QuickCard = z.infer<typeof cardSchema>;

export const CARDS_SYSTEM = `You write "Quick cards" for PERSONA 90, a self-development app for adults of every walk of life (students, people with jobs, home-makers, business owners, job seekers).
Each card is a short, real, everyday situation with two plausible reactions. Spread the five cards across different parts of life: family, friends, love and partners, studies, health and habits, money, strangers in public, online, and at most ONE about work. Write for anyone 18+ (students, people with jobs, home-makers, business owners), not only office workers.
One reaction is clearly the healthier, more confident or more skilful move; the other is a common habit that feels natural but works worse.
Mix which letter is better. Vary settings and skills across the five cards. No names of real people or brands. Nothing about self-harm, medical or legal advice.
Keep every field short so it fits on a phone card.`;

/** Used when AI is unavailable: a varied built-in set, rotated by date. */
export const FALLBACK_CARDS: Record<"en" | "hi" | "gu", QuickCard[]> = {
  en: [
    { skill: "Communication", situation: "Your partner keeps checking their phone while you talk about something important.", a: "\"Can we talk for 10 minutes without phones?\"", b: "Stop talking and sulk", better: "a", why: "A clear, small request works better than going silent and hoping they notice." },
    { skill: "Boundaries", situation: "A classmate asks to copy your assignment again.", a: "Say yes to avoid awkwardness", b: "\"I can explain how I did it, but not share the file\"", better: "b", why: "Offering help on your terms keeps the friendship without risking your work." },
    { skill: "Communication", situation: "You need to tell your roommate the kitchen mess bothers you.", a: "\"Can we agree who cleans what?\"", b: "Leave a passive-aggressive note", better: "a", why: "A request about the future fixes the problem without blame." },
    { skill: "Self-discipline", situation: "The doctor said walk 30 minutes a day. You've skipped three days.", a: "Start properly from Monday", b: "Walk just 10 minutes today", better: "b", why: "A small start today beats a perfect plan for later." },
    { skill: "Emotional intelligence", situation: "You get a harsh comment on a project you worked hard on.", a: "Reply immediately to defend it", b: "Wait an hour, then ask what would make it better", better: "b", why: "A pause turns criticism into useful feedback instead of a fight." },
    { skill: "Assertiveness", situation: "A shop gives you the wrong change, short by ₹100.", a: "Calmly point it out and ask for the difference", b: "Let it go, it's awkward", better: "a", why: "A calm, factual ask is normal and usually fixed in seconds." },
    { skill: "Leadership", situation: "Your group's presentation is tomorrow and nobody has started.", a: "Split the slides and set a 9pm check-in", b: "Do it all yourself tonight", better: "a", why: "Dividing the work with a check-in gets it done and keeps everyone involved." },
    { skill: "Critical thinking", situation: "A viral video claims a study shows coffee cures stress.", a: "Share it, it sounds right", b: "Look for the actual study first", better: "b", why: "Checking the source avoids spreading something that isn't true." },
    { skill: "Confidence", situation: "In an interview you're asked about a weakness.", a: "\"I don't have any real weaknesses\"", b: "Name a real one and what you're doing about it", better: "b", why: "An honest weakness with a plan shows self-awareness, which interviewers value." },
    { skill: "Communication", situation: "Your parent keeps asking about your marks during dinner.", a: "\"Can we talk about it after dinner, just us?\"", b: "Get annoyed and leave the table", better: "a", why: "Moving the talk to a better time respects both of you." },
  ],
  hi: [
    { skill: "Communication", situation: "Zaroori baat karte waqt partner baar baar phone dekhta hai.", a: "\"10 minute bina phone ke baat karein?\"", b: "Baat band karke muh phula lo", better: "a", why: "Chhoti, saaf request chup ho jaane se behtar kaam karti hai." },
    { skill: "Boundaries", situation: "Classmate phir se tumhara assignment copy karne ko maangta hai.", a: "Awkwardness se bachne ke liye de do", b: "\"Kaise kiya samjha deta hoon, file nahi\"", better: "b", why: "Apni shart par madad karne se dosti bhi bachti hai aur tumhara kaam bhi." },
    { skill: "Communication", situation: "Roommate ko batana hai ki kitchen ki gandagi pareshan karti hai.", a: "\"Tay kar lein kaun kya saaf karega?\"", b: "Taana maarta hua note chhod do", better: "a", why: "Aage ke liye request karna bina blame ke problem sulajh deta hai." },
    { skill: "Self-discipline", situation: "Doctor ne roz 30 minute walk bola. Teen din se skip ho raha hai.", a: "Monday se pakka shuru", b: "Aaj sirf 10 minute chalo", better: "b", why: "Aaj ki chhoti shuruaat baad ke perfect plan se behtar hai." },
    { skill: "Emotional intelligence", situation: "Mehnat wale project par kisi ka kadwa comment aata hai.", a: "Turant reply karke bachav karo", b: "Ek ghanta ruko, phir pucho kya behtar ho sakta hai", better: "b", why: "Rukne se criticism jhagda nahi, kaam ka feedback ban jaata hai." },
    { skill: "Assertiveness", situation: "Dukaan wala ₹100 kam change deta hai.", a: "Shaanti se batao aur baaki paise maango", b: "Jaane do, awkward lagta hai", better: "a", why: "Shaant, seedhi baat normal hai aur second mein theek ho jaati hai." },
    { skill: "Leadership", situation: "Kal group presentation hai aur kisi ne shuru nahi kiya.", a: "Slides baanto aur raat 9 baje check-in rakho", b: "Aaj raat sab khud kar lo", better: "a", why: "Kaam baant ke check-in rakhne se kaam bhi hota hai aur sab jude rehte hain." },
    { skill: "Critical thinking", situation: "Viral video kehta hai ek study ke hisaab se coffee stress khatam karti hai.", a: "Share kar do, sahi lagta hai", b: "Pehle asli study dhoondo", better: "b", why: "Source check karne se galat baat failne se bachti hai." },
    { skill: "Confidence", situation: "Interview mein pucha jaata hai tumhari weakness kya hai.", a: "\"Meri koi asli weakness nahi\"", b: "Ek sachchi weakness aur uska plan batao", better: "b", why: "Plan ke saath sachchi weakness self-awareness dikhati hai, jo interviewer pasand karte hain." },
    { skill: "Communication", situation: "Dinner par papa baar baar marks ke baare mein puchte hain.", a: "\"Khaane ke baad akele mein baat karein?\"", b: "Chidh ke table se uth jao", better: "a", why: "Baat ko sahi waqt par le jaana dono ki izzat rakhta hai." },
  ],
  gu: [
    { skill: "Communication", situation: "મહત્ત્વની વાત કરતી વખતે જીવનસાથી વારંવાર ફોન જુએ છે.", a: "\"10 મિનિટ ફોન વગર વાત કરીએ?\"", b: "વાત બંધ કરીને મોઢું ફુલાવી દો", better: "a", why: "ચૂપ થઈ જવા કરતાં નાની, સ્પષ્ટ વિનંતી વધુ કામ કરે છે." },
    { skill: "Boundaries", situation: "ક્લાસમેટ ફરી તમારું અસાઇનમેન્ટ કૉપી કરવા માંગે છે.", a: "અણગમો ટાળવા આપી દો", b: "\"કેવી રીતે કર્યું તે સમજાવી દઉં, ફાઇલ નહીં\"", better: "b", why: "પોતાની શરતે મદદ કરવાથી મિત્રતા અને તમારું કામ બંને બચે છે." },
    { skill: "Communication", situation: "રૂમમેટને કહેવું છે કે રસોડાની ગંદકી તમને હેરાન કરે છે.", a: "\"કોણ શું સાફ કરશે તે નક્કી કરી લઈએ?\"", b: "ટોણાવાળી ચિઠ્ઠી મૂકી દો", better: "a", why: "આગળ માટેની વિનંતી દોષ આપ્યા વગર સમસ્યા ઉકેલે છે." },
    { skill: "Self-discipline", situation: "ડૉક્ટરે રોજ 30 મિનિટ ચાલવાનું કહ્યું છે. ત્રણ દિવસથી ચૂકાય છે.", a: "સોમવારથી પાક્કું શરૂ", b: "આજે ફક્ત 10 મિનિટ ચાલો", better: "b", why: "પછીની પરફેક્ટ યોજના કરતાં આજની નાની શરૂઆત સારી." },
    { skill: "Emotional intelligence", situation: "મહેનત કરેલા કામ પર કોઈની કડવી ટિપ્પણી આવે છે.", a: "તરત જવાબ આપીને બચાવ કરો", b: "એક કલાક રાહ જુઓ, પછી પૂછો શું સુધારી શકાય", better: "b", why: "થોભવાથી ટીકા ઝઘડો નહીં, કામનો ફીડબેક બને છે." },
    { skill: "Assertiveness", situation: "દુકાનદાર ₹100 ઓછા છૂટા આપે છે.", a: "શાંતિથી કહો અને બાકીના પૈસા માંગો", b: "જવા દો, અજુગતું લાગે છે", better: "a", why: "શાંત, સીધી વાત સામાન્ય છે અને સેકન્ડોમાં ઠીક થઈ જાય છે." },
    { skill: "Leadership", situation: "કાલે ગ્રુપ પ્રેઝન્ટેશન છે અને કોઈએ શરૂ નથી કર્યું.", a: "સ્લાઇડ વહેંચો અને રાત્રે 9 વાગ્યે ચેક-ઇન રાખો", b: "આજે રાત્રે બધું જાતે કરી લો", better: "a", why: "કામ વહેંચીને ચેક-ઇન રાખવાથી કામ પણ થાય છે અને બધા જોડાયેલા રહે છે." },
    { skill: "Critical thinking", situation: "વાયરલ વીડિયો કહે છે કે એક અભ્યાસ મુજબ કૉફી તણાવ દૂર કરે છે.", a: "શેર કરી દો, સાચું લાગે છે", b: "પહેલાં અસલ અભ્યાસ શોધો", better: "b", why: "સ્રોત ચકાસવાથી ખોટી વાત ફેલાતી અટકે છે." },
    { skill: "Confidence", situation: "સગાંના પ્રસંગમાં કોઈ પૂછે છે \"હજુ શું કરે છે?\" અને બધા જુએ છે.", a: "ટૂંકમાં અને સ્મિત સાથે તમારી યોજના કહો", b: "ધીમેથી \"બસ, ચાલે છે\" કહીને નજર ફેરવો", better: "a", why: "ટૂંકો, સ્પષ્ટ જવાબ તમારો આત્મવિશ્વાસ બતાવે છે અને વાત ત્યાં જ પૂરી થાય છે." },
    { skill: "Communication", situation: "જમતી વખતે પપ્પા વારંવાર માર્ક્સ વિશે પૂછે છે.", a: "\"જમ્યા પછી એકલામાં વાત કરીએ?\"", b: "ચિડાઈને ટેબલ પરથી ઊભા થઈ જાઓ", better: "a", why: "વાતને યોગ્ય સમયે લઈ જવાથી બંનેનું માન સચવાય છે." },
  ],
};

/** Five fallback cards for a date (rotates through the bank). */
export function fallbackDeck(lang: DeckLang, date: string): QuickCard[] {
  const bank = FALLBACK_CARDS[lang];
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  const start = (day * CARDS_PER_DAY) % bank.length;
  return Array.from({ length: CARDS_PER_DAY }, (_, i) => bank[(start + i) % bank.length]);
}

/** Deck language: English for English users, Hinglish for everyone else. */
export type DeckLang = "en" | "hi" | "gu";
/** Deck language: "hi" is the Hinglish deck (shared by Hinglish and Hindi users); other Indian languages get their own deck. */
export const deckLang = (language: string | null | undefined): DeckLang =>
  language === "en" ? "en" : language === "gu" ? "gu" : "hi";
