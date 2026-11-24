/**
 * Notification texts (push + inbox) in every app language. `{0}`, `{1}` are
 * filled in order. Kept short: phones cut push titles at ~50 characters.
 */
import type { Language } from "./languages";

type Msg = Record<Language, string>;

export const MESSAGES = {
  "reminder.episode": { en: "🎬 Episode {0} is waiting", hinglish: "🎬 Episode {0} tumhara wait kar raha hai", hi: "🎬 एपिसोड {0} आपका इंतज़ार कर रहा है", gu: "🎬 એપિસોડ {0} તમારી રાહ જુએ છે" },
  "reminder.season": { en: "🎬 A new season starts today", hinglish: "🎬 Aaj naya season shuru", hi: "🎬 आज नया सीज़न शुरू", gu: "🎬 આજે નવી સીઝન શરૂ" },
  "reminder.ready": { en: "🌱 Your session is ready", hinglish: "🌱 Tumhara session ready hai", hi: "🌱 आपका सेशन तैयार है", gu: "🌱 તમારું સેશન તૈયાર છે" },
  "reminder.body": { en: "30 minutes: a new story, three scenarios and today's mission.", hinglish: "30 minute: nayi kahani, teen scenarios aur aaj ka mission.", hi: "30 मिनट: नई कहानी, तीन परिस्थितियाँ और आज का मिशन।", gu: "30 મિનિટ: નવી વાર્તા, ત્રણ પરિસ્થિતિઓ અને આજનું મિશન." },
  "reminder.streak": { en: "Keep your {0}-day streak going 🔥", hinglish: "Apni {0} din ki streak chalu rakho 🔥", hi: "अपनी {0} दिन की स्ट्रीक जारी रखें 🔥", gu: "તમારી {0} દિવસની સ્ટ્રીક ચાલુ રાખો 🔥" },

  "poll.title": { en: "🗳️ Today's result: {0}% chose like you", hinglish: "🗳️ Aaj ka result: {0}% ne tumhare jaisa chuna", hi: "🗳️ आज का नतीजा: {0}% ने आपके जैसा चुना", gu: "🗳️ આજનું પરિણામ: {0}% એ તમારા જેવું પસંદ કર્યું" },
  "poll.body": { en: "{0} people voted. A new question and 5 new quick cards tomorrow morning.", hinglish: "{0} logon ne vote kiya. Kal subah naya sawaal aur 5 naye quick cards.", hi: "{0} लोगों ने वोट किया। कल सुबह नया सवाल और 5 नए क्विक कार्ड।", gu: "{0} લોકોએ વોટ આપ્યો. કાલે સવારે નવો સવાલ અને 5 નવા ક્વિક કાર્ડ." },

  "referral.title": { en: "🎁 {0} finished their first episode!", hinglish: "🎁 {0} ne pehla episode poora kiya!", hi: "🎁 {0} ने पहला एपिसोड पूरा किया!", gu: "🎁 {0} એ પહેલો એપિસોડ પૂરો કર્યો!" },
  "referral.body": { en: "You both got {0} days of Pro free. Thank you for bringing a friend.", hinglish: "Tum dono ko {0} din Pro free mila. Dost laane ke liye shukriya.", hi: "आप दोनों को {0} दिन Pro मुफ़्त मिला। दोस्त लाने के लिए धन्यवाद।", gu: "તમને બંનેને {0} દિવસ Pro મફત મળ્યું. મિત્રને લાવવા બદલ આભાર." },

  "invite.joinedCircle": { en: "{0} joined {1}", hinglish: "{0} {1} mein jud gaye", hi: "{0} {1} में जुड़ गए", gu: "{0} {1} માં જોડાયા" },
  "invite.accepted": { en: "{0} accepted your invite", hinglish: "{0} ne tumhara invite accept kiya", hi: "{0} ने आपका न्योता स्वीकार किया", gu: "{0} એ તમારું આમંત્રણ સ્વીકાર્યું" },
  "invite.body": { en: "You're now connected on PERSONA 90.", hinglish: "Ab tum PERSONA 90 par jude ho.", hi: "अब आप PERSONA 90 पर जुड़े हैं।", gu: "હવે તમે PERSONA 90 પર જોડાયેલા છો." },

  "friend.request": { en: "👋 {0} wants to be friends", hinglish: "👋 {0} tumse dost banna chahte hain", hi: "👋 {0} आपसे दोस्त बनना चाहते हैं", gu: "👋 {0} તમારી સાથે મિત્ર બનવા માંગે છે" },
  "friend.requestBody": { en: "Open your inbox to accept or decline.", hinglish: "Accept ya decline karne ke liye inbox kholo.", hi: "स्वीकार या अस्वीकार करने के लिए इनबॉक्स खोलें।", gu: "સ્વીકારવા કે નકારવા માટે ઇનબોક્સ ખોલો." },

  "cheer.title": { en: "{0} {1} cheered you", hinglish: "{0} {1} ne tumhe cheer kiya", hi: "{0} {1} ने आपको चीयर किया", gu: "{0} {1} એ તમને ચીયર કર્યા" },
  "race.title": { en: "🏁 {0} started a race: {1}", hinglish: "🏁 {0} ne race shuru ki: {1}", hi: "🏁 {0} ने रेस शुरू की: {1}", gu: "🏁 {0} એ રેસ શરૂ કરી: {1}" },
  "race.body": { en: "{0} Join before it ends!", hinglish: "{0} Khatam hone se pehle judo!", hi: "{0} ख़त्म होने से पहले जुड़ें!", gu: "{0} પૂરી થાય તે પહેલાં જોડાઓ!" },

  "nudge.waiting": { en: "⏳ {0} is waiting for you", hinglish: "⏳ {0} tumhara wait kar rahe hain", hi: "⏳ {0} आपका इंतज़ार कर रहे हैं", gu: "⏳ {0} તમારી રાહ જુએ છે" },
  "nudge.nudged": { en: "👋 {0} nudged you", hinglish: "👋 {0} ne tumhe yaad kiya", hi: "👋 {0} ने आपको याद दिलाया", gu: "👋 {0} એ તમને યાદ કર્યા" },
  "nudge.keep": { en: "Check in today to keep your 🔥{0} friend streak alive.", hinglish: "Aaj check-in karo aur 🔥{0} friend streak bachao.", hi: "आज चेक-इन करें और 🔥{0} फ़्रेंड स्ट्रीक बचाएँ।", gu: "આજે ચેક-ઇન કરો અને 🔥{0} મિત્ર સ્ટ્રીક બચાવો." },
  "nudge.start": { en: "{0} already checked in. Join them today and start a friend streak 🔥", hinglish: "{0} ne check-in kar liya. Aaj saath judo aur friend streak shuru karo 🔥", hi: "{0} ने चेक-इन कर लिया। आज साथ जुड़ें और फ़्रेंड स्ट्रीक शुरू करें 🔥", gu: "{0} એ ચેક-ઇન કરી લીધું. આજે સાથે જોડાઓ અને મિત્ર સ્ટ્રીક શરૂ કરો 🔥" },

  "risk.title": { en: "🔥 Your {0}-day streak with {1} ends tonight", hinglish: "🔥 {1} ke saath {0} din ki streak aaj raat khatam", hi: "🔥 {1} के साथ {0} दिन की स्ट्रीक आज रात ख़त्म", gu: "🔥 {1} સાથેની {0} દિવસની સ્ટ્રીક આજે રાત્રે પૂરી" },
  "risk.body": { en: "{0} already checked in. A 2-minute check-in keeps it alive.", hinglish: "{0} ne check-in kar liya. 2 minute ka check-in streak bacha lega.", hi: "{0} ने चेक-इन कर लिया। 2 मिनट का चेक-इन स्ट्रीक बचा लेगा।", gu: "{0} એ ચેક-ઇન કરી લીધું. 2 મિનિટનું ચેક-ઇન સ્ટ્રીક બચાવી લેશે." },

  "recap.title": { en: "📊 {0} {1}: last week", hinglish: "📊 {0} {1}: pichhla hafta", hi: "📊 {0} {1}: पिछला हफ़्ता", gu: "📊 {0} {1}: ગયું અઠવાડિયું" },
  "recap.checkins": { en: "{0} check-ins", hinglish: "{0} check-ins", hi: "{0} चेक-इन", gu: "{0} ચેક-ઇન" },
  "recap.episodes": { en: "{0} episodes", hinglish: "{0} episodes", hi: "{0} एपिसोड", gu: "{0} એપિસોડ" },
  "recap.fullHouse": { en: "{0} full-house days", hinglish: "{0} din sab aaye", hi: "{0} दिन सब आए", gu: "{0} દિવસ બધા આવ્યા" },
  "recap.yourStreak": { en: "your 🔥{0} streak leads", hinglish: "tumhari 🔥{0} streak sabse aage", hi: "आपकी 🔥{0} स्ट्रीक सबसे आगे", gu: "તમારી 🔥{0} સ્ટ્રીક સૌથી આગળ" },
  "recap.theirStreak": { en: "{0}'s 🔥{1} streak leads", hinglish: "{0} ki 🔥{1} streak sabse aage", hi: "{0} की 🔥{1} स्ट्रीक सबसे आगे", gu: "{0} ની 🔥{1} સ્ટ્રીક સૌથી આગળ" },

  "moment.title": { en: "{0} {1} reacted to your moment", hinglish: "{0} {1} ne tumhare moment par react kiya", hi: "{0} {1} ने आपके मोमेंट पर रिएक्ट किया", gu: "{0} {1} એ તમારી મોમેન્ટ પર રિએક્ટ કર્યું" },
  "moment.body": { en: "Tap to see who else viewed it.", hinglish: "Tap karke dekho aur kisne dekha.", hi: "टैप करके देखें और किसने देखा।", gu: "ટેપ કરીને જુઓ બીજા કોણે જોયું." },

  "gift.title": { en: "🎁 You've got PERSONA 90 Pro", hinglish: "🎁 Tumhe PERSONA 90 Pro mila", hi: "🎁 आपको PERSONA 90 Pro मिला", gu: "🎁 તમને PERSONA 90 Pro મળ્યું" },
  "gift.body": { en: "{0} days of Pro have been added to your account. Enjoy unlimited practice!", hinglish: "Tumhare account mein {0} din Pro jud gaya. Unlimited practice karo!", hi: "आपके अकाउंट में {0} दिन Pro जुड़ गया। असीमित अभ्यास करें!", gu: "તમારા એકાઉન્ટમાં {0} દિવસ Pro ઉમેરાયું. અમર્યાદિત પ્રેક્ટિસ કરો!" },
} satisfies Record<string, Msg>;

export type MessageKey = keyof typeof MESSAGES;

export function msg(lang: string | null | undefined, key: MessageKey, ...args: (string | number)[]): string {
  const m: Msg = MESSAGES[key];
  let out = m[(lang as Language) in m ? (lang as Language) : "en"];
  args.forEach((a, i) => (out = out.split(`{${i}}`).join(String(a))));
  return out;
}
