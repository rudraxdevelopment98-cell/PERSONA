import { DEPTH_INFO, type AssessmentDepth } from "./assessment";

type Lang = "en" | "hinglish" | "hi" | "gu";

type DepthCopy = { name: string; tagline: string; detail: string };
type Copy = {
  pickTitle: string;
  pickHint: string;
  questions: (n: number) => string;
  minutes: (n: number) => string;
  recommended: string;
  start: string;
  depths: Record<AssessmentDepth, DepthCopy>;
  optional: string;
  changeLength: string;
  lengthLabel: (d: AssessmentDepth) => string;
  deeperTitle: string;
  deeperText: (days: number) => string;
  deeperButton: (d: AssessmentDepth, extra: number) => string;
  deeperIntro: (d: AssessmentDepth, extra: number) => string;
  basedOn: (d: AssessmentDepth) => string;
};

const en: Copy = {
  pickTitle: "How deep do you want to go?",
  pickHint: "Pick what fits your time. You can switch while answering, and go deeper later without repeating anything.",
  questions: (n) => `${n} questions`,
  minutes: (n) => `~${n} min`,
  recommended: "Recommended",
  start: "Start",
  depths: {
    quick: { name: "Quick check", tagline: "A fast first read", detail: "One real-life situation per skill. Good for getting started today - scores are a rough guide." },
    standard: { name: "Standard", tagline: "Balanced and reliable", detail: "Three questions per skill, mixing situations and habits. The best balance of time and accuracy." },
    deep: { name: "Deep analysis", tagline: "The most accurate picture", detail: "Every question, four per skill, plus two short reflections. Gives your coach and stories the most to work with." },
  },
  optional: "(optional)",
  changeLength: "Change length",
  lengthLabel: (d) => `${en.depths[d].name} · ${DEPTH_INFO[d].questions} questions`,
  deeperTitle: "Want a more accurate profile?",
  deeperText: (days) => `Answer a few more questions and your scores and profile are rebuilt with more evidence. Your earlier answers are kept. Available for your first ${days} days, so your growth is measured from an honest starting point.`,
  deeperButton: (d, extra) => `${en.depths[d].name} · +${extra} questions`,
  deeperIntro: (d, extra) => `Going deeper: ${extra} new questions to reach ${en.depths[d].name}. Your earlier answers are already counted.`,
  basedOn: (d) => `Based on the ${en.depths[d].name.toLowerCase()} (${DEPTH_INFO[d].perSkill} question${DEPTH_INFO[d].perSkill === 1 ? "" : "s"} per skill).`,
};

const hinglish: Copy = {
  pickTitle: "Kitna deep jaana chahte ho?",
  pickHint: "Apne time ke hisaab se chuno. Beech mein badal sakte ho, aur baad mein bina kuch repeat kiye aur deep ja sakte ho.",
  questions: (n) => `${n} sawaal`,
  minutes: (n) => `~${n} min`,
  recommended: "Recommended",
  start: "Shuru karo",
  depths: {
    quick: { name: "Quick check", tagline: "Jaldi pehla andaaza", detail: "Har skill par ek real-life situation. Aaj shuru karne ke liye badhiya - scores ek rough guide hain." },
    standard: { name: "Standard", tagline: "Balanced aur bharosemand", detail: "Har skill par teen sawaal - situations aur aadatein dono. Time aur accuracy ka best balance." },
    deep: { name: "Deep analysis", tagline: "Sabse sahi tasveer", detail: "Saare sawaal, har skill par chaar, aur do chhote reflection. Coach aur stories ko sabse zyada samajh milti hai." },
  },
  optional: "(optional)",
  changeLength: "Length badlo",
  lengthLabel: (d) => `${hinglish.depths[d].name} · ${DEPTH_INFO[d].questions} sawaal`,
  deeperTitle: "Aur accurate profile chahiye?",
  deeperText: (days) => `Thode aur sawaalon ke jawab do - aapke scores aur profile zyada evidence ke saath dobara banenge. Pehle ke jawab saved rahenge. Ye pehle ${days} din tak hi available hai, taaki aapki growth ek sachche starting point se naapi jaaye.`,
  deeperButton: (d, extra) => `${hinglish.depths[d].name} · +${extra} sawaal`,
  deeperIntro: (d, extra) => `Aur deep: ${hinglish.depths[d].name} ke liye ${extra} naye sawaal. Aapke pehle ke jawab already count ho chuke hain.`,
  basedOn: (d) => `${hinglish.depths[d].name} par based (har skill par ${DEPTH_INFO[d].perSkill} sawaal).`,
};

const hi: Copy = {
  pickTitle: "आप कितनी गहराई से आकलन करना चाहते हैं?",
  pickHint: "अपने समय के हिसाब से चुनें। बीच में बदल सकते हैं, और बाद में बिना कुछ दोहराए और गहराई में जा सकते हैं।",
  questions: (n) => `${n} प्रश्न`,
  minutes: (n) => `~${n} मिनट`,
  recommended: "सुझाया गया",
  start: "शुरू करें",
  depths: {
    quick: { name: "त्वरित जाँच", tagline: "जल्दी पहला अंदाज़ा", detail: "हर क्षमता पर एक वास्तविक स्थिति। आज शुरू करने के लिए अच्छा - अंक एक मोटा अनुमान हैं।" },
    standard: { name: "मानक", tagline: "संतुलित और भरोसेमंद", detail: "हर क्षमता पर तीन प्रश्न - स्थितियाँ और आदतें दोनों। समय और सटीकता का सबसे अच्छा संतुलन।" },
    deep: { name: "गहन विश्लेषण", tagline: "सबसे सटीक तस्वीर", detail: "सभी प्रश्न, हर क्षमता पर चार, और दो छोटे विचार। कोच और कहानियों को सबसे ज़्यादा समझ मिलती है।" },
  },
  optional: "(वैकल्पिक)",
  changeLength: "लंबाई बदलें",
  lengthLabel: (d) => `${hi.depths[d].name} · ${DEPTH_INFO[d].questions} प्रश्न`,
  deeperTitle: "और सटीक प्रोफ़ाइल चाहिए?",
  deeperText: (days) => `कुछ और प्रश्नों के जवाब दें - आपके अंक और प्रोफ़ाइल ज़्यादा जानकारी के साथ दोबारा बनेंगे। पहले के जवाब सुरक्षित रहेंगे। यह पहले ${days} दिनों तक ही उपलब्ध है, ताकि आपकी प्रगति एक सच्चे शुरुआती बिंदु से मापी जाए।`,
  deeperButton: (d, extra) => `${hi.depths[d].name} · +${extra} प्रश्न`,
  deeperIntro: (d, extra) => `और गहराई: ${hi.depths[d].name} के लिए ${extra} नए प्रश्न। आपके पहले के जवाब पहले ही गिने जा चुके हैं।`,
  basedOn: (d) => `${hi.depths[d].name} पर आधारित (हर क्षमता पर ${DEPTH_INFO[d].perSkill} प्रश्न)।`,
};

const gu: Copy = {
  pickTitle: "તમે કેટલું ઊંડું મૂલ્યાંકન કરવા માંગો છો?",
  pickHint: "તમારા સમય મુજબ પસંદ કરો. જવાબ આપતાં વચ્ચે બદલી શકો છો, અને પછી કંઈ ફરી કર્યા વગર વધુ ઊંડા જઈ શકો છો.",
  questions: (n) => `${n} પ્રશ્નો`,
  minutes: (n) => `~${n} મિનિટ`,
  recommended: "સૂચવેલું",
  start: "શરૂ કરો",
  depths: {
    quick: { name: "ઝડપી ચેક", tagline: "ઝડપી પહેલો અંદાજ", detail: "દરેક કુશળતા પર એક અસલ પરિસ્થિતિ. આજે શરૂ કરવા માટે સારું - સ્કોર એક અંદાજ છે." },
    standard: { name: "સામાન્ય", tagline: "સંતુલિત અને ભરોસાપાત્ર", detail: "દરેક કુશળતા પર ત્રણ પ્રશ્નો - પરિસ્થિતિઓ અને આદતો બંને. સમય અને ચોકસાઈનું સૌથી સારું સંતુલન." },
    deep: { name: "ઊંડું વિશ્લેષણ", tagline: "સૌથી ચોક્કસ ચિત્ર", detail: "બધા પ્રશ્નો, દરેક કુશળતા પર ચાર, અને બે ટૂંકા વિચાર. કોચ અને વાર્તાઓને સૌથી વધુ સમજ મળે છે." },
  },
  optional: "(વૈકલ્પિક)",
  changeLength: "લંબાઈ બદલો",
  lengthLabel: (d) => `${gu.depths[d].name} · ${DEPTH_INFO[d].questions} પ્રશ્નો`,
  deeperTitle: "વધુ ચોક્કસ પ્રોફાઇલ જોઈએ છે?",
  deeperText: (days) => `થોડા વધુ પ્રશ્નોના જવાબ આપો - તમારા સ્કોર અને પ્રોફાઇલ વધુ પુરાવા સાથે ફરી બનશે. પહેલાંના જવાબ સચવાયેલા રહેશે. આ પહેલા ${days} દિવસ સુધી જ મળે છે, જેથી તમારી પ્રગતિ સાચી શરૂઆતથી મપાય.`,
  deeperButton: (d, extra) => `${gu.depths[d].name} · +${extra} પ્રશ્નો`,
  deeperIntro: (d, extra) => `વધુ ઊંડાણ: ${gu.depths[d].name} માટે ${extra} નવા પ્રશ્નો. તમારા પહેલાંના જવાબ ગણાઈ ગયા છે.`,
  basedOn: (d) => `${gu.depths[d].name} પર આધારિત (દરેક કુશળતા પર ${DEPTH_INFO[d].perSkill} પ્રશ્ન).`,
};

export function depthCopy(lang: Lang): Copy {
  return lang === "gu" ? gu : lang === "hi" ? hi : lang === "hinglish" ? hinglish : en;
}
