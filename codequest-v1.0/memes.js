
/* CodeQuest - Telugu Meme Collection 😂🔥 */

const TELUGU_STATES = ['Andhra Pradesh', 'Telangana'];

const MEMES = {
  te: {
    welcome: [
      ['Arey mowa! Welcome ra 😂', 'Coding nerchukundham ani vachava? First laptop charge undha chusko!'],
      ['Namaskaram developer garu 🙏', 'Ikkada bugs ki welcome, programmers ki sleepless nights!'],
      ['Oho future software engineer!', 'Mee intlo already Google CEO ani cheppesava enti?'],
      ['Mowa ready aa?', 'Brain ni on cheyyi ra... laptop already on lo undhi!'],
      ['Welcome to CodeQuest!', 'Ikkada nerchukune mundhu patience nerchukovali babu!'],
      ['Rey coder!', 'Keyboard pattukunnav ante job vachinatte anukoku 😂'],
      ['Entry ichav ga mowa!', 'Ippudu nee life lo semicolon ki kuda importance vasthundhi!'],
      ['Future CTO garu!', 'First password marchipokunda login avvu ra! 🤣'],
      ['Coding journey start!', 'Intlo nuvvu phone adithe games, laptop adithe coding anta!'],
      ['Mowa, vachesaava!', 'Ippudu nee friends doubts adugutharu... nuvvu Google chesthav!']
    ],

    success: [
      ['Code run ayindhi ra! 🔥', 'Screenshot teesko... ee moment malli raadhu!'],
      ['Abba thopu!', 'Computer kuda nee talent chusi shock ayyindhi!'],
      ['Correct answer!', 'Ippudu nee confidence ki separate server kavali!'],
      ['Level complete!', 'Resume lo 10 years experience ani pettaku ra!'],
      ['Bug ni champesav!', 'Bug: Nenu innocent bhayya! 😭'],
      ['Mass performance ra!', 'Pushpa range lo code rasav... taggede le!'],
      ['Mowa developer ayipoyav!', 'Inka salary matram pending lo undhi! 😂'],
      ['Super ra babu!', 'Stack Overflow ki ivala rest ivvochu!'],
      ['First attempt success!', 'Idhi chusi nee laptop kuda emotional ayyindhi!'],
      ['Sabaash!', 'Mee relatives ki cheppu... computer repair kaadhu coding chesthunna ani!'],
      ['Excellent ra!', 'Nuvvu code rasav, computer execute chesindhi, history create ayyindhi!'],
      ['Wah wah!', 'Ee talent ni inni rojulu enduku hide chesav ra?']
    ],

    wrong: [
      ['Ayyo error vachindha?! 😭', 'Parledhu mowa... programmer life lo idhi daily serial!'],
      ['Syntax error!', 'Oka bracket miss ayyindhi... nee peace of mind kuda miss ayyindhi!'],
      ['Wrong answer ra!', 'Question chusava? Leka random ga button nokkava? 😂'],
      ['Computer: Error!', 'Nuvvu: Naa life lo kuda errors thakkuva levu bhayya!'],
      ['Malli try cheyyi!', 'Nee confidence down avvakudadhu... laptop down ayina parle!'],
      ['Code fail ayyindhi!', 'Nuvvu fail kaadhu ra... code ki bad time!'],
      ['Missing semicolon!', 'Oka chinna dot kosam intha pedda godava!'],
      ['Logic ekkada ra?', 'Code lo logic ledhu... nee face lo tension undhi!'],
      ['Output raadha?', 'Computer ki kuda nee expectations ardham kaaledhu!'],
      ['Wrong answer!', 'Exam lo kuda ilaane guess chesthava mowa?'],
      ['Bug detected!', 'Bug ni fix cheyyadaniki mundhu tea taagi ra! ☕'],
      ['Error 404: Brain not found!', 'Konchem restart avvu mowa! 🤣'],
      ['Code chala bagundhi!', 'Kaani computer ki nachaledhu anta!'],
      ['Almost correct!', 'Almost tho job raadhu ra babu! 😂'],
      ['Rey mowa!', 'Bracket open chesav... close cheyyadam marchipoyav!']
    ],

    worlddone: [
      ['World complete! 🏆', 'Intlo cheppaku... next website kuda nuvve cheyyali!'],
      ['Boss ni odinchesav!', 'Ippudu real boss interview lo wait chesthunnadu!'],
      ['Legend ra nuvvu!', 'LinkedIn lo post pettu: Another milestone unlocked!'],
      ['Full world finish!', 'Inka migilindhi okkate... salary notification!'],
      ['Developer material!', 'Salary vachaka friends ki biryani treat marchipoku!'],
      ['Mass entry, mass exit!', 'Ee world ni kuda clean sweep chesav ra!'],
      ['Level after level!', 'Mee amma: Phone pakkana pettu. Nuvvu: Coding amma!'],
      ['Champion!', 'Certificate kosam kaadhu... confidence kosam aadav ra!']
    ],

    streak: [
      ['Streak super ra!', 'Ee consistency nee attendance lo kuda kanipinchali!'],
      ['Mowa fire lo unnav!', 'Laptop fan helicopter laga tiruguthundhi!'],
      ['Daily coding aa?', 'Gym ki kuda ilanti dedication chupinchu ra!'],
      ['3 in a row!', 'Nee luck ki ivala holiday ledhu!'],
      ['Consistency ante idhe!', 'Exam mundhu kuda ilaane chaduvu mowa!'],
      ['Streak king!', 'Alarm snooze cheyyadam kuda aapu ra! 😂'],
      ['Super speed!', 'Nee keyboard ki overtime ivvali!']
    ],

    exam: [
      ['Exam tomorrow!', 'Syllabus motham chudaledhu... kani confidence matram full!'],
      ['Student life!', 'Night 2 AM ki book open... morning 8 AM ki good morning!'],
      ['Question paper chusava?', 'Nuvvu chadivindhi okati... adigindhi inkokati! 😭'],
      ['Exam hall lo!', 'Brain: Loading... 99% daggara stuck!'],
      ['Last minute preparation!', 'One hour lo one semester cover cheyyali anta!'],
      ['Invigilator vachadu!', 'Nuvvu answer sheet ni chusthunnav, answer sheet ninnu chusthundhi!'],
      ['Exam ayipoyindhi!', 'Answers gurthosthunnayi... intiki vellaka! 😂']
    ],

    coding: [
      ['Programmer life!', 'Code work ayyaka touch cheyyaku... devudu daya valla nadusthundhi!'],
      ['Debugging time!', 'Oka bug fix chesthe inkoka 10 bugs family tho vasthayi!'],
      ['Developer rule!', 'Code ardham kakapoyina comments matram professional ga rayali!'],
      ['Night coding!', 'Time 2 AM... problem enti? Nuvvu enduku inka awake?'],
      ['Git commit!', 'Changes chesav... em changes chesavo neeke telidhu!'],
      ['Production lo bug!', 'Developer heartbeat: 120 BPM!'],
      ['New feature!', 'Simple ga start chesi 17 errors tho finish chesav!'],
      ['Code review!', 'Nuvvu rasindhi chusi reviewer ki coffee avasaram ayyindhi!']
    ],

    job: [
      ['Interview question!', 'Tell me about yourself... Nuvvu: Naa gurinchi nake clarity ledhu sir!'],
      ['HR: Any experience?', 'You: CodeQuest lo 100 levels experience madam! 😂'],
      ['Expected salary?', 'Nuvvu: First job ivvandi sir, salary taruvatha chuddam!'],
      ['Resume ready!', 'Skills: Python, Java, SQL... Experience: YouTube tutorials!'],
      ['Rejected?', 'Parledhu mowa... company loss, nee talent safe!'],
      ['Offer letter vachindha?', 'Amma: Eppudu join avuthav? Nuvvu: Background verification lo unna!'],
      ['LinkedIn update!', 'Open to work ani pettav... relatives matram marriage proposals pampisthunnaru!']
    ],

    friends: [
      ['Friend: Coding nerchukuntunnava?', 'You: Avunu ra. Friend: Na phone repair cheyyi! 😂'],
      ['Group project!', 'Work okkadu chesthadu... presentation lo 5 members untaru!'],
      ['Friend: Output vachinda?', 'You: Vachindhi ra. Friend: Naaku kuda pampu, copy chestha!'],
      ['Coding friend!', 'Doubt adigithe answer ivvadu... meme pampisthadu!'],
      ['College lo!', 'Teacher: Any doubts? Class: Silent. Break lo: 100 doubts!'],
      ['Best friend!', 'Nuvvu coding chesthunte pakkana kurchoni reels chusthadu!']
    ]
  },

  en: {
    welcome: [
      ['Welcome, future developer!', 'Your bugs are already waiting for you. 😂'],
      ['Hello, legend!', 'Laptop is ready. Is your brain?'],
      ['Welcome to CodeQuest!', 'Where semicolons matter more than relationships.']
    ],
    success: [
      ['Code worked!', 'Take a screenshot. This moment is historic.'],
      ['Level cleared!', 'Your keyboard deserves a salary hike.'],
      ['Bug defeated!', 'The bug has requested a transfer.'],
      ['Amazing!', 'Your confidence just got a software update.']
    ],
    wrong: [
      ['Error detected!', 'Even your code needs emotional support.'],
      ['Wrong answer!', 'The computer understood the question. You two need a meeting.'],
      ['Syntax error!', 'One bracket ruined your entire evening.'],
      ['Try again!', 'Your code is not broken. It is just exploring new ways to fail.']
    ],
    worlddone: [
      ['World complete!', 'Update your LinkedIn before your relatives find out.'],
      ['Boss defeated!', 'Now defeat Monday morning.'],
      ['Champion!', 'Your next boss is waiting in the interview room.']
    ],
    streak: [
      ['Amazing streak!', 'Keep this consistency for your sleep schedule too.'],
      ['On fire!', 'Your laptop fan needs a vacation.']
    ],
    exam: [
      ['Exam tomorrow!', 'You have read the title. That counts, right?'],
      ['Exam hall!', 'Brain has stopped responding. Try again later.']
    ],
    coding: [
      ['Developer life!', 'If it works, do not touch it.'],
      ['Debugging!', 'Fix one bug. Accidentally create five.']
    ],
    job: [
      ['HR: Experience?', 'You: I have watched 200 coding tutorials.'],
      ['Interview mode!', 'Confidence: 100%. Actual preparation: 2%.']
    ],
    friends: [
      ['Group project!', 'One person codes. Everyone else takes credit.'],
      ['Friend: Can you fix my laptop?', 'You: I just learned print() yesterday.']
    ]
  }
};

const Memes = {
  region(profile) {
    return profile && TELUGU_STATES.includes(profile.state) ? 'te' : 'en';
  },

  pick(kind, profile) {
    const memes = MEMES[Memes.region(profile)][kind] || MEMES[Memes.region(profile)].success;
    return memes[Math.floor(Math.random() * memes.length)];
  },

  html(m) {
    return '<div class="meme"><div class="mt">' +
      m[0] +
      '</div><div class="mb">' +
      m[1] +
      '</div></div>';
  }
};
