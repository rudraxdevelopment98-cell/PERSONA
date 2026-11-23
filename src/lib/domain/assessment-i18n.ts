import type { Dimension } from "./dimensions";

/**
 * Translations of the baseline assessment. Item ids, option order and option
 * values are shared with assessment.ts, so scoring is identical in every language.
 */
export type AssessmentLang = "en" | "hinglish" | "hi";

type ItemText = { text: string; options?: string[] };

type Pack = {
  likert: [string, string, string, string, string];
  dimensions: Record<Dimension, string>;
  ui: {
    part: string;
    of: string;
    finalPart: string;
    heldBack: string;
    goal: string;
    privateNote: string;
    back: string;
    continue: string;
    finish: string;
    building: string;
    saving: string;
    saved: string;
    welcomeBack: (n: number) => string;
  };
  items: Record<string, ItemText>;
};

const hinglish: Pack = {
  likert: ["Lagbhag kabhi nahi", "Kabhi-kabhaar", "Kabhi-kabhi", "Aksar", "Lagbhag hamesha"],
  dimensions: {
    confidence: "Self-confidence",
    communication: "Communication",
    decision_making: "Decision-making",
    emotional_intelligence: "Emotional intelligence",
    social_intelligence: "Social intelligence",
    assertiveness: "Assertiveness",
    independent_thinking: "Independent thinking",
    critical_thinking: "Critical thinking",
    leadership: "Leadership",
    self_discipline: "Self-discipline",
  },
  ui: {
    part: "Part",
    of: "of",
    finalPart: "Last part · Apne shabdon mein",
    heldBack: "Haal hi ki koi situation batao jab aapne kuch kehne ya karne se khud ko roka. Aapko kis cheez ne roka?",
    goal: "90 din baad aap apni soch ya behaviour mein kya fark dekhna chahte ho?",
    privateNote: "Ye jawab aapki profile aur stories ko personal banate hain. Ye kabhi share nahi hote.",
    back: "Peeche",
    continue: "Aage badho",
    finish: "Assessment poora karo",
    building: "Aapki profile ban rahi hai…",
    saving: "Save ho raha hai…",
    saved: "Saved",
    welcomeBack: (n) => `Welcome back - aapke pehle ke ${n} jawab saved hain. Wahin se continue karo.`,
  },
  items: {
    conf_1: { text: "Jab kisi group mein (dost, family, class ya kaam) mere paas koi idea hota hai, toh main kisi aur ke pehle bolne ka wait kiye bina use share karta/karti hoon." },
    conf_2: { text: "Baat-cheet ke baad main use dimaag mein baar-baar replay karta/karti hoon, ye soch kar ki maine kaisa impression diya." },
    conf_3: { text: "Main naye kaam try karta/karti hoon, chahe sabke saamne fail hone ka risk ho." },
    conf_sj: {
      text: "Koi sabke saamne aapke kiye kisi kaam ki tareef karta hai. Aapka pehla reaction kya hota hai?",
      options: [
        "Taal deta/deti hoon - kehta/kehti hoon ki ye luck tha ya kisi aur ki help thi",
        "Ajeeb lagta hai aur jaldi se topic badal deta/deti hoon",
        "Thank you bolta/bolti hoon, phir baad mein sochta/sochti hoon ki main iske laayak nahi tha",
        "Thank you bolta/bolti hoon aur short mein batata/batati hoon ki maine kya achha kiya",
      ],
    },
    comm_1: { text: "Main complex idea ko itne simple tarike se samjha sakta/sakti hoon ki doosre field ka insaan bhi samajh jaye." },
    comm_2: { text: "Bolte waqt main apna point bhool jaata/jaati hoon ya ghuma-phira kar bolta/bolti hoon." },
    comm_3: { text: "Jawab dene se pehle main check karta/karti hoon ki maine saamne wale ko sahi samjha ya nahi." },
    comm_sj: {
      text: "Koi dost ya ghar ka insaan baar-baar kuch aisa karta hai jo aapko pareshan karta hai (hamesha late aana, bina pooche cheezein le jaana). Aap sabse zyada kya karoge?",
      options: [
        "Kuch nahi bolunga/bolungi aur khud hi adjust kar lunga/lungi",
        "Ishaaron mein bolunga/bolungi aur ummeed karunga/karungi ki wo samajh jayein",
        "Shaanti se bataunga/bataungi ki kya ho raha hai, mujh par kya asar hai, aur kya karne se madad milegi",
        "Kisi aur se unki shikayat karunga/karungi",
      ],
    },
    dec_1: { text: "Roz ke chhote decisions main jaldi le leta/leti hoon aur baad mein khud pe shak nahi karta/karti." },
    dec_2: { text: "Galat choice ke darr se main important decisions ko taal deta/deti hoon." },
    dec_3: { text: "Bade decision se pehle main kam se kam do realistic options par sochta/sochti hoon." },
    dec_sj: {
      text: "48 ghante mein do achhe options mein se ek chunna hai (koi course, shehar, job ya badi khareed). Aapka tarika kaunsa hai?",
      options: [
        "Kai logon se poochta/poochti hoon aur majority ki baat maan leta/leti hoon",
        "Mere liye kya sabse zaroori hai uski list banata/banati hoon, dono options compare karke decide karta/karti hoon",
        "Last moment tak wait karta/karti hoon ki jawab apne aap clear ho jaye",
        "Bina zyada soche sasta ya zyada popular wala chun leta/leti hoon",
      ],
    },
    ei_1: { text: "Main apni exact feeling ka naam le sakta/sakti hoon (jaise 'disappointed', na ki bas 'bura lag raha hai')." },
    ei_2: { text: "Pareshan hone par main aisi baatein bol ya kar deta/deti hoon jinka baad mein pachtawa hota hai." },
    ei_3: { text: "Mujhe pata chalta hai ki mera mood doosron ke saath mere behaviour ko kaise affect kar raha hai." },
    ei_sj: {
      text: "Raat ko aapko ek rude, critical message aata hai (ghar, dost, teacher ya kaam se). Aap aam taur par kya karte ho?",
      options: [
        "Gussa taaza rehte hi turant reply kar deta/deti hoon",
        "Reply nahi karta/karti, poori raat usi ke baare mein sochta/sochti rehta/rehti hoon",
        "Frustration ko notice karta/karti hoon, subah tak rukta/rukti hoon, phir asli baat ka jawab deta/deti hoon",
        "Decide karne se pehle kisi dost ko forward karke shikayat karta/karti hoon",
      ],
    },
    soc_1: { text: "Bina bole bhi mujhe samajh aa jaata hai ki koi uncomfortable hai." },
    soc_2: { text: "Meri kahi baat par logon ke reaction se main hairaan reh jaata/jaati hoon." },
    soc_3: { text: "Kisse baat kar raha/rahi hoon, uske hisaab se main apna baat karne ka tarika badalta/badalti hoon." },
    soc_sj: {
      text: "Group discussion mein ek shaant member baar-baar bolna shuru karta hai aur log use beech mein kaat dete hain. Aap:",
      options: [
        "Notice nahi karte - aapka dhyaan topic par hai",
        "Notice karte ho par beech mein nahi padte",
        "Baat rok kar unhe apna point poora karne ke liye bolte ho",
        "Baad mein unse akele mein iske baare mein baat karte ho",
      ],
    },
    asr_1: { text: "Jab mere paas time nahi hota ya main nahi karna chahta/chahti, toh main 'na' bol deta/deti hoon." },
    asr_2: { text: "Jhagde se bachne ke liye main cheezon ke liye haan bol deta/deti hoon." },
    asr_3: { text: "Mujhe lagta hai log disagree karenge, phir bhi main apni raay rakhta/rakhti hoon." },
    asr_sj: {
      text: "Jab bhi aapka group kuch plan karta hai, ek dost aapke ideas ko apna bata deta hai. Aap:",
      options: [
        "Jaane dete ho - tension lene layak nahi",
        "Bina wajah bataye unse rookha behave karne lagte ho",
        "Akele mein baat karte ho, kya hua wo batate ho, aur agli baar kya expect karte ho wo bolte ho",
        "Agli baar gusse se sabke saamne unhe tok dete ho",
      ],
    },
    ind_1: { text: "Doosre kya sochte hain ye jaanne se pehle main apni khud ki raay banata/banati hoon." },
    ind_2: { text: "Main apni raay zyada tar isliye badal deta/deti hoon kyunki aas-paas ke log disagree karte hain." },
    ind_3: { text: "Dost ya family se alag raay rakhne mein mujhe koi dikkat nahi hoti." },
    ind_sj: {
      text: "Aapka poora group (dost, family ya team) ek plan ko support kar raha hai, par aapko usme ek badi kami dikh rahi hai. Aap:",
      options: [
        "Maan lete ho ki sab sahi honge kyunki sab agree kar rahe hain",
        "Chup rehte ho par andar se bechaini hoti hai",
        "Kami ko reason ke saath clearly batate ho aur counter-arguments ke liye open rehte ho",
        "Sirf tab bolte ho jab koi seedha aapse pooche",
      ],
    },
    crit_1: { text: "Koi bada daawa sunne par main poochta/poochti hoon ki iska saboot kya hai." },
    crit_2: { text: "Jo baatein meri pehle wali soch se match karti hain, unhe main bina check kiye maan leta/leti hoon." },
    crit_3: { text: "Main dekhta/dekhti hoon ki kisi plan mein kya galat ho sakta hai - apne plan mein bhi." },
    crit_sj: {
      text: "Ek viral post kehta hai ki ek nayi habit se kisi ki productivity double ho gayi. Aap:",
      options: [
        "Turant wo habit shuru kar dete ho",
        "Bina soche ignore kar dete ho",
        "Try karne se pehle poochte ho ki kya measure hua, kaise, aur kya ye aap par apply hoga",
        "Pehle doston ke saath share karte ho",
      ],
    },
    lead_1: { text: "Jab group atak jaata hai, toh main aage badhne ka raasta suggest karta/karti hoon." },
    lead_2: { text: "Jo kaam maine lead kiya ho, usme gadbad hone par main sabke saamne zimmedari leta/leti hoon." },
    lead_3: { text: "Main khud organise kar sakta/sakti hoon, phir bhi wait karta/karti hoon ki koi aur kare." },
    lead_sj: {
      text: "Group ka koi plan (trip, ghar ka function, college ya kaam ka project) bina kisi organiser ke bhatak raha hai. Aap:",
      options: [
        "Apna hissa karte rehte ho aur wait karte ho",
        "Shikayat karte ho ki koi organise nahi kar raha",
        "Ek simple plan propose karte ho aur coordinate karne ki offer dete ho",
        "Kisi bade ya senior se kehte ho ki wo zimmedari le",
      ],
    },
    disc_1: { text: "Mann na ho tab bhi main din ke liye jo plan kiya wo karta/karti hoon." },
    disc_2: { text: "Main personal goals josh se shuru karta/karti hoon aur kuch hafton mein chhod deta/deti hoon." },
    disc_3: { text: "Khud se kiye vaade main utni hi seriously nibhata/nibhati hoon jitna doosron se kiye." },
    disc_sj: {
      text: "Aaj raat aapne ek ghanta focused padhai plan ki thi, par aap thake ho aur dost bahar bula raha hai. Aap:",
      options: [
        "Bahar chale jaate ho - baad mein cover kar loge",
        "Ghar par rukte ho par phone scroll karte reh jaate ho",
        "Pehle ek chhota focused session karte ho, phir decide karte ho",
        "Jo bhi chuno, guilt feel karte ho",
      ],
    },
  },
};

const hi: Pack = {
  likert: ["लगभग कभी नहीं", "शायद ही कभी", "कभी-कभी", "अक्सर", "लगभग हमेशा"],
  dimensions: {
    confidence: "आत्मविश्वास",
    communication: "संवाद",
    decision_making: "निर्णय लेना",
    emotional_intelligence: "भावनात्मक समझ",
    social_intelligence: "सामाजिक समझ",
    assertiveness: "दृढ़ता",
    independent_thinking: "स्वतंत्र सोच",
    critical_thinking: "आलोचनात्मक सोच",
    leadership: "नेतृत्व",
    self_discipline: "आत्म-अनुशासन",
  },
  ui: {
    part: "भाग",
    of: "में से",
    finalPart: "आख़िरी भाग · अपने शब्दों में",
    heldBack: "हाल की कोई स्थिति बताइए जब आपने कुछ कहने या करने से ख़ुद को रोका। आपको किस बात ने रोका?",
    goal: "90 दिन बाद आप अपनी सोच या व्यवहार में क्या बदलाव देखना चाहते हैं?",
    privateNote: "ये जवाब आपकी प्रोफ़ाइल और कहानियों को व्यक्तिगत बनाते हैं। इन्हें कभी साझा नहीं किया जाता।",
    back: "पीछे",
    continue: "आगे बढ़ें",
    finish: "आकलन पूरा करें",
    building: "आपकी प्रोफ़ाइल बन रही है…",
    saving: "सेव हो रहा है…",
    saved: "सेव हो गया",
    welcomeBack: (n) => `वापसी पर स्वागत है - आपके पहले के ${n} जवाब सेव हैं। वहीं से आगे बढ़ें।`,
  },
  items: {
    conf_1: { text: "किसी ग्रुप में (दोस्त, परिवार, क्लास या काम) कोई विचार आने पर मैं किसी और के पहले बोलने का इंतज़ार किए बिना उसे साझा करता/करती हूँ।" },
    conf_2: { text: "बातचीत के बाद मैं उसे बार-बार मन में दोहराता/दोहराती हूँ और सोचता/सोचती हूँ कि मैं कैसा लगा/लगी।" },
    conf_3: { text: "मैं नए काम आज़माता/आज़माती हूँ, भले ही सबके सामने असफल होने का डर हो।" },
    conf_sj: {
      text: "आपका मैनेजर टीम के सामने आपके काम की तारीफ़ करता है। आपकी पहली प्रतिक्रिया क्या होती है?",
      options: [
        "टाल देता/देती हूँ - कहता/कहती हूँ कि यह किस्मत या किसी और की मदद थी",
        "असहज महसूस करता/करती हूँ और जल्दी से विषय बदल देता/देती हूँ",
        "धन्यवाद कहता/कहती हूँ, फिर बाद में सोचता/सोचती हूँ कि मैं इसके लायक नहीं था/थी",
        "धन्यवाद कहता/कहती हूँ और संक्षेप में बताता/बताती हूँ कि मैंने क्या अच्छा किया",
      ],
    },
    comm_1: { text: "मैं कठिन विचार को इतनी सरलता से समझा सकता/सकती हूँ कि दूसरे क्षेत्र का व्यक्ति भी समझ जाए।" },
    comm_2: { text: "बोलते समय मैं अपनी बात भूल जाता/जाती हूँ या घुमा-फिराकर बोलता/बोलती हूँ।" },
    comm_3: { text: "जवाब देने से पहले मैं जाँचता/जाँचती हूँ कि मैंने सामने वाले को सही समझा या नहीं।" },
    comm_sj: {
      text: "कोई दोस्त या घर का सदस्य बार-बार ऐसा कुछ करता है जो आपको परेशान करता है (हमेशा देर से आना, बिना पूछे चीज़ें ले जाना)। आप सबसे अधिक क्या करेंगे?",
      options: [
        "कुछ नहीं कहूँगा/कहूँगी और ख़ुद ही एडजस्ट कर लूँगा/लूँगी",
        "इशारों में कहूँगा/कहूँगी और उम्मीद करूँगा/करूँगी कि वे समझ जाएँ",
        "शांति से बताऊँगा/बताऊँगी कि क्या हो रहा है, मुझ पर क्या असर है, और क्या करने से मदद मिलेगी",
        "किसी और से उनकी शिकायत करूँगा/करूँगी",
      ],
    },
    dec_1: { text: "रोज़मर्रा के फ़ैसले मैं जल्दी ले लेता/लेती हूँ और बाद में ख़ुद पर शक नहीं करता/करती।" },
    dec_2: { text: "गलत चुनाव के डर से मैं ज़रूरी फ़ैसलों को टालता/टालती हूँ।" },
    dec_3: { text: "बड़े फ़ैसले से पहले मैं कम से कम दो वास्तविक विकल्पों पर विचार करता/करती हूँ।" },
    dec_sj: {
      text: "48 घंटे में दो अच्छे विकल्पों में से एक चुनना है (कोई कोर्स, शहर, नौकरी या बड़ी ख़रीद)। आपका तरीका कौन-सा है?",
      options: [
        "कई लोगों से पूछता/पूछती हूँ और बहुमत की बात मान लेता/लेती हूँ",
        "मेरे लिए क्या सबसे ज़रूरी है उसकी सूची बनाता/बनाती हूँ, दोनों विकल्पों की तुलना करके फ़ैसला करता/करती हूँ",
        "आख़िरी पल तक इंतज़ार करता/करती हूँ कि जवाब अपने आप साफ़ हो जाए",
        "बिना ज़्यादा सोचे सस्ता या ज़्यादा लोकप्रिय वाला चुन लेता/लेती हूँ",
      ],
    },
    ei_1: { text: "मैं अपनी सटीक भावना का नाम ले सकता/सकती हूँ (जैसे 'निराश', न कि सिर्फ़ 'बुरा लग रहा है')।" },
    ei_2: { text: "परेशान होने पर मैं ऐसी बातें कह या कर देता/देती हूँ जिनका बाद में पछतावा होता है।" },
    ei_3: { text: "मुझे पता चलता है कि मेरा मूड दूसरों के साथ मेरे व्यवहार को कैसे प्रभावित कर रहा है।" },
    ei_sj: {
      text: "शाम को देर से आपको एक रूखा, आलोचनात्मक संदेश मिलता है (घर, दोस्त, टीचर या काम से)। आप आमतौर पर क्या करते हैं?",
      options: [
        "ग़ुस्सा ताज़ा रहते ही तुरंत जवाब दे देता/देती हूँ",
        "जवाब नहीं देता/देती, पूरी रात उसी के बारे में सोचता/सोचती रहता/रहती हूँ",
        "झुंझलाहट को पहचानता/पहचानती हूँ, सुबह तक रुकता/रुकती हूँ, फिर असली बात का जवाब देता/देती हूँ",
        "फ़ैसला करने से पहले किसी दोस्त को भेजकर शिकायत करता/करती हूँ",
      ],
    },
    soc_1: { text: "बिना कहे भी मैं समझ जाता/जाती हूँ कि कोई असहज है।" },
    soc_2: { text: "मेरी कही बात पर लोगों की प्रतिक्रिया से मैं हैरान रह जाता/जाती हूँ।" },
    soc_3: { text: "मैं किससे बात कर रहा/रही हूँ, उसके हिसाब से अपनी बात करने का तरीका बदलता/बदलती हूँ।" },
    soc_sj: {
      text: "समूह चर्चा में एक शांत सदस्य बार-बार बोलना शुरू करता है और लोग उसे बीच में टोक देते हैं। आप:",
      options: [
        "ध्यान नहीं देते - आपका ध्यान विषय पर है",
        "ध्यान देते हैं पर बीच में नहीं पड़ते",
        "बातचीत रोककर उन्हें अपनी बात पूरी करने को कहते हैं",
        "बाद में उनसे अकेले में इस बारे में बात करते हैं",
      ],
    },
    asr_1: { text: "जब मेरे पास समय नहीं होता या मैं नहीं करना चाहता/चाहती, तो मैं 'ना' कह देता/देती हूँ।" },
    asr_2: { text: "टकराव से बचने के लिए मैं चीज़ों के लिए हाँ कह देता/देती हूँ।" },
    asr_3: { text: "मुझे लगे कि लोग असहमत होंगे, तब भी मैं अपनी राय रखता/रखती हूँ।" },
    asr_sj: {
      text: "जब भी आपका ग्रुप कुछ प्लान करता है, एक दोस्त आपके विचारों को अपना बता देता है। आप:",
      options: [
        "जाने देते हैं - तनाव लेने लायक नहीं",
        "बिना कारण बताए उनसे रूखा व्यवहार करने लगते हैं",
        "अकेले में बात करते हैं, जो हुआ वह बताते हैं और अगली बार क्या चाहते हैं वह कहते हैं",
        "अगली बार ग़ुस्से से सबके सामने उन्हें टोकते हैं",
      ],
    },
    ind_1: { text: "दूसरे क्या सोचते हैं यह जानने से पहले मैं अपनी राय बनाता/बनाती हूँ।" },
    ind_2: { text: "मैं अपनी राय ज़्यादातर इसलिए बदलता/बदलती हूँ क्योंकि आसपास के लोग असहमत होते हैं।" },
    ind_3: { text: "दोस्तों या परिवार से अलग राय रखने में मुझे कोई परेशानी नहीं होती।" },
    ind_sj: {
      text: "आपका पूरा ग्रुप (दोस्त, परिवार या टीम) एक योजना का समर्थन कर रहा है, पर आपको उसमें एक बड़ी कमी दिख रही है। आप:",
      options: [
        "मान लेते हैं कि सब सही होंगे क्योंकि सब सहमत हैं",
        "चुप रहते हैं पर मन में बेचैनी रहती है",
        "कमी को कारण के साथ साफ़ बताते हैं और जवाबी तर्कों के लिए खुले रहते हैं",
        "सिर्फ़ तभी बोलते हैं जब कोई सीधे पूछे",
      ],
    },
    crit_1: { text: "कोई बड़ा दावा सुनने पर मैं पूछता/पूछती हूँ कि इसका सबूत क्या है।" },
    crit_2: { text: "जो बातें मेरी पहले की सोच से मेल खाती हैं, उन्हें मैं बिना जाँचे मान लेता/लेती हूँ।" },
    crit_3: { text: "मैं देखता/देखती हूँ कि किसी योजना में क्या गलत हो सकता है - अपनी योजना में भी।" },
    crit_sj: {
      text: "एक वायरल पोस्ट कहती है कि एक नई आदत से किसी की उत्पादकता दोगुनी हो गई। आप:",
      options: [
        "तुरंत वह आदत शुरू कर देते हैं",
        "बिना सोचे नज़रअंदाज़ कर देते हैं",
        "आज़माने से पहले पूछते हैं कि क्या मापा गया, कैसे, और क्या यह आप पर लागू होगा",
        "पहले दोस्तों के साथ साझा करते हैं",
      ],
    },
    lead_1: { text: "जब समूह अटक जाता है, तो मैं आगे बढ़ने का रास्ता सुझाता/सुझाती हूँ।" },
    lead_2: { text: "जिस काम का नेतृत्व मैंने किया, उसमें गड़बड़ होने पर मैं सबके सामने ज़िम्मेदारी लेता/लेती हूँ।" },
    lead_3: { text: "मैं ख़ुद व्यवस्था कर सकता/सकती हूँ, फिर भी इंतज़ार करता/करती हूँ कि कोई और करे।" },
    lead_sj: {
      text: "ग्रुप की कोई योजना (यात्रा, घर का समारोह, कॉलेज या काम का प्रोजेक्ट) बिना किसी आयोजक के भटक रही है। आप:",
      options: [
        "अपना हिस्सा करते रहते हैं और इंतज़ार करते हैं",
        "शिकायत करते हैं कि कोई व्यवस्था नहीं कर रहा",
        "एक सरल योजना प्रस्तावित करते हैं और समन्वय करने की पेशकश करते हैं",
        "किसी बड़े या वरिष्ठ से ज़िम्मेदारी लेने को कहते हैं",
      ],
    },
    disc_1: { text: "मन न हो तब भी मैं दिन के लिए जो योजना बनाई वह करता/करती हूँ।" },
    disc_2: { text: "मैं निजी लक्ष्य जोश से शुरू करता/करती हूँ और कुछ हफ़्तों में छोड़ देता/देती हूँ।" },
    disc_3: { text: "ख़ुद से किए वादे मैं उतनी ही गंभीरता से निभाता/निभाती हूँ जितने दूसरों से किए।" },
    disc_sj: {
      text: "आज रात आपने एक घंटे की ध्यानपूर्वक पढ़ाई की योजना बनाई थी, पर आप थके हैं और दोस्त बाहर बुला रहा है। आप:",
      options: [
        "बाहर चले जाते हैं - बाद में पूरा कर लेंगे",
        "घर पर रुकते हैं पर फ़ोन स्क्रॉल करते रह जाते हैं",
        "पहले एक छोटा ध्यानपूर्वक सत्र करते हैं, फिर तय करते हैं",
        "जो भी चुनें, अपराधबोध महसूस करते हैं",
      ],
    },
  },
};

const PACKS: Partial<Record<AssessmentLang, Pack>> = { hinglish, hi };

export function assessmentPack(lang: AssessmentLang): Pack | null {
  return PACKS[lang] ?? null;
}
