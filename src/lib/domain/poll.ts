/**
 * "Aaj ka sawaal": one everyday situation a day, the same for everyone. Ten seconds to vote,
 * then you see how others answered and one practical tip. Built-in bank, so no AI cost.
 * Each poll: question + three options in English (en) and Hinglish (hi), and a short tip.
 */
export type Poll = {
  id: string;
  skill: string;
  en: { q: string; o: [string, string, string]; tip: string };
  hi: { q: string; o: [string, string, string]; tip: string };
};

export const POLLS: Poll[] = [
  {
    id: "credit",
    skill: "Assertiveness",
    en: { q: "Planning a trip with friends, someone presents your idea as theirs. You…", o: ["Let it go this time", "Add calmly: \"Glad you liked the idea I shared yesterday\"", "Talk to them privately afterwards"], tip: "Claiming credit calmly in the moment, without blaming, is seen as confident, not rude." },
    hi: { q: "Doston ke saath trip plan ho raha hai, koi tumhara idea apna bata deta hai. Tum…", o: ["Is baar jaane do", "Shaanti se bolo: \"Achha laga kal wala mera idea pasand aaya\"", "Baad mein akele mein baat karo"], tip: "Usi waqt shaanti se, bina blame ke credit lena confident lagta hai, rude nahi." },
  },
  {
    id: "no-plan",
    skill: "Boundaries",
    en: { q: "Friends plan a trip you can't afford this month. You…", o: ["Go anyway and manage somehow", "Say honestly: \"Budget tight hai, next time pakka\"", "Make an excuse"], tip: "A clear, honest no keeps friendships stronger than a vague excuse." },
    hi: { q: "Dost aisa trip plan karte hain jo is mahine afford nahi. Tum…", o: ["Phir bhi chale jao, kaise bhi manage", "Seedha bolo: \"Budget tight hai, next time pakka\"", "Koi bahana bana do"], tip: "Saaf aur sachcha 'na' dosti ko bahane se zyada mazboot rakhta hai." },
  },
  {
    id: "first-speak",
    skill: "Confidence",
    en: { q: "New class or team. Nobody is talking. You…", o: ["Wait for someone else", "Say hi and ask one simple question", "Stay on your phone"], tip: "The first person to speak sets the tone; a simple question is the easiest opener." },
    hi: { q: "Nayi class ya team. Koi baat nahi kar raha. Tum…", o: ["Kisi aur ka wait karo", "Hi bolo aur ek simple sawaal pucho", "Phone mein lage raho"], tip: "Jo pehle bolta hai wahi mahaul banata hai; simple sawaal sabse aasaan shuruaat hai." },
  },
  {
    id: "two-offers",
    skill: "Decisions",
    en: { q: "Two good options, you can't decide for days. You…", o: ["Ask five more people", "Write 3 must-haves and score both", "Wait for a sign"], tip: "Deciding what matters before comparing cuts overthinking in half." },
    hi: { q: "Do achhe options, kai din se decide nahi ho raha. Tum…", o: ["Paanch aur logon se pucho", "3 zaroori cheezein likho aur dono ko score karo", "Kisi sign ka wait karo"], tip: "Compare karne se pehle tay karo kya zaroori hai; overthinking aadha ho jaata hai." },
  },
  {
    id: "criticism",
    skill: "Emotional intelligence",
    en: { q: "Someone (a relative, a teacher or a boss) criticises you in front of others. You…", o: ["Defend yourself right away", "Say \"Noted, can we discuss details after?\"", "Stay quiet and feel bad all day"], tip: "Buying time politely protects your dignity and gets you better feedback later." },
    hi: { q: "Koi (rishtedaar, teacher ya boss) sabke saamne tumhari burai karta hai. Tum…", o: ["Turant apna bachav karo", "Bolo \"Noted, details baad mein discuss karein?\"", "Chup raho aur din bhar bura feel karo"], tip: "Shaanti se waqt lena izzat bhi bachata hai aur baad mein behtar feedback milta hai." },
  },
  {
    id: "late-reply",
    skill: "Communication",
    en: { q: "A friend hasn't replied for two days. You…", o: ["Assume they're angry", "Send a light \"All good?\"", "Stop messaging them"], tip: "Most silence is busyness, not anger. A light check-in clears it fast." },
    hi: { q: "Dost ne do din se reply nahi kiya. Tum…", o: ["Maan lo wo naraz hai", "Halka sa \"Sab theek?\" bhejo", "Message karna band kar do"], tip: "Zyada tar chuppi busy hone ki hoti hai, naraazgi ki nahi. Halka check-in sab saaf kar deta hai." },
  },
  {
    id: "group-wrong",
    skill: "Independent thinking",
    en: { q: "Your group agrees on something you think is wrong. You…", o: ["Go along to avoid conflict", "Ask one question: \"What if…?\"", "Complain later"], tip: "A question invites people to rethink; a flat \"you're wrong\" makes them defend." },
    hi: { q: "Group kisi aisi baat par agree karta hai jo tumhe galat lagti hai. Tum…", o: ["Jhagde se bachne ke liye maan lo", "Ek sawaal pucho: \"Agar aisa hua to…?\"", "Baad mein shikayat karo"], tip: "Sawaal logon ko dobara sochne deta hai; seedha 'tum galat ho' unhe defensive bana deta hai." },
  },
  {
    id: "procrastinate",
    skill: "Self-discipline",
    en: { q: "A big task is due in a week and you keep avoiding it. You…", o: ["Wait for motivation", "Do just 10 minutes now", "Pull an all-nighter later"], tip: "Starting for 10 minutes beats waiting for motivation; action creates it." },
    hi: { q: "Bada kaam ek hafte mein due hai aur tum taal rahe ho. Tum…", o: ["Motivation ka wait karo", "Abhi sirf 10 minute karo", "Baad mein raat bhar jag ke karo"], tip: "10 minute shuru karna motivation ke wait se behtar hai; kaam karne se motivation aata hai." },
  },
  {
    id: "interview-blank",
    skill: "Confidence",
    en: { q: "In an interview your mind goes blank on a question. You…", o: ["Say anything quickly", "Say \"Let me think for a moment\" and pause", "Say \"I don't know\" and move on"], tip: "A calm pause reads as thoughtful. Interviewers rarely mind three seconds of silence." },
    hi: { q: "Interview mein ek sawaal par dimaag blank ho jaata hai. Tum…", o: ["Jaldi se kuch bhi bol do", "Bolo \"Ek second sochne do\" aur ruko", "\"Pata nahi\" bol ke aage badho"], tip: "Shaant pause samajhdari lagta hai. Interviewer ko teen second ki chuppi se farak nahi padta." },
  },
  {
    id: "parents-career",
    skill: "Communication",
    en: { q: "Your parents want a career for you that you don't. You…", o: ["Agree to keep peace", "Show them a clear plan for what you want", "Avoid the topic"], tip: "Parents worry about security. A concrete plan answers the worry better than emotion." },
    hi: { q: "Ghar wale tumhare liye aisa career chahte hain jo tum nahi chahte. Tum…", o: ["Shaanti ke liye maan jao", "Jo chahte ho uska saaf plan dikhao", "Is topic se bacho"], tip: "Ghar walon ki chinta security ki hoti hai. Thos plan emotion se behtar jawab deta hai." },
  },
  {
    id: "borrowed-money",
    skill: "Assertiveness",
    en: { q: "A friend hasn't returned money you lent months ago. You…", o: ["Forget about it", "Ask directly with a date: \"Can you return it by Friday?\"", "Drop hints"], tip: "A specific, friendly ask with a date works better than hints." },
    hi: { q: "Dost ne mahino pehle udhaar liye paise wapas nahi kiye. Tum…", o: ["Bhool jao", "Seedha date ke saath pucho: \"Friday tak de doge?\"", "Ishaare karte raho"], tip: "Date ke saath seedha, dostana sawaal ishaaron se zyada kaam karta hai." },
  },
  {
    id: "mistake-work",
    skill: "Leadership",
    en: { q: "You made a mistake nobody has noticed yet. You…", o: ["Hope nobody notices", "Tell them early with a fix", "Blame the process"], tip: "Owning a mistake early, with a fix, builds more trust than never making one." },
    hi: { q: "Tumse galti hui, abhi kisi ne notice nahi kiya. Tum…", o: ["Ummeed karo kisi ko pata na chale", "Jaldi batao, saath mein solution", "Process ko blame karo"], tip: "Galti jaldi maan ke solution dena, kabhi galti na karne se zyada bharosa banata hai." },
  },
  {
    id: "compare-insta",
    skill: "Self-awareness",
    en: { q: "Scrolling, you see a friend's big win and feel low. You…", o: ["Keep scrolling and feel worse", "Congratulate them and close the app", "Post something to compete"], tip: "Celebrating others and stepping away turns envy into motivation." },
    hi: { q: "Scroll karte hue dost ki badi jeet dekh ke mann udaas hota hai. Tum…", o: ["Scroll karte raho, aur bura lage", "Badhai do aur app band karo", "Takkar mein kuch post karo"], tip: "Dusron ki khushi manana aur thoda ruk jaana jalan ko motivation mein badal deta hai." },
  },
  {
    id: "rude-shop",
    skill: "Emotional intelligence",
    en: { q: "A shopkeeper or customer is rude to you. You…", o: ["Be rude back", "Stay calm and repeat what you need", "Leave and stay angry"], tip: "Calm repetition of what you need usually wins; anger gives your power away." },
    hi: { q: "Dukandaar ya customer tumse rudely baat karta hai. Tum…", o: ["Tum bhi rude ho jao", "Shaant raho aur jo chahiye wo dohrao", "Chale jao aur gussa rakho"], tip: "Shaant reh kar apni baat dohrana zyada kaam karta hai; gussa apni taaqat de deta hai." },
  },
  {
    id: "too-many-tasks",
    skill: "Decisions",
    en: { q: "Ten things to do and only time for three. You…", o: ["Start with the easiest", "Pick the 3 with the biggest impact", "Try to do all ten halfway"], tip: "Impact first. Three finished important things beat ten half-done ones." },
    hi: { q: "Das kaam hain aur time sirf teen ka. Tum…", o: ["Sabse aasaan se shuru karo", "Sabse zyada asar wale 3 chuno", "Dason aadhe-adhoore karo"], tip: "Pehle asar. Teen poore zaroori kaam das aadhe kaamon se behtar." },
  },
  {
    id: "public-speak",
    skill: "Confidence",
    en: { q: "You have to speak in front of 50 people tomorrow. You…", o: ["Write every word and memorise", "Practise 3 key points out loud twice", "Hope to wing it"], tip: "Three points practised out loud beat a memorised script that you can lose." },
    hi: { q: "Kal 50 logon ke saamne bolna hai. Tum…", o: ["Har shabd likh ke rat lo", "3 main points do baar bol ke practice karo", "Wahin par dekh lenge"], tip: "Bol ke practice kiye 3 points, rata hua script jo bhool sakte ho, usse behtar." },
  },
  {
    id: "friend-sad",
    skill: "Social intelligence",
    en: { q: "A friend says they're having a bad week. You…", o: ["Give advice right away", "Ask \"Want to talk or want a distraction?\"", "Say \"Mine was worse\""], tip: "Asking what they need shows care better than solving straight away." },
    hi: { q: "Dost bolta hai uska hafta bahut bura ja raha hai. Tum…", o: ["Turant salaah do", "Pucho \"Baat karni hai ya mood change karna hai?\"", "Bolo \"Mera to aur bura tha\""], tip: "Pehle puchna ki use kya chahiye, turant solution dene se zyada parwaah dikhata hai." },
  },
  {
    id: "fake-news",
    skill: "Critical thinking",
    en: { q: "A shocking forward arrives in the family group. You…", o: ["Forward it quickly", "Check the source before reacting", "Ignore it"], tip: "Ten seconds of checking the source saves a lot of confusion later." },
    hi: { q: "Family group mein ek shocking forward aata hai. Tum…", o: ["Jaldi se aage forward karo", "React karne se pehle source check karo", "Ignore karo"], tip: "Das second source check karna baad ki bahut gadbad bacha leta hai." },
  },
  {
    id: "raise",
    skill: "Assertiveness",
    en: { q: "You think you deserve a raise or better marks. You…", o: ["Wait to be noticed", "Ask with 3 facts that show your work", "Complain to friends"], tip: "Specific facts turn a request into a case that's easy to say yes to." },
    hi: { q: "Tumhe lagta hai tum raise ya achhe marks deserve karte ho. Tum…", o: ["Notice hone ka wait karo", "Apne kaam ke 3 facts ke saath maango", "Doston se shikayat karo"], tip: "Thos facts request ko aisa case bana dete hain jise haan bolna aasaan ho." },
  },
  {
    id: "phone-meal",
    skill: "Self-discipline",
    en: { q: "You promised yourself no phone at dinner. A notification buzzes. You…", o: ["Just a quick look", "Put the phone face down in another room", "Check and reply"], tip: "Changing the setup (phone away) works better than willpower in the moment." },
    hi: { q: "Khud se promise kiya tha khaane par phone nahi. Notification aata hai. Tum…", o: ["Bas ek nazar", "Phone ulta karke dusre kamre mein rakh do", "Dekh ke reply karo"], tip: "Mahaul badalna (phone door) us waqt ki will-power se zyada kaam karta hai." },
  },
  {
    id: "lead-group",
    skill: "Leadership",
    en: { q: "A group plan (a trip, a function or a project), nobody is taking charge. You…", o: ["Wait, someone will", "Suggest a plan and ask who takes what", "Do everything yourself"], tip: "Leading often just means proposing the first plan and sharing the work." },
    hi: { q: "Group plan (trip, function ya project), koi aage nahi aa raha. Tum…", o: ["Ruko, koi na koi karega", "Plan suggest karo aur pucho kaun kya lega", "Sab kuch khud kar lo"], tip: "Leadership aksar bas pehla plan rakhna aur kaam baantna hota hai." },
  },
  {
    id: "said-yes",
    skill: "Boundaries",
    en: { q: "You said yes to a favour and now regret it. You…", o: ["Do it and resent it", "Tell them early: \"I can't after all, sorry\"", "Disappear"], tip: "Backing out early and clearly is kinder than doing it badly or vanishing." },
    hi: { q: "Ek favour ke liye haan bol diya, ab pachhta rahe ho. Tum…", o: ["Kar do aur andar se chidho", "Jaldi batao: \"Sorry, nahi ho payega\"", "Gaayab ho jao"], tip: "Jaldi aur saaf mana karna, bure dil se karne ya gaayab hone se behtar hai." },
  },
  {
    id: "anger-text",
    skill: "Emotional intelligence",
    en: { q: "You're angry and typing a long message. You…", o: ["Send it now", "Wait an hour, then reread", "Call them shouting"], tip: "Messages sent in anger are rarely the ones we're proud of. A pause is free." },
    hi: { q: "Gusse mein lamba message type kar rahe ho. Tum…", o: ["Abhi bhej do", "Ek ghanta ruko, phir dobara padho", "Call karke chillao"], tip: "Gusse mein bheje message par baad mein garv kam hi hota hai. Rukna free hai." },
  },
  {
    id: "new-skill",
    skill: "Growth",
    en: { q: "You're bad at something new you're learning. You…", o: ["Quit, not my thing", "Practise a little daily and track it", "Watch more videos about it"], tip: "Small daily practice beats talent at the start; tracking shows you it's working." },
    hi: { q: "Kuch naya seekh rahe ho aur usme kamzor ho. Tum…", o: ["Chhod do, mere bas ka nahi", "Roz thoda practice aur track karo", "Uske aur videos dekho"], tip: "Shuruaat mein roz ki thodi practice talent se aage nikal jaati hai; tracking dikhati hai ki kaam ho raha hai." },
  },
  {
    id: "disagree-elder",
    skill: "Communication",
    en: { q: "An elder says something you strongly disagree with. You…", o: ["Argue loudly", "Say \"I see it a bit differently\" and explain once", "Nod and keep quiet"], tip: "Respectful disagreement, said once, keeps both the relationship and your voice." },
    hi: { q: "Koi bada aisi baat kehta hai jisse tum bilkul agree nahi karte. Tum…", o: ["Zor se behas karo", "Bolo \"Main thoda alag dekhta hoon\" aur ek baar samjhao", "Sir hilao aur chup raho"], tip: "Izzat se, ek baar kahi asahmati rishta bhi bachati hai aur tumhari awaaz bhi." },
  },
  {
    id: "lonely-hostel",
    skill: "Social intelligence",
    en: { q: "New city, you feel lonely. You…", o: ["Stay in your room", "Join one club or group activity this week", "Wait for people to approach you"], tip: "Shared activities make friendships easier than trying to meet people cold." },
    hi: { q: "Naya shehar, akela feel ho raha hai. Tum…", o: ["Kamre mein hi raho", "Is hafte ek club ya group activity join karo", "Logon ke paas aane ka wait karo"], tip: "Saath mein koi activity karne se dosti banana aasaan hota hai." },
  },
  {
    id: "exam-fail",
    skill: "Resilience",
    en: { q: "You did badly in an important test. You…", o: ["Decide you're not smart enough", "Find the 2 topics that cost the most marks", "Pretend it doesn't matter"], tip: "Turning a failure into two specific fixes is what improves the next result." },
    hi: { q: "Ek zaroori test mein kharaab gaya. Tum…", o: ["Maan lo tum utne smart nahi", "Wo 2 topic dhoondo jinme sabse zyada marks kate", "Dikhao ki farak nahi padta"], tip: "Haar ko do pakke sudhaar mein badalna hi agla result behtar karta hai." },
  },
  {
    id: "shopping-impulse",
    skill: "Decisions",
    en: { q: "You see something expensive you suddenly want. You…", o: ["Buy it now", "Add to cart and decide in 48 hours", "Buy a cheaper copy instead"], tip: "A 48-hour wait removes most impulse buys you'd regret." },
    hi: { q: "Kuch mehenga dikha aur achanak chahiye. Tum…", o: ["Abhi khareed lo", "Cart mein daalo, 48 ghante baad decide karo", "Uski sasti copy le lo"], tip: "48 ghante ka wait pachhtave wali zyada tar shopping rok deta hai." },
  },
  {
    id: "teammate-slack",
    skill: "Leadership",
    en: { q: "Your flatmate or sibling keeps skipping their share of the housework. You…", o: ["Do it for them quietly", "Ask what's getting in the way and agree a plan", "Complain to someone else straight away"], tip: "Asking what's blocking someone often fixes the problem and the relationship." },
    hi: { q: "Flatmate ya bhai/behen ghar ke kaam mein apna hissa baar baar chhod dete hain. Tum…", o: ["Chupchaap unka kaam kar do", "Pucho kya dikkat hai aur saath mein plan tay karo", "Turant kisi aur se shikayat kar do"], tip: "Pucho kya rok raha hai; aksar problem bhi sulajhti hai aur rishta bhi." },
  },
  {
    id: "compliment",
    skill: "Confidence",
    en: { q: "Someone compliments your work. You…", o: ["\"Arre nahi, kuch khaas nahi\"", "\"Thank you, I worked hard on it\"", "Change the subject"], tip: "Accepting a compliment simply shows confidence and makes the other person feel heard." },
    hi: { q: "Koi tumhare kaam ki taareef karta hai. Tum…", o: ["\"Arre nahi, kuch khaas nahi\"", "\"Thank you, maine mehnat ki thi\"", "Baat badal do"], tip: "Taareef ko seedha accept karna confidence dikhata hai aur saamne wale ko achha lagta hai." },
  },
  {
    id: "partner-cancel",
    skill: "Communication",
    en: { q: "Your partner or close friend cancels plans last minute, for the third time. You…", o: ["Say \"It's fine\" and stay upset", "Say how it felt and ask what's going on", "Cancel on them next time"], tip: "Naming the feeling and asking a real question works better than quiet resentment or payback." },
    hi: { q: "Partner ya kareebi dost teesri baar last minute plan cancel karta hai. Tum…", o: ["\"Koi baat nahi\" bolo aur andar se naraz raho", "Batao kaisa laga aur pucho sab theek hai?", "Agli baar tum bhi cancel kar do"], tip: "Feeling batana aur sachcha sawaal puchna chup-chaap naraazgi ya badle se behtar kaam karta hai." },
  },
  {
    id: "relatives-compare",
    skill: "Self-belief",
    en: { q: "At a family function, a relative compares you with a cousin. You…", o: ["Laugh it off but feel small", "Smile and say \"We're on different paths, I'm happy with mine\"", "Argue back in front of everyone"], tip: "A calm, short line protects your self-respect without spoiling the day." },
    hi: { q: "Family function mein koi rishtedaar tumhe cousin se compare karta hai. Tum…", o: ["Hans ke taal do par andar se chhota feel karo", "Muskura ke bolo \"Sabke raaste alag hain, main apne se khush hoon\"", "Sabke saamne behas karo"], tip: "Shaant, chhoti si line izzat bhi bachati hai aur din bhi kharab nahi hota." },
  },
  {
    id: "sleep-scroll",
    skill: "Self-discipline",
    en: { q: "It's 1am, you're tired but still scrolling. You…", o: ["Just five more minutes", "Put the phone across the room and sleep", "Switch to another app"], tip: "Moving the phone out of reach beats willpower at 1am." },
    hi: { q: "Raat ke 1 baje hain, neend aa rahi hai par scroll chal raha hai. Tum…", o: ["Bas 5 minute aur", "Phone door rakho aur so jao", "Dusra app khol lo"], tip: "Raat 1 baje will-power se zyada kaam aata hai phone ko haath ki pahunch se door rakhna." },
  },
  {
    id: "self-talk",
    skill: "Self-belief",
    en: { q: "You mess something up and your inner voice says \"I always fail\". You…", o: ["Believe it", "Ask: \"What would I tell a friend right now?\"", "Distract yourself and avoid thinking"], tip: "Talking to yourself like you'd talk to a friend makes it easier to try again." },
    hi: { q: "Kuch gadbad ho gayi aur andar se awaaz aati hai \"Main hamesha fail hota/hoti hoon\". Tum…", o: ["Maan lo", "Khud se pucho: \"Kisi dost ko abhi kya kehta/kehti?\"", "Dhyaan bhatka lo aur socho hi mat"], tip: "Khud se waise baat karo jaise kisi dost se karte; dobara try karna aasaan ho jaata hai." },
  },
];

/** The same poll for everyone on a given date. */
export function pollFor(date: string): Poll {
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return POLLS[((day % POLLS.length) + POLLS.length) % POLLS.length];
}

export const pollText = (p: Poll, language: string | null | undefined) => (language === "en" ? p.en : p.hi);
