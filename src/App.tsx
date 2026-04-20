import { useState, useEffect, useCallback, useRef } from "react";

// ─── TILE DEFINITIONS ────────────────────────────────────────────────────────
const TILE_CATEGORIES = {
  open_vowel: {
    label: "Open Vowel",
    color: "#E84855",
    bg: "#1a0608",
    accent: "#ff6b78",
    tiles: ["a", "e", "i", "o", "u"],
  },
  closed_vowel: {
    label: "Closed Vowel",
    color: "#F4A261",
    bg: "#1a0e04",
    accent: "#ffbe85",
    tiles: ["a", "a", "e", "e", "i", "i", "o", "o", "u", "u"],
  },
  double_vowel: {
    label: "Double Vowel",
    color: "#2EC4B6",
    bg: "#041514",
    accent: "#5de8e0",
    tiles: [
      "ai/ay","ea","ia","oa","ui/ue","au/aw","ei/ey","ie","oo","ou/ow","ee","eu/ew",
      "oi/oy","ai/ay","ea","oa","au/aw","ie","oo","ou/ow","ee","oi/oy",
    ],
  },
  r_vowel: {
    label: "R-Vowel",
    color: "#CBF3F0",
    bg: "#071414",
    accent: "#a0f5f0",
    tiles: [
      "ar","er","ir","or","ur","air","eer","ier","oor","eur",
      "ar","er","ir","ur","oar","ore",
    ],
  },
  main_consonants: {
    label: "Consonants",
    color: "#FFBF69",
    bg: "#1a1004",
    accent: "#ffd699",
    tiles: [
      "b","p","m","f","d","t","n","l","g","ck","h/wh","j","tch","sh","th","s",
      "b","p","m","f","d","t","n","l","ck","h/wh","j","tch","sh","s","t",
    ],
  },
  specials: {
    label: "Specials",
    color: "#C77DFF",
    bg: "#120a1a",
    accent: "#e4acff",
    tiles: [
      "suffix","-tion","-ing","-ed","-ly","-ness","-ment","pre-","un-","re-",
      "-ful","-less","mis-","dis-",
    ],
  },
  others: {
    label: "Others",
    color: "#9EF01A",
    bg: "#0d1400",
    accent: "#c8ff5a",
    tiles: [
      "y","ph","r","al","ng","ge","qu","cy","c","ol","w/wh","v","x","z",
      "dr","nk","e","gu","tr","y","r","w",
    ],
  },
};

// For dual tiles like "ei/ey", extract both variants
function parseTile(text, cat, id) {
  if (text.includes("/")) {
    const variants = text.split("/");
    return { id, text, display: text, variants, activeVariant: 0, category: cat };
  }
  return { id, text, display: text, variants: null, activeVariant: 0, category: cat };
}

// Build the full 108-tile deck
function buildDeck() {
  const deck = [];
  let id = 0;
  Object.entries(TILE_CATEGORIES).forEach(([cat, data]) => {
    data.tiles.forEach((text) => {
      deck.push(parseTile(text, cat, id++));
    });
  });
  return deck;
}

// Get the active sound of a tile (respects chosen variant for dual tiles)
function getTileSound(tile) {
  if (tile.variants) return tile.variants[tile.activeVariant];
  return tile.text.replace(/-/g, "");
}

// Global tile ID counter — always increases, guarantees uniqueness across recycled decks
let _globalTileId = 10000;
function freshTileId() { return _globalTileId++; }

// Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── EMBEDDED WORD LIST (~1800 common English words) ─────────────────────────
// Embedded directly to avoid network dependency in the artifact sandbox
const WORD_LIST = [
  "abandon","ability","able","aboard","about","above","absence","absolute","absorb","abstract","accent","accept","access","account","accurate","acid","acknowledge","acquire","across","act","action","active","actual","actually","add",
  "addition","additional","address","adequate","adjust","admire","admit","adopt","adult","advance","advice","afford","afraid","after","afternoon","again","age","aged","ago","agree","agreement","ahead","aid","aim","air",
  "alarm","alert","alive","all","allow","almost","alone","along","already","also","alter","although","always","am","amazing","among","amount","an","and","angry","animal","announce","annoy","another","answer",
  "ant","any","anymore","anyone","anything","anyway","anywhere","ape","apologize","appeal","appear","apple","apply","approach","approve","apt","arc","arch","are","area","argue","ark","arm","army","around",
  "arrive","art","arts","as","ash","aside","ask","assign","assist","at","ate","attention","attract","available","avoid","away","awe","axe","baboon","baby","back","bad","bade","badge","bag",
  "bail","bait","bake","balance","bale","ball","balloon","ban","band","bane","bar","bare","bargain","bark","barn","base","bat","bath","bay","be","beach","bead","beak","beam","bean",
  "bear","beast","beat","because","become","bed","beef","been","beer","before","beg","began","behind","being","believe","bell","belt","bend","bent","best","bet","better","between","bid","big",
  "bike","bin","bird","bit","bite","black","bled","bless","blind","blood","bloom","blot","blow","blue","blur","boar","board","boast","boat","body","bog","bold","bolt","bone","book",
  "boon","bop","bore","born","both","bother","bought","bounce","box","boy","brag","brain","bran","brave","break","bred","brew","bright","brim","bring","broad","broil","broke","brother","brought",
  "brow","brown","buck","bud","budget","buds","bug","build","bull","bun","bunt","burn","burp","burr","burst","bus","bush","busy","but","buy","by","cab","cage","cake","calf",
  "call","calm","came","camp","can","cane","cap","cape","car","card","care","career","carry","cart","cartoon","case","cat","catch","cause","cave","cede","celebrate","cent","center","certain",
  "chain","challenge","chance","change","chap","character","charge","chase","chat","check","cheer","chef","chew","child","children","chin","chip","choice","choose","chop","city","clad","claim","clam","clan",
  "clap","class","claw","clay","clean","clear","climb","cling","clip","clock","clop","close","clot","cloth","cloud","clue","coat","cob","cod","cog","coil","cold","cole","collapse","collect",
  "color","come","comfort","command","commit","common","company","compare","complete","concern","conclude","condition","cone","connect","consider","contain","continue","control","cook","cool","cop","cope","copy","core","cork",
  "corn","cost","cot","could","count","country","coup","couple","course","court","cove","cover","cowl","coy","cram","cream","create","croon","crop","cross","crow","cub","cube","cuff","cup",
  "cure","curious","curl","cut","dab","dad","daily","dale","dam","damage","dame","dance","dare","dark","darn","dart","dash","date","dawn","day","days","dead","deaf","deal","dean",
  "dear","debt","decide","declare","decoy","deed","deem","deep","deer","defend","deft","degree","delay","deli","demand","den","dent","deny","depend","describe","desire","desk","destroy","develop","devote",
  "dew","dial","dice","did","died","diet","different","dig","dill","dim","dine","ding","dinner","dip","dire","direct","direction","directly","disappear","discover","discuss","dish","disk","distance","dive",
  "do","dock","does","dog","dome","done","door","dorm","dose","dot","dote","doubt","dove","down","draft","drag","drain","dram","draw","dream","drip","drive","drop","drug","drum",
  "duck","duel","dug","dull","dumb","dump","dunk","dupe","during","dusk","dust","each","eager","ear","earl","early","earn","earth","ease","east","easy","eat","edge","edit","educate",
  "egg","eight","either","elect","elf","elm","else","emerge","emit","empire","employ","empty","encourage","end","energy","enjoy","enough","epic","equal","era","escape","establish","evaluate","eve","even",
  "event","ever","every","evil","exactly","exam","examine","example","except","exist","expect","explain","explore","eye","face","fact","fad","fade","fail","faint","fair","faith","fall","fame","family",
  "fan","fang","far","fare","farm","fast","fat","fate","fawn","fax","fear","feast","feat","fed","feed","feel","feet","fell","felt","female","fern","few","fib","fig","fight",
  "figure","file","fill","film","final","find","fine","fink","fire","fish","fist","fit","five","fix","fizz","flag","flak","flan","flap","flat","flaw","flea","fled","flee","flex",
  "fling","flip","flit","float","floor","flop","flow","fly","foam","fobs","focus","fog","foil","fold","folk","follow","fond","font","food","fool","foot","for","force","ford","fore",
  "forget","fork","form","fort","forward","foul","found","four","fowl","fray","free","freeze","fresh","fret","friend","frog","from","front","fry","fuel","full","fume","fun","fund","funny",
  "furl","fuse","fuss","gab","gag","gain","gale","game","gap","gas","gash","gate","gave","gaze","gear","gel","geld","gem","general","generous","gentle","get","gig","gild","gill",
  "gilt","gin","girl","give","glad","gleam","glee","glen","glob","glow","glum","glut","gnat","gnu","go","goad","goat","gob","god","goes","gold","golf","gone","gong","good",
  "goof","gore","got","govern","gown","grab","grace","grain","grant","grasp","grass","gray","great","green","greet","grew","grim","grin","grip","grit","ground","group","grow","grub","guard",
  "guess","guide","guilt","gulf","gull","gun","gust","gut","guy","hack","had","hail","hale","half","hall","halo","halt","ham","hand","handle","hang","hank","happen","hard","hare",
  "harm","harp","harvest","has","hash","hat","hate","haul","have","hay","haze","he","head","heal","heap","hear","heart","heat","heavy","heed","heel","helm","help","hem","hen",
  "her","herb","herd","here","hew","hid","hide","high","hike","hill","hilt","him","hind","hint","hip","his","history","hit","hive","hoar","hoax","hob","hock","hog","hold",
  "hole","home","honor","hood","hoof","hook","hop","hope","horn","hose","host","hot","house","how","hub","hug","huge","hull","hum","human","hump","hunt","hurry","hurt","hut",
  "ice","icy","idea","idle","if","ill","imagine","imp","important","in","inch","include","increase","inform","information","ink","inn","inside","inspect","into","invite","involve","ion","ire","irk",
  "is","isolate","issue","it","its","ivy","jab","jade","jag","jail","jam","jape","jar","jest","jet","jibe","jig","jilt","jive","job","jog","join","jolt","jowl","joy",
  "judge","jug","junk","just","jut","keen","keep","keg","kelp","key","kid","kiln","kin","kind","king","kit","kite","knee","knew","knob","knock","knot","know","lab","lace",
  "lack","lad","lag","laid","lame","land","lane","lap","lard","large","lark","lash","lass","last","late","laud","laugh","law","lawn","leach","lead","leaf","leak","lean","leap",
  "learn","least","leave","led","leer","left","leg","lend","lens","lest","let","level","levy","lick","lid","lien","lieu","life","lift","light","like","lilt","lime","limit","limp",
  "line","link","lint","lip","list","listen","lit","little","live","load","loaf","loan","local","loft","log","long","look","loon","lore","lorn","lose","lost","lot","loud","lout",
  "love","low","luck","lug","lump","lure","lust","mace","mad","made","maid","mail","main","maintain","make","malt","man","manage","mane","many","map","march","mare","mark","marl",
  "mart","mast","mat","mate","math","matter","maw","may","maze","me","mead","meal","mean","measure","meat","meet","meld","melt","men","mere","mesh","mid","might","mild","mile",
  "milk","mill","mime","mind","mine","mint","mire","miss","mist","mite","mix","moat","mob","mold","mole","molt","monk","mood","moon","moor","moot","mop","more","morn","morning",
  "mort","most","moth","mother","move","much","muck","mud","mug","mugs","mule","multiply","musk","must","mute","nab","nag","nail","name","nap","nape","narrow","nation","natural","nave",
  "near","neat","need","nest","net","never","new","news","next","nice","nick","night","nil","nimble","nine","nip","no","nod","node","noon","nope","nor","norm","nose","not",
  "note","notice","now","number","nun","nut","oafs","oak","oar","oath","obey","oboe","observe","odd","odds","odes","odor","of","off","offer","often","oil","oils","old","omen",
  "on","once","one","ones","only","open","opt","or","oral","orb","order","ore","ores","organize","other","ouch","our","out","outside","oval","oven","over","owe","owl","owls",
  "own","owns","ozone","pace","pack","pad","page","paid","pail","pain","pal","palm","pan","pane","pap","paper","par","park","part","past","pat","path","pause","pave","paw",
  "pay","pea","peach","peak","peal","peat","peel","peer","peg","pelt","pen","people","perform","permit","pest","pew","phone","photo","phrase","pick","picture","pie","pier","pig","pike",
  "pile","pill","pin","pine","ping","pink","pipe","pit","place","plain","plan","play","plod","plot","plow","plug","plum","plus","ply","pod","pods","poem","point","pole","pond",
  "pool","poor","pop","pore","pose","possible","post","pot","pout","pow","power","practice","praise","pray","prefer","prepare","press","prey","pro","prod","produce","promise","promote","prop","prove",
  "provide","prude","pub","public","pug","pull","pump","pun","punt","pup","pure","pus","push","put","quail","question","quite","raccoon","race","rack","rag","rage","rail","rain","raise",
  "rake","ram","ran","rant","rap","rape","rare","rash","rat","rate","rave","raw","ray","reach","read","real","realize","really","reap","reason","receive","recycle","red","reduce","reel",
  "reflect","refuse","rein","relate","rely","remain","remember","rend","rep","repair","reply","report","reps","rescue","respond","rest","result","review","rib","rice","rich","rid","rife","rift","rig",
  "right","rim","ring","rink","riot","rip","rise","risk","rite","road","roam","roar","rob","robe","rock","rod","role","roll","romp","roof","room","root","rose","rot","rote",
  "round","rove","row","roy","rub","rude","rug","rule","rum","rump","run","rune","ruse","rush","rust","rut","rye","sac","sack","sad","safe","sag","sage","said","sail",
  "sake","sale","salt","same","sand","sane","sang","sank","sap","sash","sat","save","saw","say","scale","scan","scar","scat","school","scum","sea","seal","seam","search","seat",
  "second","secure","see","seed","seem","seen","seep","select","self","sell","send","sense","sent","set","settle","sew","sewn","sexy","shad","share","shed","shift","shin","ship","shop",
  "shot","show","shun","shut","shy","sign","silk","sill","silt","since","sing","sink","sip","sir","sit","site","size","ski","skim","skin","skip","sky","slab","slap","slat",
  "slaw","sled","sleep","slim","slip","slit","slob","slop","slot","slow","slug","slum","slur","sly","small","smile","smog","snag","snail","snap","snip","snob","snop","snow","snub",
  "so","soak","soap","soar","sob","sock","sod","soft","soil","sole","solve","some","sometimes","son","song","soon","soot","sop","sore","sorry","sort","sot","soul","sound","soup",
  "sour","south","sow","spa","span","spar","spat","speak","spend","spew","spin","spit","spoil","spoon","spot","spray","spread","sprig","spring","spun","spur","spy","stab","stain","stand",
  "star","start","stay","steam","stem","step","stew","still","stir","stob","stone","stop","store","story","straight","stray","stream","string","strong","struggle","strut","stub","stud","study","stun",
  "sty","sub","such","suds","sue","suit","sulk","sum","sump","sun","sung","sunk","sup","supply","support","suppose","sure","swam","swan","swap","swat","swig","swim","swing","swish",
  "swum","tab","table","tack","tail","take","tale","talk","tall","tame","tan","tang","tap","tar","tart","task","tat","taut","tax","taxi","teach","team","tear","tease","teem",
  "tell","ten","tend","tens","term","test","that","the","their","them","then","there","they","thin","thing","think","this","three","through","throw","thy","tide","tie","tiff","til",
  "tile","till","tilt","time","tin","tip","tire","to","toad","today","toe","together","toil","told","toll","tome","ton","too","took","tool","toot","top","tops","torn","toss",
  "tot","tote","touch","tour","tow","toward","town","toy","track","trail","train","trap","travel","tray","treat","tree","trim","trip","true","trust","try","tub","tuck","tuft","tug",
  "tun","tuna","tune","turf","turn","tusk","twig","twin","two","type","ugly","ulna","under","understand","unit","unite","until","up","upon","urge","urn","use","used","uses","vacation",
  "vain","vale","value","van","vane","vase","vast","vat","veal","veer","veil","vein","very","vest","veto","vice","view","vile","vine","visit","void","volt","volunteer","vomit","vote",
  "vow","wad","wade","wag","wage","wail","wake","wale","walk","wall","wand","wander","wane","want","war","ward","ware","warm","wart","was","watch","water","wave","way","we",
  "weak","weal","wean","weap","web","wed","weed","week","ween","weep","welcome","well","welt","went","were","wet","what","wheat","when","where","which","while","whim","whip","whir",
  "who","why","wide","wig","wile","will","wilt","wily","win","wind","wing","wink","wire","wise","wish","wisp","wit","with","woe","woke","wolf","womb","wonder","woo","wood",
  "wool","word","wore","work","world","worm","worn","worry","worship","would","wow","wrap","wren","writ","write","yak","yam","yap","yaw","year","yeast","yell","yen","yes","yet",
  "yew","yore","you","young","your","yurt","zap","zeal","zinc","zip","zit","zone","zoo","zoom",
  "absent", "achieve", "adapt", "advise", "aloud", "amid", "angel", "ankle", "annex", "apart", "arise", "arrow",
  "asleep", "atlas", "atom", "attic", "audio", "aunt", "awake", "aware", "awful", "axle", "azure", "badly",
  "bagel", "barge", "basic", "batch", "bathe", "beard", "beckon", "begin", "belly", "below", "bench", "berry",
  "birth", "blade", "bland", "blaze", "bliss", "blond", "blown", "blues", "bonus", "booth", "brake", "bread",
  "breed", "breve", "brick", "bride", "brief", "brine", "brood", "brook", "broom", "broth", "bruise", "bruit",
  "brunt", "brush", "built", "bulge", "bunch", "buyer", "cabin", "camel", "candy", "cannot", "carve", "cease",
  "cedar", "chair", "chalk", "charm", "cheap", "cheek", "chess", "chest", "chewy", "chief", "china", "chose",
  "civic", "civil", "clash", "clerk", "clown", "clump", "coast", "cobra", "cocoa", "comet", "comic", "coral",
  "cough", "craft", "crane", "crash", "crazy", "creek", "creep", "crime", "crisp", "crowd", "crown", "cruel",
  "crush", "curve", "cycle", "daddy", "dairy", "daisy", "damp", "dangle", "daring", "darken", "daughter", "daze",
  "decay", "deck", "decline", "decree", "define", "dense", "depth", "design", "detail", "devil", "devise", "differ",
  "digit", "dirty", "disco", "ditch", "diver", "divine", "dodge", "doing", "dozen", "drama", "drape", "drove",
  "drown", "dunce", "dusty", "dwarf", "dwell", "elbow", "eldest", "embed", "enter", "entry", "erase", "exact",
  "extra", "fable", "false", "fancy", "fasten", "father", "fault", "fetch", "field", "fifth", "finger", "first",
  "fixed", "flame", "flank", "flash", "flask", "flesh", "flock", "floss", "flour", "fluent", "flute", "flyby",
  "forge", "forth", "fossil", "frame", "froze", "fruit", "fully", "fuzzy", "gains", "glare", "glass", "gloom",
  "gloss", "glove", "going", "gorge", "grade", "grand", "graze", "grief", "groan", "groin", "groom", "gross",
  "grove", "grown", "gruel", "guise", "gulch", "gully", "gusto", "habit", "haven", "hedge", "heist", "hence",
  "herbs", "heron", "hinge", "hippo", "hoist", "holly", "horse", "hotel", "hover", "humid", "hyena", "icing",
  "ideal", "image", "imply", "infer", "inlet", "inner", "input", "inter", "intro", "ivory", "joint", "joust",
  "juicy", "jumpy", "kayak", "kinship", "kitty", "knack", "knave", "kneel", "knife", "knight", "known", "koala",
  "label", "lance", "laser", "later", "layer", "leafy", "lilac", "linen", "lingo", "lithe", "lodge", "login",
  "loopy", "lover", "lower", "loyal", "lucid", "lunar", "lusty", "magic", "major", "manga", "manor", "match",
  "matte", "maxim", "maybe", "melon", "mercy", "merge", "metal", "micro", "minor", "minus", "mirth", "miser",
  "model", "money", "month", "moral", "mossy", "motor", "mount", "mourn", "muddy", "multi", "music", "myrrh",
  "naive", "named", "nature", "naval", "nerve", "newly", "niece", "noble", "noise", "north", "noted", "novel",
  "nurse", "ocean", "olive", "onset", "orbit", "outer", "ovoid", "owned", "oxide", "paint", "panel", "panic",
  "paste", "patch", "pearl", "pedal", "penny", "perch", "petal", "phase", "piano", "pilot", "pinch", "pixie",
  "pizza", "plane", "plant", "plate", "plaza", "plead", "plump", "plush", "polar", "poppy", "porch", "pounce",
  "price", "prime", "print", "prism", "probe", "prune", "psalm", "pudgy", "pulse", "pupil", "purse", "quill",
  "quota", "raven", "realm", "reign", "relax", "renew", "repay", "repel", "rerun", "rider", "risky", "rival",
  "rivet", "robin", "rocky", "roman", "rouge", "rouse", "route", "rover", "rowdy", "royal", "rugby", "ruler",
  "rusty", "sable", "saint", "salad", "sandy", "savvy", "scald", "scalp", "scene", "scone", "scope", "score",
  "scorn", "scout", "scrap", "screw", "sedan", "seize", "serve", "setup", "seven", "shade", "shaft", "shake",
  "shale", "shall", "shame", "shark", "sharp", "shave", "sheep", "shelf", "shell", "shine", "shirt", "shock",
  "shore", "short", "shout", "shove", "siege", "sight", "sigma", "silky", "siren", "sixth", "sixty", "skate",
  "skill", "skimp", "skull", "slate", "slave", "sleet", "slime", "slope", "sloth", "slump", "smart", "smear",
  "smell", "smoke", "snack", "snake", "sneak", "snore", "snowy", "sober", "solar", "solid", "spark", "spawn",
  "speed", "spice", "spike", "spine", "spite", "splash", "spoke", "sport", "spout", "squad", "squat", "stage",
  "stake", "stale", "stall", "stamp", "stare", "state", "stays", "steep", "steer", "stern", "stick", "stiff",
  "stilt", "sting", "stomp", "stood", "storm", "stout", "straw", "strip", "stump", "style", "suite", "sulky",
  "sunny", "super", "surge", "swamp", "swear", "sweat", "sweet", "swept", "swerve", "swift", "sword", "swore",
  "syrup", "talon", "taste", "teeth", "tempo", "tense", "terms", "theft", "theme", "these", "thick", "third",
  "thorn", "those", "threw", "thrill", "throb", "thumb", "tidal", "tiger", "tight", "timed", "titan", "toast",
  "token", "total", "totem", "tough", "trace", "tramp", "traps", "tread", "trend", "triad", "tribe", "trice",
  "trill", "troop", "trove", "truce", "trump", "tunic", "twang", "tweet", "twice", "twirl", "twist", "tying",
  "ultra", "uncle", "unfit", "union", "upper", "upset", "urban", "usage", "usher", "using", "usual", "utter",
  "valid", "valve", "vapor", "venom", "verse", "video", "vigil", "viola", "viral", "visor", "vista", "vital",
  "vocal", "vogue", "vouch", "vowel", "vulva", "woken", "woman", "women", "worth", "wrote", "xenon", "yacht",
  "yield", "zebra", "zesty",
  // ── Animals & living creatures ───────────────────────────────────────────────
  "bee","ant","bat","cat","cow","dog","doe","eel","elk","ewe","fly","fox","gnu","hen","hog","jay","koi","owl","pig","ram","rat","yak","ape",
  "bear","bird","boar","buck","bull","calf","clam","colt","crab","crow","dart","deer","dove","duck","fawn","fish","flea","frog","gnat","goat","hare","hawk","ibis","kite","lamb","lark","lion","loon","lynx","mink","mole","moth","mule","newt","pony","prey","puma","snail","slug","swan","toad","vole","wasp","wren","worm",
  "adder","bison","cobra","coral","crane","eagle","finch","gecko","goose","grebe","heron","horse","hyena","koala","llama","leech","lemur","louse","macaw","midge","moose","otter","panda","perch","prawn","quail","raven","shark","sheep","shrew","skunk","sloth","snipe","squid","stork","swallow","tapir","tiger","trout","viper","whale","zebra",
  "badger","beaver","canary","donkey","falcon","ferret","gibbon","gopher","iguana","jaguar","lizard","locust","magpie","marten","mayfly","monkey","osprey","parrot","pigeon","plover","rabbit","reindeer","robins","salmon","seahorse","spider","stoat","thrush","toucan","turtle","walrus","weasel","condor",
  "buffalo","buzzard","cheetah","chicken","dolphin","gorilla","hamster","lobster","panther","pelican","penguin","piranha","platypus","porcupine","rooster","sparrow","termite","vulture","wildcat",
  "alligator","armadillo","chameleon","crocodile","dragonfly","flamingo","greyhound","hedgehog","jellyfish","ladybird","manatee","meerkat","mongoose","nighthawk","nightowl","octopus","opossum","parakeet","pheasant","porpoise","scorpion","starfish","stingray","tarantula","tortoise","treefrog","woodpecker",
  // ── Plants, nature, environment ──────────────────────────────────────────────
  "oak","elm","ash","fir","ivy","bay","bud","bur","fen","fen","log","bog","mop","pod","sap","sod","fen",
  "aloe","bark","bulb","bush","cane","clod","corm","dune","fern","foam","glen","gust","hail","heap","herb","hill","husk","iris","kelp","knot","lake","lava","lawn","leaf","loam","loch","loft","mare","marsh","mead","mesa","mire","mist","moor","moss","muck","mudd","peak","peat","pine","pond","pool","pore","reef","rime","root","rose","rune","rush","sage","sand","seed","shoal","silt","sloe","soil","stem","stump","surf","tarn","thorn","tide","turf","vale","vine","weed","wood",
  "acorn","algae","alder","aspen","beach","birch","bloom","bluff","bough","brook","brush","cedar","chalk","cliff","clove","clump","coast","coral","creek","daisy","delta","drift","field","fjord","flint","flora","floss","foliage","forest","frost","fungi","glade","gorge","gourd","grain","grape","grass","gravel","grove","gulch","heath","holly","inlet","knoll","lilac","lilly","loess","maple","marsh","mauve","monte","mulch","nettle","night","ozone","patch","peach","plume","pollen","poppy","prism","ridge","river","scrub","sedge","shore","shrub","slope","smoke","snowy","solar","spine","spore","sprig","spruce","stalk","swamp","thorn","thyme","tulip","tundra","water","willow","woods",
  "canyon","cavern","cobalt","cobble","coppice","crevice","fossil","fallow","fescue","flower","foxtail","fungus","geyser","ginkgo","glacial","harbor","jungle","lagoon","lichen","mangrove","meadow","mellow","millet","morass","nutmeg","orchid","pampa","pebble","pepper","petrol","planks","plover","poplar","prairie","pumice","ravine","rubble","runoff","savanna","sector","shoal","sierra","sorrel","steppe","stream","summit","sunflower","symbol","thistle","valley","walnut","warbler","willow"
];

const WORD_SET = new Set(WORD_LIST);

function getWordSet() {
  return Promise.resolve(WORD_SET);
}

function buildWordFromTiles(tiles) {
  return tiles.map(t => getTileSound(t)).join("").toLowerCase();
}

function checkWordInSet(word) {
  const w = word.toLowerCase();
  return WORD_SET.has(w) || SESSION_CUSTOM_WORDS.has(w);
}

function addCustomWord(word) {
  SESSION_CUSTOM_WORDS.add(word.toLowerCase());
}

// Session-local custom words added by the player (resets on page refresh)
const SESSION_CUSTOM_WORDS = new Set();

// ─── HOVER WORD SMOKE SYSTEM ─────────────────────────────────────────────────
// Extra words for sounds not well-covered by the main word list
const EXTRA_SOUND_WORDS = {
  "ness":  ["kindness","darkness","sadness","fitness","madness","illness","boldness","fullness","softness","fairness","witness","calmness","oddness","richness","wetness","gladness"],
  "eur":   ["neur","ateur","grandeur","liqueur","chauffeur","entrepreneur","connoisseur","saboteur","raconteur","masseur","pasteur","voyeur"],
  "eer":   ["beer","deer","peer","seer","veer","cheer","sheer","steer","career","pioneer","volunteer","engineer","sincere","appear","casheer"],
  "ier":   ["tier","pier","cashier","frontier","soldier","barrier","carrier","warrior","premier","elier","earlier","heavier","merrier","stormier"],
  "oor":   ["door","floor","poor","moor","boor","spoor","outdoor","indoor","hardcore","overlook","overlord","folklore","sophomore"],
  "oar":   ["oar","boar","soar","roar","board","hoard","hoarse","coarse","aboard","cupboard"],
  "tch":   ["watch","catch","match","patch","scratch","stretch","ditch","witch","fetch","sketch","notch","latch","hutch","Dutch","stitch","switch","batch","hatch","snatch","wretch"],
  "ck":    ["back","black","block","brick","check","click","clock","crack","deck","dock","duck","flick","flock","hack","kick","knock","lock","luck","neck","nick","pack","pick","puck","rack","rick","rock","sack","sick","slack","slick","smack","snack","sock","stack","stick","stock","stuck","thick","tick","track","trick","truck","tuck","whack","wreck"],
  "tch":   ["catch","fetch","hatch","latch","match","notch","patch","pitch","ratch","sketch","snatch","stitch","stretch","switch","watch","witch","wretch"],
  "wh":    ["what","when","where","which","while","whip","whirl","whisper","whistle","white","whole","whom","whose","why","wheel","wheat","whack","whale","whine","whiff"],
  "ph":    ["phone","photo","phrase","graph","alpha","elephant","orphan","trophy","triumph","dolphin","phantom","prophet","typhoon","nephew","sphere","alphabet","emphasis","philosophy","physician","pharmacy","phenomenon","physique","symphony"],
  "ng":    ["ring","sing","king","wing","thing","bring","string","spring","swing","fling","cling","along","among","belong","strong","tongue","young","song","long","wrong","gang","hang","rang","sang","bang","rang","clang","slang","tong","prong","gong","throng","sponge","plunge","lunge","cringe","fringe","hinge","singe","tinge"],
  "nk":    ["bank","blank","blink","brink","chunk","clank","clink","clunk","crank","drink","dunk","flank","flunk","frank","funk","hunk","ink","junk","link","mink","monk","pink","plank","plunk","prank","rank","rink","sank","shrink","shrunk","sink","skunk","skank","slunk","slink","spank","spunk","stank","stink","stunk","sunk","tank","think","think","thank","trunk","wink"],
  "al":    ["also","almost","always","already","although","alert","allow","alter","alcohol","album","algebra","alien","alley","almond","alone","along","aloud","altar","alternative","altogether","balance","call","fall","hall","tall","wall","shall","small","install","recall","stall"],
  "ol":    ["old","bold","cold","fold","gold","hold","mold","sold","told","bolt","colt","jolt","molt","volt","folk","yolk","colonel","alcohol","dolphin","evolve","revolve","solve","involve","dissolve","abolish","polish","solid","volume","column","control","enroll","scroll","roll","stroll","toll"],
  "ge":    ["age","cage","page","rage","sage","stage","large","surge","merge","gorge","forge","urge","charge","change","strange","grange","fringe","cringe","budge","fudge","judge","lodge","nudge","smudge","trudge","wedge","hedge","ledge","pledge","edge","bridge","ridge","fridge","grudge","sludge"],
  "qu":    ["queen","quest","queue","quick","quiet","quit","quite","quiz","quack","quake","quart","quartz","query","quill","quota","quote","square","squash","squeak","squeeze","squid","squint","squirm","squirt","squish","liquid","unique","sequel","equal","frequent","request","require","quarter","qualify"],
  "cy":    ["icy","juicy","spicy","fancy","ancy","mercy","percy","policy","agency","legacy","privacy","vacancy","urgency","currency","frequency","democracy","accuracy","pharmacy","pregnancy","tendency","efficiency"],
  "eu":    ["feud","neutral","neuron","neutron","Europe","eureka","pneumonia","reunion","beautiful","museum","leukemia","rheumatism","lieutenant","therapeutic","pharmaceutical","euphoria","euthanasia","eulogy","euphemism","Europe"],
  "ew":    ["new","few","dew","sew","blew","brew","chew","clew","crew","drew","flew","grew","knew","slew","stew","threw","view","anew","renew","review","cashew","nephew","curfew","Hebrew","preview","interview"],
  "gu":    ["guess","guest","guide","guild","guilt","guitar","guise","gust","gun","gum","gut","guy","guard","guarantee","guardian","guerrilla","language","vague","league","plague","rogue","ogue","ogue","plague"],
  "dr":    ["drag","drain","draw","dream","dress","drift","drink","drive","drop","drum","dry","drab","draft","drake","drape","drastic","drizzle","drone","drool","droop","drove","drown","drudge","drug","drunk","dusk"],
  "tr":    ["trace","track","trade","trail","train","trap","trash","tray","tree","trim","trip","trot","truck","true","trust","try","trace","trance","transfer","transform","translate","transport","travel","treasure","treat","tremble","tremendous","trend","triangle","tribe","trick","trigger","triumph","trouble","trout","trunk","trust"],
  "suffix":["-ing","-ed","-ly","-ness","-ment","-ful","-less","-tion","-sion","-ous","-ious","-ious","-al","-ial","-able","-ible","-ize","-ise","-ify","-fy","-en","-er","-est","-th","-ward","-wards","-wise","-hood","-dom","-ship","-ism","-ist","-ity","-ty","-age"],
  "pre":   ["prefix","predict","prepare","prevent","previous","preview","precede","prefer","prefer","present","preserve","pretend","pretty","prevent","previous","price","pride","print","prison","private","prize","problem","process","produce","progress","project","promise","protect","provide","prove"],
  "un":    ["unable","uncle","under","undo","unfair","unhappy","unkind","unless","until","unusual","unwell","unzip","unlock","unload","unite","unique","universe","unknown","unlikely","undo","unfold","uncover","unpack","unreal","unsafe","untrue"],
  "re":    ["read","real","ready","recent","record","reduce","refer","relax","remain","remind","remove","repair","repeat","replace","reply","report","resist","result","return","reveal","reward","rewind","rewrite","reuse","rebuild","refresh","refund","refuse","regard","relate","release","rely","remark","rent","rescue","resolve","respect","rest","review"],
  "mis":   ["mistake","misplace","misread","mislead","misuse","misguide","miscount","misbehave","mishap","misprint","misquote","misshapen","misspell","mistime","misunderstand","misjudge","mishandle","misfire","misfit"],
  "dis":   ["discover","disease","dislike","dismiss","display","distance","disturb","divide","dizzy","disagree","disappear","disappoint","discard","disconnect","discourage","discuss","displace","disrupt","dissolve","distinct","distract","distribute","district","distrust","disturb"],
  "ing":   ["ring","sing","king","wing","bring","spring","string","swing","thing","fling","cling","sting","sling","along","among","doing","going","being","saying","making","taking","coming","finding","getting","giving","having","keeping","knowing","living","looking","moving","playing","putting","reading","seeing","standing","thinking","trying","using","working"],
  "tion":  ["action","addition","caution","condition","direction","education","election","emotion","fraction","function","mention","motion","nation","notion","option","portion","question","section","solution","station","tradition","vacation"],
  "ful":   ["awful","careful","cheerful","colorful","doubtful","dreadful","faithful","fearful","forceful","fruitful","graceful","grateful","handful","harmful","hateful","helpful","hopeful","hurtful","joyful","lawful","mindful","peaceful","playful","powerful","restful","skillful","thankful","truthful","useful","watchful","wishful","wonderful","youthful"],
  "less":  ["careless","fearless","helpless","hopeless","homeless","jobless","lawless","lifeless","mindless","nameless","painless","pointless","powerless","restless","senseless","shameless","sleepless","speechless","tasteless","thankless","thoughtless","timeless","useless","voiceless","worthless"],
  "ment":  ["agreement","argument","cement","comment","department","development","document","element","employment","entertainment","environment","equipment","excitement","government","improvement","instrument","judgement","management","measurement","movement","payment","punishment","replacement","requirement","retirement","settlement","statement","treatment"],
};

// Build map from main word list
const SOUND_WORDS_MAP = (() => {
  const map = {};
  // Seed with extra curated words first
  for (const [key, words] of Object.entries(EXTRA_SOUND_WORDS)) {
    map[key] = [...words];
  }
  // Then add from main word list
  for (const word of WORD_LIST) {
    for (let start = 0; start < word.length; start++) {
      for (let len = 1; len <= 4 && start + len <= word.length; len++) {
        const key = word.slice(start, start + len);
        if (!map[key]) map[key] = [];
        if (map[key].length < 40 && !map[key].includes(word)) map[key].push(word);
      }
    }
  }
  return map;
})();

function getWordsForSound(sound) {
  const key = sound.split("/")[0].toLowerCase().replace(/-/g, "");
  return SOUND_WORDS_MAP[key] || SOUND_WORDS_MAP[sound.toLowerCase()] || [];
}

// CSS-animated smoke word — each word is a self-contained animated div
let _smokeId = 0;
function makeSmokeWord(word, originX, originY, color) {
  const drift = (Math.random() - 0.5) * 50;      // gentle horizontal offset
  const duration = 2.8 + Math.random() * 1.6;     // 2.8s–4.4s float time
  const fontSize = 12 + Math.floor(Math.random() * 7);
  const delay = 0;
  const rise = 140 + Math.random() * 80;           // how far up it travels (px)
  return { id: _smokeId++, word, originX, originY, drift, duration, fontSize, color, rise, delay, born: Date.now() };
}

function SmokeWord({ p, onDone }) {
  // Remove from DOM after animation completes
  useEffect(() => {
    const t = setTimeout(onDone, (p.duration + 0.3) * 1000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      position: "fixed",
      left: p.originX + p.drift,
      top: p.originY - 8,
      transform: "translateX(-50%)",
      color: p.color,
      fontSize: p.fontSize,
      fontFamily: "'Noto Serif SC', serif",
      fontWeight: 700,
      letterSpacing: "0.05em",
      whiteSpace: "nowrap",
      textShadow: `0 0 12px ${p.color}88`,
      pointerEvents: "none",
      userSelect: "none",
      animation: `smokeRise ${p.duration}s ease-out forwards`,
      zIndex: 9999,
    }}>
      {p.word}
    </div>
  );
}

function WordSmokeCanvas({ words, onWordDone }) {
  if (words.length === 0) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {words.map(p => <SmokeWord key={p.id} p={p} onDone={() => onWordDone(p.id)} />)}
    </div>
  );
}


// ─── GLOBAL SETTINGS (defaults) ──────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  smokeEffect: false,
  cheerEffect: true,
  hintPenalty: true,
  tileAnimations: true,
  soundLabels: true,
  autoMakeWord: true,
  soundEffects: 0.5,
  ambientMusic: 0.5,
  tileTheme: "neon",   // "neon" | "mahjong" | "paper"
};

// ─── TILE THEMES ──────────────────────────────────────────────────────────────
const TILE_THEMES = {
  neon: {
    label: "Neon",
    emoji: "🌙",
    desc: "Dark background with glowing neon tiles",
    preview: ["#E84855","#2EC4B6","#FFBF69","#C77DFF","#9EF01A"],
    pageBg: "#0d0d14",
    pageText: "#e0e0f0",
    pageBgImage: true,
    tileBg: (cat, selected) => selected
      ? `linear-gradient(145deg, ${cat.color}33, ${cat.color}18)`
      : `linear-gradient(145deg, #1e1e2e, #16161f)`,
    tileBorder: (cat, selected) => selected
      ? `2.5px solid ${cat.accent}`
      : `1.5px solid ${cat.color}44`,
    tileText: (cat, selected) => selected ? cat.accent : cat.color,
    tileShadow: (cat, selected, highlighted) => selected
      ? `0 8px 24px ${cat.color}55, 0 0 0 1px ${cat.color}44`
      : highlighted
      ? `0 0 0 2px #f0c06088, 0 0 16px 4px #f0c06044, 0 3px 8px #00000088`
      : `0 3px 8px #00000088, inset 0 1px 0 #ffffff0a`,
    labelColor: (cat) => cat.color,
    cardBg: "#ffffff06",
    cardBorder: "#ffffff10",
    headerBg: "#0d0d1499",
    headerBorder: "#ffffff0f",
  },
  mahjong: {
    label: "Mahjong",
    emoji: "🀄",
    desc: "Classic ivory tiles on green felt",
    preview: ["#c8401a","#1a6b3a","#b8860b","#1a4276","#2a6b2a"],
    pageBg: "#2d5a27",
    pageText: "#f5f0e8",
    pageBgImage: false,
    // Ivory tile face with thick raised-edge effect (like real mahjong bone tiles)
    tileBg: (cat, selected) => selected
      ? `linear-gradient(160deg, #fff8e8 0%, #f0e0b0 40%, #e8d090 100%)`
      : `linear-gradient(160deg, #fffef8 0%, #faf0d8 50%, #f0e4c0 100%)`,
    tileBorder: (cat, selected) => selected
      ? `2px solid ${cat.color}` 
      : `2px solid #c8a870`,
    tileText: (cat, selected) => cat.color,  // category colour shows through on ivory
    tileShadow: (cat, selected, highlighted) => selected
      ? `4px 6px 0 #7a5a2a, 0 8px 20px ${cat.color}55, inset 0 1px 0 #ffffff99`
      : highlighted
      ? `3px 5px 0 #c8a870, 0 0 0 2px #d4a020, inset 0 1px 0 #ffffff99`
      : `3px 5px 0 #9a7a40, inset 0 1px 0 #ffffff99, inset 0 -1px 0 #c8a87044`,
    labelColor: (cat) => cat.color,
    cardBg: "#1e4a1a",
    cardBorder: "#3a7a30",
    headerBg: "#1a3a16cc",
    headerBorder: "#3a7a30",
  },
  paper: {
    label: "Paper",
    emoji: "📄",
    desc: "Clean white with strong ink contrast",
    preview: ["#c8000a","#0a6b5a","#8a5a00","#5a0a8a","#2a6a00"],
    pageBg: "#f4f1eb",
    pageText: "#1a1208",
    pageBgImage: false,
    // White tile, dark ink text, bold coloured border
    tileBg: (cat, selected) => selected
      ? `linear-gradient(145deg, ${cat.color}28, ${cat.color}10)`
      : `#ffffff`,
    tileBorder: (cat, selected) => selected
      ? `2.5px solid ${cat.color}`
      : `2px solid ${cat.color}cc`,
    tileText: (cat, selected) => {
      // Darken each category colour significantly for ink-on-paper legibility
      const darkMap = {
        "#E84855": "#8a000a", "#F4A261": "#7a3a00", "#2EC4B6": "#006b5a",
        "#CBF3F0": "#005a50", "#FFBF69": "#7a4a00", "#C77DFF": "#5a0090",
        "#9EF01A": "#3a7000",
      };
      return darkMap[cat.color] || "#1a1208";
    },
    tileShadow: (cat, selected, highlighted) => selected
      ? `0 6px 16px ${cat.color}55, 0 2px 0 ${cat.color}88`
      : highlighted
      ? `0 0 0 2.5px #d4a020, 0 4px 12px #d4a02033`
      : `0 2px 0 ${cat.color}55, 0 3px 8px #00000018`,
    labelColor: (cat) => {
      const darkMap = {
        "#E84855": "#8a000a", "#F4A261": "#7a3a00", "#2EC4B6": "#006b5a",
        "#CBF3F0": "#005a50", "#FFBF69": "#7a4a00", "#C77DFF": "#5a0090",
        "#9EF01A": "#3a7000",
      };
      return darkMap[cat.color] || "#1a1208";
    },
    cardBg: "#ffffff",
    cardBorder: "#d0c8b8",
    headerBg: "#f4f1ebee",
    headerBorder: "#d0c8b8",
  },
};

// ─── AUDIO ENGINE ─────────────────────────────────────────────────────────────
const AudioEngine = (() => {
  // ─────────────────────────────────────────────────────────────────────────
  // Browser autoplay policy: AudioContext MUST be created inside a user
  // gesture handler (click / keydown).  We defer everything until unlock().
  // Stackblitz iframes are extra-strict — we also play a silent buffer on
  // first interaction to force the context out of "suspended" state.
  // ─────────────────────────────────────────────────────────────────────────
  let ctx          = null;
  let sfxBus       = null;   // gain node all SFX route through
  let musicNodes   = null;   // { master, intervalId }
  let musicRunning = false;
  let unlocked     = false;
  let pendingMusic = false;  // startMusic() called before unlock?
  let sfxVol       = 0.5;
  let musicVol     = 0.5;

  // ── Create / resume context (only ever called post-gesture) ───────────────
  const boot = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { return false; }
    // Build SFX bus
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxVol;
    sfxBus.connect(ctx.destination);
    // Play a zero-length silent buffer — forces "suspended→running" in Chrome
    const sil = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = sil; src.connect(ctx.destination); src.start(0);
    return true;
  };

  // ── Public: call on first click anywhere in the app ───────────────────────
  const unlock = () => {
    if (unlocked) return;
    if (!boot()) return;
    ctx.resume().then(() => {
      unlocked = true;
      if (pendingMusic && musicVol > 0) { pendingMusic = false; _startMusicNow(); }
    });
  };

  // ── Primitive builders (safe — return early if not ready) ─────────────────
  const oscNote = (freq, type, t0, dur, vol) => {
    if (!unlocked || !ctx || !sfxBus) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
    g.connect(sfxBus);
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime + t0);
    o.connect(g); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.06);
  };

  const noiseBlip = (t0, dur, vol) => {
    if (!unlocked || !ctx || !sfxBus) return;
    const len = Math.max(1, Math.ceil(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
    s.connect(g); g.connect(sfxBus);
    s.start(ctx.currentTime + t0); s.stop(ctx.currentTime + t0 + dur + 0.06);
  };

  const sweep = (f0, f1, dur, vol, type = 'sine') => {
    if (!unlocked || !ctx || !sfxBus) return;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(f1, ctx.currentTime + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur + 0.04);
    o.connect(g); g.connect(sfxBus);
    o.start(); o.stop(ctx.currentTime + dur + 0.08);
  };

  // ── Sound library ──────────────────────────────────────────────────────────
  const sounds = {
    tileClick()   { noiseBlip(0,0.035,0.22); oscNote(240,'sine',0,0.065,0.12); },
    tileCycle()   { oscNote(880,'sine',0,0.10,0.13); oscNote(1100,'sine',0.06,0.09,0.09); },
    wordCorrect() { [523,659,784,1047,1319].forEach((f,i)=>oscNote(f,'sine',i*0.07,0.30,0.20)); noiseBlip(0.08,0.25,0.06); },
    wordWrong()   { oscNote(130,'sawtooth',0,0.14,0.26); oscNote(95,'square',0.05,0.12,0.16); noiseBlip(0,0.09,0.13); },
    roundEnd()    { [[523,0],[659,.09],[784,.18],[1047,.27],[784,.40],[1047,.49],[1319,.58]].forEach(([f,t])=>oscNote(f,'sine',t,0.40,0.20)); },
    gameStart()   { [392,523,659].forEach((f,i)=>oscNote(f,'sine',i*0.13,0.34,0.16)); },
    timeUp()      { sweep(660,220,0.65,0.24); },
    timerTick()   { oscNote(900,'square',0,0.05,0.07); },
    modeSelect()  { oscNote(523,'sine',0,0.14,0.18); oscNote(784,'sine',0.08,0.18,0.20); oscNote(1047,'sine',0.18,0.22,0.16); noiseBlip(0.15,0.14,0.05); },
    menuClick()   { oscNote(440,'sine',0,0.08,0.14); oscNote(550,'sine',0.05,0.07,0.10); },
    modalOpen()   { sweep(200,600,0.22,0.10); noiseBlip(0,0.18,0.04); },
    modalClose()  { sweep(600,280,0.16,0.09); },
    backToMenu()  { oscNote(523,'sine',0,0.14,0.14); oscNote(392,'sine',0.10,0.18,0.12); },
    dealTiles()   { for(let i=0;i<6;i++){ noiseBlip(i*0.055,0.04,0.12); oscNote(300+i*30,'sine',i*0.055,0.05,0.07); } },
    hintReveal()  { sweep(300,900,0.30,0.14); },
    resetGame()   { oscNote(392,'sine',0,0.12,0.14); oscNote(330,'sine',0.10,0.12,0.11); oscNote(261,'sine',0.20,0.15,0.09); },
    sessionEnd()  { [392,494,523,659,784].forEach((f,i)=>oscNote(f,'sine',i*0.10,0.45,0.18)); noiseBlip(0.35,0.30,0.06); },
  };

  // ── Ambient music ──────────────────────────────────────────────────────────
  const PENTA = [261.63,293.66,329.63,392.00,440.00,523.25,587.33,659.26];
  const BASS  = [65.41,73.42,82.41,98.00];

  const _startMusicNow = () => {
    if (musicRunning || !ctx) return;
    musicRunning = true;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(musicVol * 0.12, ctx.currentTime + 2.5);
    master.connect(ctx.destination);
    const dly = ctx.createDelay(0.5); dly.delayTime.value = 0.28;
    const fb  = ctx.createGain(); fb.gain.value = 0.32;
    const wet = ctx.createGain(); wet.gain.value = 0.38;
    dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(master);
    const pn = (freq, time, dur, vol, type='sine') => {
      if (!musicRunning) return;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime+time);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime+time+0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+time+dur);
      g.connect(master); g.connect(dly);
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.connect(g);
      o.start(ctx.currentTime+time); o.stop(ctx.currentTime+time+dur+0.1);
    };
    let beat = 0; const BAR = 1.9;
    const sched = () => {
      if (!musicRunning) return;
      const mel = [0,1,2,3,4,5,6,7].sort(()=>Math.random()-0.5).slice(0,5);
      mel.forEach((idx,i)=>{ const t=beat+i*(BAR/5)+Math.random()*0.04; pn(PENTA[idx]*(Math.random()<0.3?2:1),t,BAR*0.44,0.20+Math.random()*0.07); });
      const bi=Math.floor(Math.random()*BASS.length);
      pn(BASS[bi],beat,BAR*0.8,0.17,'triangle');
      if(Math.random()<0.5) pn(BASS[bi]*1.5,beat+BAR*0.5,BAR*0.38,0.09,'triangle');
      if(Math.floor(beat/BAR)%2===0) [261.63,329.63,392.00].forEach((f,i)=>pn(f,beat+i*0.04,BAR*1.55,0.06));
      beat+=BAR;
    };
    sched();
    musicNodes = { master, intervalId: setInterval(sched, BAR*1000) };
  };

  const startMusic = () => {
    if (musicVol <= 0) return;          // slider is at 0, don't start
    if (!unlocked) { pendingMusic = true; return; }
    _startMusicNow();
  };

  const stopMusic = () => {
    pendingMusic = false;
    if (!musicNodes) { musicRunning = false; return; }
    musicRunning = false;
    clearInterval(musicNodes.intervalId);
    try { musicNodes.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.8); } catch(e){}
    musicNodes = null;
  };

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    unlock,
    play(name) { try { if (sfxVol > 0) sounds[name]?.(); } catch(e){} },
    startMusic,
    stopMusic,
    setSfxVolume(v) {
      sfxVol = v;
      if (sfxBus && ctx) sfxBus.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.1);
    },
    setMusicVolume(v) {
      musicVol = v;
      if (!unlocked) return;
      if (v <= 0) { stopMusic(); return; }
      if (!musicRunning) { startMusic(); return; }
      if (musicNodes?.master && ctx)
        musicNodes.master.gain.linearRampToValueAtTime(v * 0.12, ctx.currentTime + 0.3);
    },
  };
})();
// ─── TILE COMPONENT─────────────────────────────────────
function Tile({ tile, selected, highlighted, autoPulse, onClick, onCycleVariant, onHover, disabled, small, theme, animated = true, showLabel = true }) {
  const cat = TILE_CATEGORIES[tile.category];
  const size = small ? 52 : 64;
  const isDual = !!(tile.variants && tile.variants.length > 1);
  const activeSound = getTileSound(tile);
  const th = TILE_THEMES[theme] || TILE_THEMES.neon;
  const isMahjong = theme === "mahjong";

  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={e => { if (!disabled && onHover) { const r = e.currentTarget.getBoundingClientRect(); onHover(tile, r.left + r.width/2, r.top + r.height/2); } }}
      onMouseLeave={() => { if (onHover) onHover(null, 0, 0); }}
    >
      <button
        onClick={e => { e.stopPropagation(); if (!disabled) onClick(tile); }}
        disabled={disabled}
        style={{
          width: size,
          height: size + 10,
          borderRadius: isMahjong ? 5 : 8,
          background: th.tileBg(cat, selected),
          color: th.tileText(cat, selected),
          border: th.tileBorder(cat, selected),
          fontFamily: "'Noto Serif SC', serif",
          fontSize: activeSound.length > 3 ? 11 : activeSound.length > 2 ? 14 : 18,
          fontWeight: 800,
          cursor: disabled ? "default" : "pointer",
          transition: "all 0.15s ease",
          transform: selected && animated ? "translateY(-6px) scale(1.06)" : "translateY(0)",
          boxShadow: th.tileShadow(cat, selected, highlighted),
          animation: autoPulse ? "tileAutoPulse 1.4s ease-in-out" : "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          position: "relative",
          overflow: "hidden",
          letterSpacing: "0.02em",
          userSelect: "none",
          padding: 0,
        }}
      >
        {/* Mahjong inner frame — mimics the decorative border of real tiles */}
        {isMahjong && (
          <div style={{
            position: "absolute", inset: 3, borderRadius: 2,
            border: `1.5px solid ${cat.color}55`,
            pointerEvents: "none", zIndex: 0,
          }} />
        )}
        {selected && (
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse at center, ${cat.color}22 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />
        )}
        {isDual ? (
          <div style={{ display: "flex", alignItems: "center", gap: 1, lineHeight: 1, position: "relative", zIndex: 1 }}>
            {tile.variants.map((v, i) => {
              const isActive = i === tile.activeVariant;
              const fs = v.length > 2 ? 10 : 13;
              return (
                <span
                  key={i}
                  onClick={e => {
                    if (!isActive && !disabled && onCycleVariant) { e.stopPropagation(); onCycleVariant(tile); }
                  }}
                  title={isActive ? undefined : `Switch to "${v}"`}
                  style={{
                    fontSize: fs, fontWeight: 800,
                    opacity: isActive ? 1 : 0.28,
                    color: th.tileText(cat, selected),
                    cursor: isActive ? "default" : "pointer",
                    transition: "opacity 0.15s",
                    lineHeight: 1, letterSpacing: 0,
                  }}
                >
                  {i === 1 && <span style={{ opacity: 0.35, fontSize: fs - 2, margin: "0 1px" }}>/</span>}
                  {v}
                </span>
              );
            })}
          </div>
        ) : (
          <span style={{ lineHeight: 1, fontSize: activeSound.length > 3 ? 11 : activeSound.length > 2 ? 14 : 18, position: "relative", zIndex: 1 }}>
            {activeSound}
          </span>
        )}
        {showLabel && <span style={{
          fontSize: 7, opacity: 0.75,
          fontFamily: "monospace", textTransform: "uppercase",
          letterSpacing: "0.08em", color: th.labelColor(cat),
          fontWeight: 700, position: "relative", zIndex: 1,
        }}>
          {cat.label.split(" ")[0]}
        </span>}
      </button>
    </div>
  );
}


function MahjongPhonicsGame({ onBackToTitle, settings = DEFAULT_SETTINGS }) {
  const [deck, setDeck] = useState(() => shuffle(buildDeck()));
  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState([]);
  const [words, setWords] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [deckIndex, setDeckIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [invalidShake, setInvalidShake] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [dictReady, setDictReady] = useState(false);
  const [gameOver, setGameOver] = useState(false);       // true when no words possible with 13 tiles
  const [allWordsScored, setAllWordsScored] = useState([]); // cumulative across rounds for end screen
  const [challengeWord, setChallengeWord] = useState(null); // { word, tiles } waiting for user to accept/reject
  const loadedWordSet = useRef(null);
  const msgTimeout = useRef(null);

  // ── WORD SMOKE ─────────────────────────────────────────────────────────────
  const smokeEnabled = settings.smokeEffect;
  const [cheerKey, setCheerKey] = useState(0); // increment to trigger a new cheer
  const [smokeWords, setSmokeWords] = useState([]);
  const spawnTimerRef = useRef(null);
  const hoverTileRef = useRef(null);
  const usedRecentlyRef = useRef(new Set());

  const removeWord = useCallback((id) => {
    setSmokeWords(prev => prev.filter(w => w.id !== id));
  }, []);

  const handleTileHover = useCallback((tile, x, y) => {
    clearInterval(spawnTimerRef.current);
    clearTimeout(spawnTimerRef._t1);
    clearTimeout(spawnTimerRef._t2);
    if (!tile || !smokeEnabled) { hoverTileRef.current = null; return; }
    hoverTileRef.current = tile;

    const cat = TILE_CATEGORIES[tile.category];
    const color = cat.color;
    const sound = getTileSound(tile);
    const wordPool = getWordsForSound(sound);
    if (wordPool.length === 0) return;

    const spawnOne = () => {
      if (!hoverTileRef.current) return;
      let word;
      for (let i = 0; i < 12; i++) {
        word = wordPool[Math.floor(Math.random() * wordPool.length)];
        if (!usedRecentlyRef.current.has(word)) break;
      }
      usedRecentlyRef.current.add(word);
      if (usedRecentlyRef.current.size > 8) {
        const first = usedRecentlyRef.current.values().next().value;
        usedRecentlyRef.current.delete(first);
      }
      setSmokeWords(prev => [...prev.slice(-16), makeSmokeWord(word, x, y, color)]);
    };

    spawnOne();
    spawnTimerRef._t1 = setTimeout(() => { if (hoverTileRef.current) spawnOne(); }, 700);
    spawnTimerRef._t2 = setTimeout(() => { if (hoverTileRef.current) spawnOne(); }, 1400);
    spawnTimerRef.current = setInterval(spawnOne, 1100);
  }, [smokeEnabled]);

  // Deal initial 13 tiles
  useEffect(() => {
    const d = shuffle(buildDeck());
    setDeck(d);
    setHand(d.slice(0, 13));
    setDeckIndex(13);
    setDictReady(true);
    AudioEngine.startMusic();
    return () => AudioEngine.stopMusic();
  }, []);

  useEffect(() => {
    AudioEngine.setMusicVolume(settings.ambientMusic);
  }, [settings.ambientMusic]);
  useEffect(() => {
    AudioEngine.setSfxVolume(settings.soundEffects);
  }, [settings.soundEffects]);

  const showMsg = (text, type = "info") => {
    if (msgTimeout.current) clearTimeout(msgTimeout.current);
    setMessage({ text, type });
    msgTimeout.current = setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const toggleTile = (tile) => {
    if (settings.soundEffects > 0) AudioEngine.play("tileClick");
    setSelected(prev => {
      const already = prev.findIndex(t => t.id === tile.id);
      if (already !== -1) {
        // deselect — remove only the first match (safety guard)
        return prev.filter((_, i) => i !== already);
      }
      // guard: never add duplicates (safety against double event fires)
      if (prev.some(t => t.id === tile.id)) return prev;
      return [...prev, tile];
    });
  };

  const makeWord = () => {
    if (selected.length === 0) { showMsg("Select some tiles first!", "warn"); return; }
    const word = buildWordFromTiles(selected);
    if (word.length < 2) { showMsg("Word is too short!", "warn"); return; }
    const found = checkWordInSet(word);
    if (!found) {
      if (settings.soundEffects > 0) AudioEngine.play("wordWrong");
      // Instead of immediately shaking, offer a challenge prompt
      setChallengeWord({ word, tiles: [...selected] });
      return;
    }
    scoreWord(word, selected);
  };

  // Score a validated word (extracted so challenge flow can reuse it)
  const scoreWord = (word, tiles) => {
    if (settings.soundEffects > 0) AudioEngine.play("wordCorrect");
    const basePts = tiles.reduce((acc, t) => {
      const catBonus = { specials: 5, r_vowel: 4, double_vowel: 3, others: 2, main_consonants: 1, open_vowel: 1, closed_vowel: 1 };
      return acc + (catBonus[t.category] || 1);
    }, 0) * word.length;
    const usedHint = settings.hintPenalty && showHint && hintUsedWords.has(word);
    const pts = usedHint ? Math.max(1, Math.floor(basePts / 2)) : basePts;
    setWords(prev => [...prev, { tiles, word, pts, hinted: usedHint, originalPts: basePts }]);
    setScore(s => s + pts);
    setHand(prev => prev.filter(t => !tiles.find(s => s.id === t.id)));
    setSelected([]);
    setHintUsedWords(new Set());
    setChallengeWord(null);
    if (settings.cheerEffect) setCheerKey(k => k + 1);
    showMsg(`+${pts} pts! "${word}"${usedHint ? " (hint −50%)" : ""} added!`, "success");
  };

  // Accept a challenged word: add to session dictionary then score it
  const acceptChallenge = () => {
    if (!challengeWord) return;
    addCustomWord(challengeWord.word);
    scoreWord(challengeWord.word, challengeWord.tiles);
  };

  // Reject: shake and clear
  const rejectChallenge = () => {
    setChallengeWord(null);
    setInvalidShake(true);
    setTimeout(() => { setInvalidShake(false); setSelected([]); }, 600);
  };

  const clearSelection = () => { setSelected([]); };

  // ── AUTO-MAKE WORD ─────────────────────────────────────────────────────────
  // When autoMakeWord is on, check after every selection change: if the current
  // tiles already spell a valid word, score it automatically after a brief delay
  // so the player can see the selection before it fires.
  useEffect(() => {
    if (!settings.autoMakeWord || !dictReady || animating || selected.length < 1) return;
    const word = buildWordFromTiles(selected);
    if (word.length < 2 || !checkWordInSet(word)) return;
    const t = setTimeout(() => { makeWord(); }, 320);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, settings.autoMakeWord, dictReady, animating]);
  // Works on both hand tiles and already-selected tiles
  const cycleVariant = (tile) => {
    if (settings.soundEffects > 0) AudioEngine.play("tileCycle");
    const cycle = (t) => {
      if (!t.variants) return t;
      if (t.id !== tile.id) return t;
      return { ...t, activeVariant: (t.activeVariant + 1) % t.variants.length };
    };
    setHand(prev => prev.map(cycle));
    setSelected(prev => prev.map(cycle));
  };

  // ── RESET GAME ────────────────────────────────────────────────────────────
  const resetGame = () => {
    if (settings.soundEffects > 0) AudioEngine.play("resetGame");
    const d = shuffle(buildDeck());
    setDeck(d);
    setHand(d.slice(0, 13));
    setDeckIndex(13);
    setSelected([]);
    setWords([]);
    setRound(1);
    setScore(0);
    setAnimating(false);
    setHintWords([]);
    setShowHint(false);
    setHintsLeft(MAX_HINTS);
    setGameOver(false);
    setAllWordsScored([]);
    showMsg("🔄 Game reset! New tiles dealt.", "info");
  };

  // ── HINT SYSTEM ────────────────────────────────────────────────────────────
  const MAX_HINTS = 3;
  const [hintsLeft, setHintsLeft] = useState(MAX_HINTS);
  const [showHint, setShowHint] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [highlightIds, setHighlightIds] = useState(new Set());
  const [hintUsedWords, setHintUsedWords] = useState(new Set());
  const [hintWords, setHintWords] = useState([]); // kept for compat with autoMakeWord effect
  // Auto-pulse: IDs of tiles gently glowing right now (ambient short-word hint)
  const [autoPulseIds, setAutoPulseIds] = useState(new Set());
  const autoPulseTimerRef = useRef(null);

  // Score a candidate word given tile ids
  const scoreCandidate = useCallback((tileIds) => {
    const catBonus = { specials:5, r_vowel:4, double_vowel:3, others:2, main_consonants:1, open_vowel:1, closed_vowel:1 };
    return tileIds.reduce((acc, id) => {
      const t = hand.find(h => h.id === id);
      return acc + (t ? (catBonus[t.category] || 1) : 0);
    }, 0);
  }, [hand]);

  // Core matching helper — returns array of { word, tileIds, pts } from current hand
  const findAllCandidates = useCallback((maxLen = 99) => {
    // Build per-tile option lists (each tile can produce 1 or more sounds via variants)
    const tileSounds = hand.map(tile =>
      tile.variants
        ? tile.variants.map(v => ({ sound: v, tile }))
        : [{ sound: tile.text.replace(/-/g, ""), tile }]
    );
    const usedAlready = new Set(words.map(w => w.word));
    const catBonus = { specials:5, r_vowel:4, double_vowel:3, others:2, main_consonants:1, open_vowel:1, closed_vowel:1 };
    const found = [];

    // Backtracking matcher: tries every tile at every position so that
    // both d+oor AND d+o+or can match "door", and words like "answer"
    // are found even if an "an" tile could theoretically steal the match.
    function matchWord(word, pos, usedFlags, tileIds) {
      if (pos === word.length) return { ok: true, tileIds: [...tileIds] };
      for (let i = 0; i < tileSounds.length; i++) {
        if (usedFlags[i]) continue;
        for (const { sound, tile } of tileSounds[i]) {
          if (word.slice(pos, pos + sound.length) === sound) {
            usedFlags[i] = true;
            tileIds.push(tile.id);
            const result = matchWord(word, pos + sound.length, usedFlags, tileIds);
            if (result.ok) return result;
            tileIds.pop();
            usedFlags[i] = false;
          }
        }
      }
      return { ok: false };
    }

    for (const word of [...WORD_LIST, ...SESSION_CUSTOM_WORDS]) {
      if (word.length < 2 || word.length > maxLen) continue;
      if (usedAlready.has(word)) continue;
      const usedFlags = new Array(tileSounds.length).fill(false);
      const result = matchWord(word, 0, usedFlags, []);
      if (result.ok) {
        const pts = result.tileIds.reduce((acc, id) => {
          const t = hand.find(h => h.id === id);
          return acc + (t ? (catBonus[t.category] || 1) : 0);
        }, 0) * word.length;
        found.push({ word, tileIds: result.tileIds, pts });
      }
    }
    return found;
  }, [hand, words]);

  // Hint button: costs 1 charge, reveals the single highest-scoring word
  const findHints = () => {
    if (hintsLeft <= 0) { showMsg("No hints left this round!", "warn"); return; }
    setHintLoading(true);
    setShowHint(false);
    setHighlightIds(new Set());
    setTimeout(() => {
      const candidates = findAllCandidates();
      if (candidates.length === 0) {
        setHintLoading(false);
        showMsg("🤔 No words found — try cycling dual tiles!", "warn");
        return;
      }
      // Pick the best-scoring word
      const best = candidates.reduce((a, b) => b.pts > a.pts ? b : a, candidates[0]);
      setHintWords([best]);
      setHintsLeft(n => n - 1);
      setShowHint(true);
      setHintLoading(false);
      if (settings.soundEffects > 0) AudioEngine.play("hintReveal");
      highlightHintWord(best);
    }, 300);
  };

  const highlightHintWord = (hint) => {
    setHighlightIds(new Set(hint.tileIds));
    setHintUsedWords(prev => new Set([...prev, hint.word]));
    setTimeout(() => setHighlightIds(new Set()), 3500);
  };

  // Legacy compat — kept so old calls still work
  const highlightHint = highlightHintWord;

  // ── AUTO-PULSE (ambient short-word glow) ───────────────────────────────────
  // Every 7–11 seconds, quietly illuminate 2–3 tiles that spell a short word
  // (≤4 chars). This costs nothing and gives a subtle nudge without spoiling.
  useEffect(() => {
    const schedule = () => {
      const jitter = 7000 + Math.random() * 4000;
      autoPulseTimerRef.current = setTimeout(() => {
        if (animating) { schedule(); return; }
        const shortCandidates = findAllCandidates(4); // words up to 4 chars
        if (shortCandidates.length > 0) {
          const pick = shortCandidates[Math.floor(Math.random() * Math.min(shortCandidates.length, 6))];
          setAutoPulseIds(new Set(pick.tileIds));
          setTimeout(() => setAutoPulseIds(new Set()), 1600); // glow lasts 1.6s
        }
        schedule();
      }, jitter);
    };
    schedule();
    return () => clearTimeout(autoPulseTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hand, words, animating]);

  // Check whether a given tile array can form ANY word — used to detect dead hands
  const isDeadHand = useCallback((tiles) => {
    const tileSounds = tiles.map(tile =>
      tile.variants
        ? tile.variants.map(v => ({ sound: v, tile }))
        : [{ sound: tile.text.replace(/-/g, ""), tile }]
    );
    function matchWord(word, pos, usedFlags) {
      if (pos === word.length) return true;
      for (let i = 0; i < tileSounds.length; i++) {
        if (usedFlags[i]) continue;
        for (const { sound } of tileSounds[i]) {
          if (word.slice(pos, pos + sound.length) === sound) {
            usedFlags[i] = true;
            if (matchWord(word, pos + sound.length, usedFlags)) return true;
            usedFlags[i] = false;
          }
        }
      }
      return false;
    }
    const allWords = [...WORD_LIST, ...SESSION_CUSTOM_WORDS];
    for (const word of allWords) {
      if (word.length < 2 || word.length > 12) continue;
      if (matchWord(word, 0, new Array(tileSounds.length).fill(false))) return false;
    }
    return true;
  }, []);

  const endRound = () => {
    if (words.length === 0) { showMsg("Make at least one word to end the round!", "warn"); return; }
    if (settings.soundEffects > 0) AudioEngine.play("roundEnd");
    setAnimating(true);
    setTimeout(() => {
      // Replace used tiles
      const usedIds = new Set(words.flatMap(w => w.tiles.map(t => t.id)));
      const remaining = hand.filter(t => !usedIds.has(t.id));
      const needed = 13 - remaining.length;
      let newDeckIndex = deckIndex;
      const newTiles = [];
      for (let i = 0; i < needed; i++) {
        if (newDeckIndex < deck.length) {
          newTiles.push(deck[newDeckIndex++]);
        } else {
          // Reshuffle used tiles back
          const recycled = shuffle(words.flatMap(w => w.tiles));
          deck.splice(newDeckIndex, 0, ...recycled);
          newTiles.push(deck[newDeckIndex++]);
        }
      }
      setDeckIndex(newDeckIndex);
      const newHand = [...remaining, ...newTiles];
      setHand(newHand);
      setAllWordsScored(prev => [...prev, ...words]);
      setWords([]);
      setSelected([]);
      setRound(r => r + 1);
      setHintsLeft(MAX_HINTS);
      setShowHint(false);
      setAnimating(false);
      if (settings.soundEffects > 0) AudioEngine.play("dealTiles");
      showMsg(`Round ${round + 1} begins! ${needed} new tiles dealt.`, "info");
      // Check if new hand is a dead end — trigger end screen if so
      if (isDeadHand(newHand)) {
        setTimeout(() => {
          if (settings.soundEffects > 0) AudioEngine.play("sessionEnd");
          setGameOver(true);
        }, 800);
      }
    }, 600);
  };

  const catLegend = Object.entries(TILE_CATEGORIES);

  const _th = TILE_THEMES[settings.tileTheme] || TILE_THEMES.neon;
  return (
    <div style={{
      minHeight: "100vh",
      background: _th.pageBg,
      backgroundImage: _th.pageBgImage ? `
        radial-gradient(ellipse at 20% 20%, #1a0a2e44 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, #0a1a2e44 0%, transparent 50%),
        repeating-linear-gradient(0deg, transparent, transparent 60px, #ffffff03 60px, #ffffff03 61px),
        repeating-linear-gradient(90deg, transparent, transparent 60px, #ffffff03 60px, #ffffff03 61px)
      ` : "none",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: _th.pageText,
      padding: "0 0 40px",
      transition: "background 0.4s, color 0.4s",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; } to { opacity:1; } } @keyframes slideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } } @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 0 2px #f0c06088, 0 0 12px 2px #f0c06033; } 50% { box-shadow: 0 0 0 3px #f0c060cc, 0 0 24px 6px #f0c06077; } } @keyframes smokeRise { 0% { opacity:0; transform:translateX(-50%) translateY(0px); } 12% { opacity:0.85; } 80% { opacity:0.6; } 100% { opacity:0; transform:translateX(-50%) translateY(-160px); } } @keyframes shake { 0%,100% { transform:translateX(0); } 15% { transform:translateX(-7px); } 30% { transform:translateX(7px); } 45% { transform:translateX(-5px); } 60% { transform:translateX(5px); } 75% { transform:translateX(-3px); } 90% { transform:translateX(3px); } } @keyframes tileAutoPulse { 0%,100% { box-shadow: 0 3px 8px #00000088, inset 0 1px 0 #ffffff0a; transform: translateY(0) scale(1); } 30% { box-shadow: 0 0 0 2px #C77DFFcc, 0 0 20px 6px #C77DFF55, 0 6px 18px #00000088; transform: translateY(-4px) scale(1.05); } 60% { box-shadow: 0 0 0 2px #C77DFF88, 0 0 12px 3px #C77DFF33, 0 4px 12px #00000088; transform: translateY(-2px) scale(1.02); } }`}</style>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${_th.headerBorder}`,
        background: _th.headerBg,
        backdropFilter: "blur(12px)",
        padding: "14px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {onBackToTitle && (
            <button
              onClick={() => { AudioEngine.play("backToMenu"); onBackToTitle(); }}
              title="Return to home screen"
              style={{
                background: "#ffffff08", border: "1px solid #ffffff18",
                color: "#ffffff88", borderRadius: 10, padding: "7px 14px",
                cursor: "pointer", fontSize: 12, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.15s", flexShrink: 0,
                letterSpacing: "0.06em",
              }}
            >
              🚪 Home
            </button>
          )}
          <div style={{ fontSize: 28 }}>🀄</div>
          <div>
            <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", color: "#f0c060" }}>
              Phonics Mahjong
            </div>
            <div style={{ fontSize: 11, color: "#ffffff55", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Word Building Game
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#ffffff44", textTransform: "uppercase", letterSpacing: "0.1em" }}>Round</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#f0c060", fontFamily: "monospace" }}>{round}</div>
          </div>
          <div style={{ width: 1, height: 36, background: "#ffffff15" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#ffffff44", textTransform: "uppercase", letterSpacing: "0.1em" }}>Score</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#9EF01A", fontFamily: "monospace" }}>{score}</div>
          </div>
          <div style={{ width: 1, height: 36, background: "#ffffff15" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#ffffff44", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tiles Left</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#2EC4B6", fontFamily: "monospace" }}>{deck.length - deckIndex}</div>
          </div>
          <div style={{ width: 1, height: 36, background: "#ffffff15" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#ffffff44", textTransform: "uppercase", letterSpacing: "0.1em" }}>Dictionary</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: dictReady ? "#9EF01A" : "#F4A261", fontFamily: "monospace", marginTop: 3 }}>
              {dictReady ? "✓ 20k Ready" : (
                <span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowRules(r => !r)}
            style={{
              background: "#ffffff0f", border: "1px solid #ffffff1a",
              color: "#ffffff88", borderRadius: 8, padding: "6px 14px",
              cursor: "pointer", fontSize: 12, letterSpacing: "0.06em",
            }}
          >
            {showRules ? "Hide" : "Rules"}
          </button>
          <button
            onClick={resetGame}
            title="Reset the entire game and reshuffle all tiles"
            style={{
              background: "linear-gradient(135deg, #E8485522, #E8485511)",
              border: "1px solid #E8485566",
              color: "#ff6b78", borderRadius: 8, padding: "6px 14px",
              cursor: "pointer", fontSize: 12, letterSpacing: "0.06em",
              fontWeight: 700,
            }}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Rules Panel */}
      {showRules && (
        <div style={{
          margin: "16px 24px 0",
          background: "#ffffff06",
          border: "1px solid #ffffff12",
          borderRadius: 12,
          padding: "20px 24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f0c060", marginBottom: 8 }}>🎮 How to Play</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, color: "#ffffff88" }}>
              1. You have 13 tiles in your hand<br/>
              2. Click tiles to select them in order<br/>
              3. Press <b style={{color:"#fff"}}>Make Word</b> to validate and score<br/>
              4. Valid words score instantly — invalid ones clear so you can retry<br/>
              5. Build multiple words, then <b style={{color:"#fff"}}>End Round</b><br/>
              6. Used tiles are replaced with new ones
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f0c060", marginBottom: 8 }}>✨ Scoring</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, color: "#ffffff88" }}>
              Points = word length × tile values<br/>
              Specials: 5pts | R-Vowel: 4pts<br/>
              Double Vowel: 3pts | Others: 2pts<br/>
              Consonants/Vowels: 1pt each<br/><br/>
              Longer words with rare tiles score more!
            </div>
          </div>
        </div>
      )}

      {/* Message Banner */}
      {message.text && (
        <div style={{
          margin: "12px 24px 0",
          padding: "10px 18px",
          borderRadius: 10,
          background: {
            success: "#9EF01A22",
            error: "#E8485522",
            warn: "#F4A26122",
            info: "#2EC4B622",
          }[message.type] || "#ffffff11",
          border: `1px solid ${{
            success: "#9EF01A55",
            error: "#E8485555",
            warn: "#F4A26155",
            info: "#2EC4B655",
          }[message.type] || "#ffffff22"}`,
          fontSize: 13,
          color: {
            success: "#c8ff5a",
            error: "#ff6b78",
            warn: "#ffbe85",
            info: "#5de8e0",
          }[message.type] || "#e0e0f0",
          fontWeight: 500,
          letterSpacing: "0.02em",
        }}>
          {message.text}
        </div>
      )}

      {/* ── WORDS SCORED — Mahjong discard row, above the board ──────────────── */}
      <div style={{ padding: "16px 24px 0" }}>
        <div style={{
          background: "#ffffff05",
          border: "1px solid #ffffff0d",
          borderRadius: 14,
          padding: "14px 18px",
          minHeight: 64,
        }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: words.length > 0 ? 12 : 0 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "#ffffff33" }}>
              Words This Round
            </div>
            {words.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, color: "#ffffff33", letterSpacing: "0.1em", textTransform: "uppercase" }}>Round total</span>
                <span style={{ fontSize: 15, color: "#f0c060", fontWeight: 800, fontFamily: "monospace" }}>
                  {words.reduce((s, w) => s + w.pts, 0)}
                </span>
              </div>
            )}
          </div>
          {/* Word chips — rendered as their actual tiles */}
          {words.length === 0 ? (
            <div style={{ color: "#ffffff18", fontSize: 12, fontStyle: "italic", paddingTop: 4 }}>
              Score words to see them appear here…
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {words.map((w, i) => (
                <div key={i} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: w.hinted ? "#F4A2610d" : "#9EF01A0d",
                  border: w.hinted ? "1px solid #F4A26144" : "1px solid #9EF01A33",
                  borderRadius: 20, padding: "4px 12px 4px 10px",
                }}>
                  <span style={{ fontFamily: "'Noto Serif SC', serif", color: w.hinted ? "#ffbe85" : "#c8ff5a", fontWeight: 700, fontSize: 14 }}>
                    {w.word}{w.hinted ? " 💡" : ""}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: w.hinted ? "#F4A261" : "#9EF01A" }}>+{w.pts}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN BOARD AREA ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 18, padding: "14px 24px 0", alignItems: "flex-start" }}>

        {/* Left: Word Builder + Hand */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Word Builder */}
          <div style={{
            background: "#ffffff06",
            border: "1px solid #ffffff10",
            borderRadius: 14,
            padding: "14px 18px",
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "#ffffff33" }}>
                Word Builder {selected.length > 0 ? `— ${selected.length} tile${selected.length !== 1 ? "s" : ""}` : ""}
              </div>
              {/* Auto indicator */}
              <div style={{ fontSize: 10, color: settings.autoMakeWord ? "#9EF01A88" : "#ffffff22", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 4 }}>
                {settings.autoMakeWord ? "⚡ Auto-on" : "Manual mode"}
              </div>
            </div>

            {/* Selected tiles row */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 8,
              minHeight: 60,
              alignItems: "center",
              background: "#ffffff03",
              borderRadius: 10,
              padding: "10px 12px",
              border: selected.length > 0 ? "1px solid #ffffff14" : "1px dashed #ffffff0a",
              marginBottom: selected.length > 0 ? 10 : 0,
            }}>
              {selected.length === 0 ? (
                <div style={{ color: "#ffffff1a", fontSize: 13, fontStyle: "italic" }}>
                  Click tiles from your hand to build a word…
                </div>
              ) : (
                selected.map(t => (
                  <Tile key={t.id} tile={t} selected onClick={() => toggleTile(t)} onCycleVariant={cycleVariant} onHover={handleTileHover} small theme={settings.tileTheme} animated={settings.tileAnimations} showLabel={settings.soundLabels} />
                ))
              )}
            </div>

            {/* Preview + action buttons */}
            {selected.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, fontFamily: "'Noto Serif SC', serif", color: "#f0c060", fontWeight: 800, fontSize: 22, letterSpacing: "0.04em" }}>
                  {selected.map(t => getTileSound(t)).join("")}
                </div>
                {/* Make Word button — only shown when autoMakeWord is off */}
                {!settings.autoMakeWord && (
                  <button onClick={makeWord} disabled={animating || !dictReady} style={{
                    ...btnStyle(!dictReady ? "#888" : "#9EF01A", !dictReady ? "#111" : "#0d1400"),
                    opacity: !dictReady ? 0.5 : 1,
                    cursor: !dictReady ? "wait" : "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                    animation: invalidShake ? "shake 0.5s ease" : "none",
                    fontSize: 13, padding: "9px 20px",
                  }}>
                    {!dictReady
                      ? <><span style={{ display: "inline-block", animation: "spin 0.8s linear infinite" }}>⟳</span> Loading…</>
                      : "✓ Make Word"}
                  </button>
                )}
                {/* Shake animation on Make Word even in auto mode */}
                {settings.autoMakeWord && invalidShake && (
                  <div style={{
                    padding: "7px 14px", borderRadius: 9,
                    background: "#E8485522", border: "1px solid #E8485566",
                    color: "#ff6b78", fontSize: 12, fontWeight: 700,
                    animation: "shake 0.5s ease",
                  }}>✕ Not a word</div>
                )}
                <button onClick={clearSelection} style={{
                  padding: "9px 16px", borderRadius: 9,
                  background: "#ffffff08", border: "1px solid #ffffff18",
                  color: "#ffffff55", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", letterSpacing: "0.06em", transition: "all 0.15s",
                }}>
                  ✕ Clear
                </button>
              </div>
            )}

            {/* ── Challenge Prompt — word not in built-in list ── */}
            {challengeWord && (
              <div style={{
                marginTop: 12,
                background: "linear-gradient(135deg, #F4A26114, #F4A26108)",
                border: "1px solid #F4A26155",
                borderRadius: 12,
                padding: "14px 16px",
                animation: "fadeIn 0.2s ease",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ fontSize: 22, lineHeight: 1 }}>🤔</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ffbe85", marginBottom: 3 }}>
                      "<span style={{ fontFamily: "'Noto Serif SC', serif" }}>{challengeWord.word}</span>" isn't in our list
                    </div>
                    <div style={{ fontSize: 11, color: "#ffffff55", lineHeight: 1.5, marginBottom: 10 }}>
                      If it's a real word, you can add it to your session dictionary and score it — or clear and try something else.
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={acceptChallenge} style={{
                        padding: "7px 16px", borderRadius: 9,
                        background: "linear-gradient(135deg, #F4A26133, #F4A26118)",
                        border: "1px solid #F4A26177",
                        color: "#ffbe85", fontSize: 12, fontWeight: 800,
                        cursor: "pointer", letterSpacing: "0.06em",
                      }}>
                        ✓ It's a real word — add &amp; score
                      </button>
                      <button onClick={rejectChallenge} style={{
                        padding: "7px 14px", borderRadius: 9,
                        background: "#ffffff08", border: "1px solid #ffffff18",
                        color: "#ffffff44", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", letterSpacing: "0.06em",
                      }}>
                        ✕ Clear selection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hand */}
          <div style={{
            background: "#ffffff06",
            border: "1px solid #ffffff10",
            borderRadius: 14,
            padding: "14px 18px",
          }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "#ffffff33", marginBottom: 14 }}>
              Your Hand — {hand.length} tiles
            </div>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 10,
              opacity: animating ? 0.4 : 1,
              transition: "opacity 0.3s",
            }}>
              {(() => {
                const selIds = new Set(selected.map(s => s.id));
                return hand.map(tile => (
                  <Tile
                    key={tile.id}
                    tile={tile}
                    selected={selIds.has(tile.id)}
                    highlighted={highlightIds.has(tile.id)}
                    autoPulse={autoPulseIds.has(tile.id) && !selIds.has(tile.id) && !highlightIds.has(tile.id)}
                    onClick={toggleTile}
                    onCycleVariant={cycleVariant}
                    onHover={handleTileHover}
                    disabled={animating}
                    theme={settings.tileTheme}
                    animated={settings.tileAnimations}
                    showLabel={settings.soundLabels}
                  />
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Right Panel — compact controls */}
        <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>

          {/* End Round */}
          <button
            onClick={endRound}
            disabled={words.length === 0 || animating}
            style={{
              width: "100%", padding: "14px",
              borderRadius: 12,
              background: words.length > 0 && !animating
                ? "linear-gradient(135deg, #E84855, #c0192a)"
                : "#ffffff08",
              border: words.length > 0 && !animating
                ? "1px solid #E8485566" : "1px solid #ffffff12",
              color: words.length > 0 && !animating ? "#fff" : "#ffffff28",
              fontSize: 14, fontWeight: 700,
              cursor: words.length > 0 && !animating ? "pointer" : "default",
              letterSpacing: "0.08em", textTransform: "uppercase",
              transition: "all 0.2s",
            }}
          >
            {animating ? "Dealing…" : "🀄 End Round"}
          </button>

          {/* Hint — 3 charges per round */}
          <div>
            {/* Charge dots */}
            <div style={{ display: "flex", gap: 5, justifyContent: "center", marginBottom: 8 }}>
              {Array.from({ length: MAX_HINTS }).map((_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i < hintsLeft ? "#C77DFF" : "#ffffff18",
                  boxShadow: i < hintsLeft ? "0 0 6px #C77DFF88" : "none",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
            <button
              onClick={findHints}
              disabled={hintLoading || animating || hintsLeft <= 0}
              style={{
                width: "100%", padding: "11px",
                borderRadius: 12,
                background: hintsLeft > 0
                  ? "linear-gradient(135deg, #C77DFF22, #C77DFF11)"
                  : "#ffffff05",
                border: hintsLeft > 0 ? "1px solid #C77DFF55" : "1px solid #ffffff0f",
                color: hintsLeft > 0 ? "#e4acff" : "#ffffff22",
                fontSize: 13, fontWeight: 700,
                cursor: hintLoading || animating || hintsLeft <= 0 ? "default" : "pointer",
                letterSpacing: "0.06em",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: hintLoading ? 0.7 : 1, transition: "all 0.2s",
                marginBottom: showHint ? 10 : 0,
              }}
            >
              {hintLoading
                ? <><span style={{ display:"inline-block", animation:"spin 0.8s linear infinite" }}>⟳</span> Searching…</>
                : hintsLeft <= 0
                ? "💡 No Hints Left"
                : `💡 Best Hint (${hintsLeft} left)`}
            </button>

            {showHint && hintWords.length > 0 && (
              <div style={{
                background: "#C77DFF0d", border: "1px solid #C77DFF22",
                borderRadius: 10, padding: "10px 12px",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.14em", color: "#C77DFF77" }}>
                  Best word found — tiles glowing ✦
                </div>
                {hintWords.map((h, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "#C77DFF18", border: "1px solid #C77DFF33",
                    borderRadius: 8, padding: "6px 10px",
                  }}>
                    <span style={{
                      fontFamily: "'Noto Serif SC', serif", color: "#e4acff",
                      fontWeight: 800, fontSize: 16, letterSpacing: "0.04em",
                    }}>{h.word}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#C77DFF", fontFamily: "monospace" }}>
                      +{h.pts}pt{h.pts !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
                <div style={{ fontSize: 9, color: "#ffffff28", fontStyle: "italic", textAlign: "center" }}>
                  Tiles glow for 3.5s
                </div>
              </div>
            )}

            {/* Auto-pulse legend */}
            <div style={{
              marginTop: 8, padding: "7px 10px",
              background: "#C77DFF08", borderRadius: 8, border: "1px solid #C77DFF18",
              fontSize: 9, color: "#C77DFF55", letterSpacing: "0.08em", textAlign: "center",
            }}>
              ✦ Purple pulse = short word hiding in your tiles
            </div>
          </div>

          {/* Category Legend */}
          <div style={{
            background: "#ffffff05", border: "1px solid #ffffff0d",
            borderRadius: 14, padding: "12px 14px",
          }}>
            <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: "#ffffff28", marginBottom: 10 }}>
              Tile Categories
            </div>
            {catLegend.map(([key, cat]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: "#ffffff55" }}>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <WordSmokeCanvas words={smokeWords} onWordDone={removeWord} />
      {cheerKey > 0 && <CheerBurst key={cheerKey} />}

      {/* ── GAME OVER OVERLAY — no more words possible ─────────────────────── */}
      {gameOver && (() => {
        const finalWords = [...allWordsScored, ...words];
        const totalPts = finalWords.reduce((s, w) => s + w.pts, 0);
        const longestWord = finalWords.reduce((a, b) => b.word.length > a.length ? b.word : a, "");
        const bestWord = finalWords.reduce((a, b) => b.pts > a.pts ? b : a, { word: "—", pts: 0 });
        const avgLen = finalWords.length ? (finalWords.reduce((s, w) => s + w.word.length, 0) / finalWords.length).toFixed(1) : "0";
        return (
          <div style={{
            position: "fixed", inset: 0, zIndex: 500,
            background: "#000000cc",
            backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.4s ease",
          }}>
            <div style={{
              background: "#13131f",
              border: "1px solid #f0c06033",
              borderRadius: 24,
              padding: "40px 44px",
              maxWidth: 520, width: "90%",
              maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 40px 100px #000000dd, 0 0 0 1px #f0c06022",
              animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 52, marginBottom: 8 }}>🀄</div>
              <div style={{
                fontFamily: "'Noto Serif SC', serif",
                fontSize: 30, fontWeight: 900, color: "#f0c060",
                letterSpacing: "0.04em", marginBottom: 6,
              }}>Game Over</div>
              <div style={{
                fontSize: 13, color: "#ffffff44",
                letterSpacing: "0.14em", textTransform: "uppercase",
                marginBottom: 32,
              }}>
                No more words possible with your tiles
              </div>

              {/* Score hero */}
              <div style={{
                background: "linear-gradient(135deg, #f0c06022, #f0c06008)",
                border: "1px solid #f0c06033",
                borderRadius: 16, padding: "20px 28px",
                marginBottom: 24,
              }}>
                <div style={{ fontSize: 11, color: "#f0c06077", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>Final Score</div>
                <div style={{ fontSize: 56, fontWeight: 900, color: "#f0c060", fontFamily: "monospace", lineHeight: 1 }}>{totalPts}</div>
                <div style={{ fontSize: 12, color: "#ffffff44", marginTop: 6 }}>across {round} round{round !== 1 ? "s" : ""}</div>
              </div>

              {/* Stats grid */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 10, marginBottom: 28,
              }}>
                {[
                  { label: "Words Scored", value: finalWords.length, color: "#9EF01A" },
                  { label: "Avg Word Length", value: avgLen, color: "#2EC4B6" },
                  { label: "Longest Word", value: longestWord || "—", color: "#C77DFF" },
                  { label: "Best Word", value: bestWord.word !== "—" ? `${bestWord.word} (+${bestWord.pts})` : "—", color: "#F4A261" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    background: "#ffffff06", border: "1px solid #ffffff0f",
                    borderRadius: 12, padding: "12px 14px", textAlign: "left",
                  }}>
                    <div style={{ fontSize: 9, color: "#ffffff33", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'Noto Serif SC', serif" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Words played scroll */}
              {finalWords.length > 0 && (
                <div style={{
                  background: "#ffffff05", border: "1px solid #ffffff0a",
                  borderRadius: 12, padding: "12px 14px",
                  maxHeight: 120, overflowY: "auto",
                  marginBottom: 24, textAlign: "left",
                }}>
                  <div style={{ fontSize: 9, color: "#ffffff28", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 8 }}>All Words Played</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {finalWords.map((w, i) => (
                      <span key={i} style={{
                        fontFamily: "'Noto Serif SC', serif", fontSize: 13, fontWeight: 700,
                        color: w.hinted ? "#ffbe85" : "#c8ff5a",
                        background: w.hinted ? "#F4A2610d" : "#9EF01A0d",
                        border: w.hinted ? "1px solid #F4A26133" : "1px solid #9EF01A22",
                        borderRadius: 14, padding: "2px 9px",
                      }}>{w.word}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={resetGame} style={{
                  padding: "13px 32px", borderRadius: 12,
                  background: "linear-gradient(135deg, #f0c060, #e8963a)",
                  border: "none", color: "#1a0e04",
                  fontSize: 14, fontWeight: 800,
                  cursor: "pointer", letterSpacing: "0.08em",
                  boxShadow: "0 4px 20px #f0c06044",
                }}>🔄 Play Again</button>
                {onBackToTitle && (
                  <button onClick={() => { AudioEngine.play("backToMenu"); onBackToTitle(); }} style={{
                    padding: "13px 24px", borderRadius: 12,
                    background: "#ffffff08", border: "1px solid #ffffff18",
                    color: "#ffffff66", fontSize: 14, fontWeight: 700,
                    cursor: "pointer", letterSpacing: "0.06em",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>🚪 Home</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function btnStyle(bg, darkBg, textColor) {
  return {
    padding: "8px 18px",
    borderRadius: 9,
    background: `linear-gradient(135deg, ${bg}33, ${bg}18)`,
    border: `1px solid ${bg}66`,
    color: textColor || bg,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.06em",
    transition: "all 0.15s",
  };
}

// ─── TITLE SCREEN ─────────────────────────────────────────────────────────────
const FLOATING_TILES = [
  { text: "ai", color: "#2EC4B6", x: 8,  y: 15, delay: 0,    dur: 7 },
  { text: "sh", color: "#FFBF69", x: 78, y: 10, delay: 1.2,  dur: 8 },
  { text: "ee", color: "#2EC4B6", x: 22, y: 72, delay: 0.5,  dur: 6 },
  { text: "th", color: "#FFBF69", x: 88, y: 65, delay: 2,    dur: 9 },
  { text: "or", color: "#CBF3F0", x: 5,  y: 45, delay: 1.8,  dur: 7 },
  { text: "ng", color: "#9EF01A", x: 92, y: 38, delay: 0.3,  dur: 8 },
  { text: "oo", color: "#2EC4B6", x: 55, y: 82, delay: 2.5,  dur: 6 },
  { text: "ph", color: "#9EF01A", x: 35, y: 8,  delay: 0.9,  dur: 9 },
  { text: "er", color: "#CBF3F0", x: 68, y: 78, delay: 1.5,  dur: 7 },
  { text: "ck", color: "#FFBF69", x: 15, y: 88, delay: 3,    dur: 8 },
  { text: "ea", color: "#2EC4B6", x: 72, y: 22, delay: 0.7,  dur: 6 },
  { text: "wh", color: "#FFBF69", x: 42, y: 90, delay: 2.2,  dur: 7 },
  { text: "ir", color: "#CBF3F0", x: 3,  y: 60, delay: 1.1,  dur: 9 },
  { text: "qu", color: "#9EF01A", x: 85, y: 85, delay: 0.4,  dur: 6 },
  { text: "oi", color: "#2EC4B6", x: 58, y: 5,  delay: 3.3,  dur: 8 },
  { text: "dr", color: "#9EF01A", x: 28, y: 55, delay: 1.9,  dur: 7 },
];

function FloatingTile({ text, color, x, y, delay, dur }) {
  return (
    <div style={{
      position: "absolute",
      left: `${x}%`,
      top: `${y}%`,
      width: 54,
      height: 62,
      borderRadius: 9,
      border: `1.5px solid ${color}55`,
      background: `linear-gradient(145deg, ${color}18, ${color}08)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: `${color}99`,
      fontFamily: "'Noto Serif SC', serif",
      fontSize: text.length > 2 ? 13 : 20,
      fontWeight: 700,
      boxShadow: `0 4px 20px ${color}22`,
      animation: `floatBob ${dur}s ease-in-out ${delay}s infinite`,
      pointerEvents: "none",
      userSelect: "none",
    }}>
      {text}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#000000bb",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{
        background: "#13131f",
        border: "1px solid #ffffff18",
        borderRadius: 20,
        padding: "32px 36px",
        maxWidth: 560,
        width: "90%",
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 32px 80px #000000cc",
        animation: "slideUp 0.25s ease",
        position: "relative",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "#ffffff0f", border: "1px solid #ffffff18",
          color: "#ffffff66", borderRadius: 8,
          width: 32, height: 32, cursor: "pointer", fontSize: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
        <div style={{
          fontFamily: "'Noto Serif SC', serif",
          fontSize: 22, fontWeight: 800,
          color: "#f0c060", marginBottom: 20,
          letterSpacing: "0.04em",
        }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function TitleScreen({ onPlay, onPlayTimed, settings, updateSetting }) {
  const [modal, setModal] = useState(null); // "rules" | "credits" | "settings" | null
  const [entered, setEntered] = useState(false);
  const [wordImport, setWordImport] = useState(""); // textarea value for bulk word import
  const [customWordList, setCustomWordList] = useState(() => [...SESSION_CUSTOM_WORDS]); // reactive copy

  useEffect(() => {
    setTimeout(() => setEntered(true), 80);
  }, []);

  // Title screen ambient music
  useEffect(() => {
    AudioEngine.startMusic();
    return () => AudioEngine.stopMusic();
  }, []);
  useEffect(() => {
    AudioEngine.setMusicVolume(settings.ambientMusic);
  }, [settings.ambientMusic]);
  useEffect(() => {
    AudioEngine.setSfxVolume(settings.soundEffects);
  }, [settings.soundEffects]);

  const menuBtn = (label, color, onClick, subtitle) => (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "16px 28px",
        borderRadius: 14,
        background: `linear-gradient(135deg, ${color}22, ${color}0d)`,
        border: `1.5px solid ${color}55`,
        color: color,
        fontSize: 16,
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        boxShadow: `0 4px 24px ${color}18`,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = `linear-gradient(135deg, ${color}38, ${color}1a)`;
        e.currentTarget.style.transform = "translateX(6px)";
        e.currentTarget.style.boxShadow = `0 8px 32px ${color}44`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = `linear-gradient(135deg, ${color}22, ${color}0d)`;
        e.currentTarget.style.transform = "translateX(0)";
        e.currentTarget.style.boxShadow = `0 4px 24px ${color}18`;
      }}
    >
      <span>{label}</span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        {subtitle && <span style={{ fontSize: 9, opacity: 0.5, letterSpacing: "0.14em", fontWeight: 400 }}>{subtitle}</span>}
        <span style={{ fontSize: 18, opacity: 0.7 }}>›</span>
      </span>
    </button>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d14",
      backgroundImage: `
        radial-gradient(ellipse at 30% 40%, #1a0a2e66 0%, transparent 55%),
        radial-gradient(ellipse at 75% 70%, #0a1a2e55 0%, transparent 55%),
        radial-gradient(ellipse at 60% 10%, #1a0808 33 0%, transparent 45%)
      `,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      <style>{`
        @keyframes floatBob {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-18px) rotate(1deg); }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes titleReveal {
          from { opacity: 0; transform: translateY(32px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%,100% { box-shadow: 0 0 0 2px #f0c06088, 0 0 12px 2px #f0c06033; }
          50% { box-shadow: 0 0 0 3px #f0c060cc, 0 0 24px 6px #f0c06077; }
        }
        @keyframes subtitleFade {
          from { opacity: 0; letter-spacing: 0.3em; }
          to   { opacity: 1; letter-spacing: 0.22em; }
        }
        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes mahjongSpin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
      `}</style>

      {/* Floating background tiles */}
      {FLOATING_TILES.map((t, i) => <FloatingTile key={i} {...t} />)}

      {/* Decorative grid lines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 80px, #ffffff03 80px, #ffffff03 81px),
          repeating-linear-gradient(90deg, transparent, transparent 80px, #ffffff03 80px, #ffffff03 81px)
        `,
      }} />

      {/* Center card */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column",
        alignItems: "center",
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0)" : "translateY(30px)",
        transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
      }}>
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          {/* Mahjong tile icon cluster */}
          <div style={{
            display: "flex", justifyContent: "center", gap: 6,
            marginBottom: 24,
            animation: "titleReveal 0.8s cubic-bezier(0.16,1,0.3,1) 0.1s both",
          }}>
            {[
              { text: "🀇", label: "ph" },
              { text: "🀄", label: "" },
              { text: "🀙", label: "oo" },
            ].map((item, i) => (
              <div key={i} style={{
                width: i === 1 ? 72 : 52,
                height: i === 1 ? 82 : 60,
                borderRadius: 10,
                background: i === 1
                  ? "linear-gradient(145deg, #f0c06033, #f0c06011)"
                  : "linear-gradient(145deg, #2EC4B622, #2EC4B608)",
                border: i === 1 ? "2px solid #f0c06066" : "1.5px solid #2EC4B633",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: i === 1 ? 36 : 26,
                boxShadow: i === 1
                  ? "0 8px 32px #f0c06033, 0 0 0 1px #f0c06044"
                  : "0 4px 16px #2EC4B622",
                transform: i === 0 ? "rotate(-4deg) translateY(6px)" : i === 2 ? "rotate(4deg) translateY(6px)" : "translateY(0)",
                animation: `floatBob ${6 + i}s ease-in-out ${i * 0.4}s infinite`,
              }}>
                {item.text}
              </div>
            ))}
          </div>

          <div style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: "0.04em",
            lineHeight: 1,
            animation: "titleReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.2s both",
            background: "linear-gradient(135deg, #f0c060 0%, #ffdd88 40%, #e8963a 70%, #f0c060 100%)",
            backgroundSize: "400px 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Phonics
          </div>
          <div style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: "0.04em",
            lineHeight: 1,
            marginBottom: 14,
            animation: "titleReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.3s both",
            color: "#e0e0f0",
          }}>
            Mahjong
          </div>
          <div style={{
            fontSize: 12,
            color: "#ffffff55",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            animation: "subtitleFade 1s ease 0.6s both",
          }}>
            Build Words · Score Points · Master Phonics
          </div>
        </div>

        {/* Menu buttons */}
        <div style={{
          display: "flex", flexDirection: "column", gap: 12,
          width: 340,
        }}>
          {[
            {
              label: "▶  Single Player",
              color: "#f0c060",
              delay: "0.5s",
              onClick: () => { AudioEngine.play("modeSelect"); onPlay(); },
            },
            {
              label: "⚔  Multiplayer",
              color: "#2EC4B6",
              delay: "0.62s",
              subtitle: "COMING SOON",
              onClick: () => {},
            },
            {
              label: "📖  Rules",
              color: "#C77DFF",
              delay: "0.74s",
              onClick: () => { AudioEngine.play("modalOpen"); setModal("rules"); },
            },
            {
              label: "⚙  Settings",
              color: "#F4A261",
              delay: "0.74s",
              onClick: () => { AudioEngine.play("modalOpen"); setModal("settings"); },
            },
            {
              label: "✦  Credits",
              color: "#9EF01A",
              delay: "0.86s",
              onClick: () => { AudioEngine.play("modalOpen"); setModal("credits"); },
            },
          ].map(({ label, color, delay, subtitle, onClick }, i) => (
            <div key={i} style={{
              animation: `menuFadeIn 0.5s ease ${delay} both`,
              opacity: subtitle ? 0.6 : 1,
            }}>
              {menuBtn(label, color, subtitle ? undefined : onClick, subtitle)}
            </div>
          ))}
        </div>

        {/* Version tag */}
        <div style={{
          marginTop: 36, fontSize: 10,
          color: "#ffffff22", letterSpacing: "0.14em",
          textTransform: "uppercase",
          animation: "fadeIn 1s ease 1.2s both",
        }}>
          v1.1 · 108 tiles · 3,500+ words
        </div>
      </div>

      {/* Rules Modal */}
      {modal === "rules" && (
        <Modal title="📖 How to Play" onClose={() => { AudioEngine.play("modalClose"); setModal(null); }}>
          <div style={{ color: "#ffffff99", fontSize: 13, lineHeight: 1.9 }}>
            {[
              ["🀄 Your Hand", "You are dealt 13 tiles at the start of each round. Tiles come in 7 categories — vowels, consonants, special blends, and more."],
              ["✏️ Building Words", "Click tiles in order to select them and build a word. The word preview updates live as you pick tiles."],
              ["⇄ Dual Tiles", "Tiles showing two sounds (like ei/ey or h/wh) have a small ⇄ badge. Click it to toggle between the two sounds before building your word."],
              ["✓ Make Word", "Select tiles to spell a word, then press Make Word. It checks the dictionary and scores instantly — valid words are banked, invalid ones shake and clear so you can try again."],
              ["🏁 Ending a Round", "Press End Round when you're done. Used tiles are discarded and replaced with fresh ones from the deck."],
              ["💡 Hints", "Stuck? Press Get Hint to see possible words from your current hand. Click any hint word to make its tiles glow gold for 3 seconds."],
              ["🔄 Reset", "Press Reset in the top bar to start the entire game over with a freshly shuffled deck."],
              ["⭐ Scoring", "Points = word length × tile value. Specials: 5pt · R-Vowel: 4pt · Double Vowel: 3pt · Others: 2pt · Consonants/Vowels: 1pt each."],
            ].map(([title, desc], i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ color: "#f0c060", fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{title}</div>
                <div style={{ color: "#ffffff77", fontSize: 12 }}>{desc}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Settings Modal */}
      {modal === "settings" && (() => {
        const Toggle = ({ settingKey, on }) => (
          <button onClick={() => updateSetting(settingKey, !on)} style={{
            width: 46, height: 26, borderRadius: 13, flexShrink: 0,
            background: on ? "linear-gradient(90deg,#2EC4B6,#5de8e0)" : "#ffffff18",
            border: "none", cursor: "pointer", position: "relative",
            transition: "background 0.25s",
          }}>
            <div style={{
              position: "absolute", top: 3, left: on ? 23 : 3,
              width: 20, height: 20, borderRadius: "50%",
              background: "#fff", transition: "left 0.25s",
              boxShadow: "0 1px 4px #00000066",
            }}/>
          </button>
        );
        const Row = ({ settingKey, label, desc, on, accent }) => (
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "11px 14px", marginBottom: 7,
            background: "#ffffff06", border: "1px solid #ffffff0d",
            borderRadius: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#e0e0f0", fontWeight: 600, fontSize: 13, marginBottom: 2, whiteSpace: "nowrap" }}>{label}</div>
              <div style={{ color: "#ffffff44", fontSize: 11, lineHeight: 1.4 }}>{desc}</div>
            </div>
            <Toggle settingKey={settingKey} on={on} />
          </div>
        );
        const SectionHead = ({ text }) => (
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "#F4A26199", margin: "18px 0 10px", paddingLeft: 2 }}>{text}</div>
        );
        return (
          <Modal title="⚙ Settings" onClose={() => { AudioEngine.play("modalClose"); setModal(null); }}>
            <SectionHead text="Visual Effects" />
            <Row settingKey="smokeEffect"    label="💨 Word Smoke"       desc="Words rise as smoke when hovering tiles"          on={settings.smokeEffect} />
            <Row settingKey="cheerEffect"    label="🎉 Cheer Effect"     desc="Confetti burst and message when you score a word" on={settings.cheerEffect} />
            <Row settingKey="tileAnimations" label="✨ Tile Animations"  desc="Tiles lift and glow on hover and select"          on={settings.tileAnimations} />

            <SectionHead text="Sound" />
            {/* Volume slider rows — not using the Toggle Row component */}
            {[
              { key: "soundEffects", label: "🔊 Sound Effects", desc: "Tile clicks, word outcomes, hints & fanfares" },
              { key: "ambientMusic",  label: "🎵 Ambient Music",  desc: "Lo-fi pentatonic loop while you play" },
            ].map(({ key, label, desc }) => {
              const vol = settings[key];   // 0–1
              const muted = vol <= 0;
              const pct = Math.round(vol * 100);
              const accent = key === "ambientMusic" ? "#2EC4B6" : "#9EF01A";
              return (
                <div key={key} style={{
                  padding: "11px 14px", marginBottom: 7,
                  background: "#ffffff06", border: "1px solid #ffffff0d",
                  borderRadius: 12,
                }}>
                  {/* Label row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ color: "#e0e0f0", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>{label}</div>
                      <div style={{ color: "#ffffff44", fontSize: 11, marginTop: 1 }}>{desc}</div>
                    </div>
                    {/* Mute toggle button */}
                    <button
                      onClick={() => updateSetting(key, muted ? 0.5 : 0)}
                      style={{
                        padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                        cursor: "pointer", letterSpacing: "0.05em", border: "none",
                        background: muted ? "#ffffff15" : `${accent}22`,
                        color: muted ? "#ffffff44" : accent,
                        flexShrink: 0, marginLeft: 12,
                      }}
                    >{muted ? "OFF" : "ON"}</button>
                  </div>
                  {/* Slider row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 14 }}>{key === "ambientMusic" ? "🎵" : "🔊"}</span>
                    <div style={{ flex: 1, position: "relative" }}>
                      <input
                        type="range" min="0" max="1" step="0.01"
                        value={vol}
                        onChange={e => updateSetting(key, parseFloat(e.target.value))}
                        style={{
                          width: "100%", height: 4, cursor: "pointer",
                          accentColor: accent, opacity: muted ? 0.35 : 1,
                          transition: "opacity 0.2s",
                        }}
                      />
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, minWidth: 30, textAlign: "right",
                      color: muted ? "#ffffff33" : accent,
                      fontFamily: "monospace",
                    }}>{muted ? "—" : `${pct}%`}</span>
                  </div>
                </div>
              );
            })}

            <SectionHead text="Gameplay" />
            <Row settingKey="autoMakeWord" label="⚡ Auto-Make Word"   desc="Automatically score when selected tiles form a valid word" on={settings.autoMakeWord} />
            <Row settingKey="hintPenalty" label="💡 Hint Penalty"    desc="Halve points for words formed using hints"              on={settings.hintPenalty} />
            <Row settingKey="soundLabels" label="🏷 Category Labels" desc="Show the phonics category label on each tile"          on={settings.soundLabels} />

            <SectionHead text="My Words" />
            {/* Custom word import and management */}
            <div style={{ background: "#ffffff06", border: "1px solid #ffffff0d", borderRadius: 12, padding: "12px 14px", marginBottom: 7 }}>
              <div style={{ fontSize: 11, color: "#ffffff44", lineHeight: 1.5, marginBottom: 10 }}>
                Add words not in the built-in list. They're saved for this session only and scored normally when you use them.
              </div>
              {/* Bulk import */}
              <textarea
                value={wordImport}
                onChange={e => setWordImport(e.target.value)}
                placeholder="Type or paste words separated by commas or spaces…"
                rows={2}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#ffffff08", border: "1px solid #ffffff18",
                  borderRadius: 8, padding: "8px 10px",
                  color: "#e0e0f0", fontSize: 12, resize: "vertical",
                  fontFamily: "inherit", outline: "none", marginBottom: 8,
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: customWordList.length > 0 ? 10 : 0 }}>
                <button
                  onClick={() => {
                    const newWords = wordImport
                      .split(/[\s,]+/)
                      .map(w => w.trim().toLowerCase())
                      .filter(w => w.length >= 2 && /^[a-z]+$/.test(w));
                    newWords.forEach(addCustomWord);
                    setCustomWordList([...SESSION_CUSTOM_WORDS]);
                    setWordImport("");
                  }}
                  style={{
                    padding: "6px 14px", borderRadius: 8,
                    background: "linear-gradient(135deg, #C77DFF33, #C77DFF18)",
                    border: "1px solid #C77DFF66", color: "#e4acff",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em",
                  }}
                >+ Add Words</button>
                {customWordList.length > 0 && (
                  <button
                    onClick={() => {
                      SESSION_CUSTOM_WORDS.clear();
                      setCustomWordList([]);
                    }}
                    style={{
                      padding: "6px 12px", borderRadius: 8,
                      background: "#E8485518", border: "1px solid #E8485544",
                      color: "#ff6b7888", fontSize: 11, fontWeight: 700, cursor: "pointer",
                    }}
                  >🗑 Clear All</button>
                )}
              </div>
              {/* Show current custom words */}
              {customWordList.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 80, overflowY: "auto" }}>
                  {customWordList.map((w, i) => (
                    <span key={i} style={{
                      fontFamily: "'Noto Serif SC', serif", fontSize: 12, fontWeight: 700,
                      color: "#C77DFF", background: "#C77DFF0d",
                      border: "1px solid #C77DFF33",
                      borderRadius: 12, padding: "2px 9px", cursor: "pointer",
                    }}
                      title="Click to remove"
                      onClick={() => {
                        SESSION_CUSTOM_WORDS.delete(w);
                        setCustomWordList([...SESSION_CUSTOM_WORDS]);
                      }}
                    >{w} ✕</span>
                  ))}
                </div>
              )}
            </div>

            <SectionHead text="Tile Theme" />
            {/* Theme Picker — chess.com style */}
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:7 }}>
              {Object.entries(TILE_THEMES).map(([key, t]) => {
                const isActive = (settings.tileTheme || "neon") === key;
                return (
                  <button key={key} onClick={() => updateSetting("tileTheme", key)} style={{
                    display:"flex", alignItems:"center", gap:14,
                    padding:"11px 14px", borderRadius:12, cursor:"pointer",
                    background: isActive ? "#C77DFF18" : "#ffffff06",
                    border: isActive ? "1.5px solid #C77DFF66" : "1px solid #ffffff0d",
                    color: "#e0e0f0", textAlign:"left", transition:"all 0.15s",
                    outline:"none",
                  }}>
                    {/* Colour swatches */}
                    <div style={{ display:"flex", gap:3, flexShrink:0 }}>
                      {t.preview.map((c, i) => (
                        <div key={i} style={{
                          width:14, height:22, borderRadius:3,
                          background: key === "mahjong"
                            ? `linear-gradient(145deg,#faf3e0,#ede0c4)`
                            : key === "paper"
                            ? "#ffffff"
                            : "linear-gradient(145deg,#1e1e2e,#16161f)",
                          border: `1.5px solid ${c}`,
                          boxShadow: key === "neon" ? `0 0 5px ${c}55` : "none",
                          position:"relative", overflow:"hidden",
                        }}>
                          <div style={{ position:"absolute", inset:0, background:c, opacity: key==="neon"?0.18:key==="mahjong"?0:0.25 }}/>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:2 }}>{t.emoji} {t.label}</div>
                      <div style={{ fontSize:11, color:"#ffffff55", lineHeight:1.4 }}>{t.desc}</div>
                    </div>
                    {isActive && <div style={{ color:"#C77DFF", fontSize:16, flexShrink:0 }}>✓</div>}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 20, textAlign: "center" }}>
              <button onClick={() => Object.keys(DEFAULT_SETTINGS).forEach(k => updateSetting(k, DEFAULT_SETTINGS[k]))} style={{
                background: "#ffffff08", border: "1px solid #ffffff15",
                color: "#ffffff55", borderRadius: 8, padding: "7px 20px",
                cursor: "pointer", fontSize: 11, letterSpacing: "0.1em",
              }}>Reset to Defaults</button>
            </div>
          </Modal>
        );
      })()}

      {/* Credits Modal */}
      {modal === "credits" && (
        <Modal title="✦ Credits" onClose={() => { AudioEngine.play("modalClose"); setModal(null); }}>
          <div style={{ color: "#ffffff77", fontSize: 13, lineHeight: 1.8 }}>
            <div style={{ marginBottom: 24, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🀄</div>
              <div style={{ fontFamily: "'Noto Serif SC', serif", color: "#f0c060", fontSize: 18, fontWeight: 800 }}>
                Phonics Mahjong
              </div>
              <div style={{ fontSize: 11, color: "#ffffff33", letterSpacing: "0.12em", marginTop: 4 }}>
                A WORD-BUILDING PHONICS GAME
              </div>
            </div>

            {[
              ["🎮 Game Design", "Original concept combining Mahjong tile mechanics with structured phonics curriculum"],
              ["🔤 Phonics Curriculum", "Tile categories based on standard phonics frameworks: open/closed vowels, vowel teams, r-controlled vowels, consonant digraphs and blends"],
              ["📚 Word List", "~1,894 words drawn from Dolch, Fry, Oxford common word lists and phonics curriculum vocabulary"],
              ["⚙️ Built With", "React · Inline CSS · No external UI libraries"],
              ["💡 Special Thanks", "To everyone learning to read — one tile at a time"],
            ].map(([title, desc], i) => (
              <div key={i} style={{
                marginBottom: 16,
                padding: "12px 16px",
                background: "#ffffff06",
                borderRadius: 10,
                border: "1px solid #ffffff0d",
              }}>
                <div style={{ color: "#9EF01A", fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{title}</div>
                <div style={{ color: "#ffffff66", fontSize: 12 }}>{desc}</div>
              </div>
            ))}

            <div style={{ textAlign: "center", marginTop: 20, color: "#ffffff22", fontSize: 11, letterSpacing: "0.1em" }}>
              v1.0 · 108 TILES · 1894 WORDS
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


// ─── TIMED MODE ───────────────────────────────────────────────────────────────
const TIME_OPTIONS = [
  { label: "1 min",  seconds: 60 },
  { label: "2 min",  seconds: 120 },
  { label: "5 min",  seconds: 300 },
  { label: "10 min", seconds: 600 },
];

function TimedMode({ onBackToTitle, settings = DEFAULT_SETTINGS }) {
  // screens: "pick" | "play" | "done"
  const [phase, setPhase] = useState("pick");
  const [chosenTime, setChosenTime] = useState(120);
  const [timeLeft, setTimeLeft] = useState(120);
  const [hand, setHand] = useState([]);
  const [deck, setDeck] = useState([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [selected, setSelected] = useState([]);
  const [invalidShake, setInvalidShake] = useState(false);
  const [wordsScored, setWordsScored] = useState([]);  // [{word, pts, tiles}]
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [smokeWords, setSmokeWords] = useState([]);
  const smokeEnabled = settings.smokeEffect;
  const [timedCheerKey, setTimedCheerKey] = useState(0);
  const [highlightIds, setHighlightIds] = useState(new Set());
  const [hintWords, setHintWords] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [challengeWord, setChallengeWord] = useState(null); // { word, tiles } — unknown word awaiting player decision

  const timerRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const hoverTileRef = useRef(null);
  const usedRecentlyRef = useRef(new Set());
  const msgTimeout = useRef(null);
  // Refs for synchronous access in makeWord (avoid stale closures)
  const deckRef = useRef([]);
  const deckIndexRef = useRef(0);
  const handRef = useRef([]);

  // ── Start game ──────────────────────────────────────────────────────────────
  const startGame = (secs) => {
    if (settings.soundEffects > 0) AudioEngine.play("gameStart");
    if (settings.soundEffects > 0) setTimeout(() => AudioEngine.play("dealTiles"), 400);
    const d = shuffle(buildDeck());
    deckRef.current = d;
    deckIndexRef.current = 24;
    handRef.current = d.slice(0, 24);
    setDeck(d);
    setHand(d.slice(0, 24));
    setDeckIndex(24);
    setChosenTime(secs);
    setTimeLeft(secs);
    setSelected([]);
    setWordsScored([]);
    setScore(0);
    setMessage({ text: "", type: "" });
    setHintWords([]);
    setShowHint(false);
    setPhase("play");
  };

  // Keep refs in sync with state
  useEffect(() => { deckRef.current = deck; }, [deck]);
  useEffect(() => { deckIndexRef.current = deckIndex; }, [deckIndex]);
  useEffect(() => { handRef.current = hand; }, [hand]);

  // Music lifecycle
  useEffect(() => {
    AudioEngine.startMusic();
    return () => AudioEngine.stopMusic();
  }, []);
  useEffect(() => {
    AudioEngine.setMusicVolume(settings.ambientMusic);
  }, [settings.ambientMusic]);
  useEffect(() => {
    AudioEngine.setSfxVolume(settings.soundEffects);
  }, [settings.soundEffects]);

  // ── Countdown ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "play") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase("done");
          if (settings.soundEffects > 0) { AudioEngine.play("timeUp"); AudioEngine.play("sessionEnd"); }
          return 0;
        }
        if (t <= 10 && settings.soundEffects > 0) AudioEngine.play("timerTick");
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const pct = timeLeft / chosenTime;
  const timerColor = pct > 0.5 ? "#9EF01A" : pct > 0.25 ? "#F4A261" : "#E84855";

  // ── Message ─────────────────────────────────────────────────────────────────
  const showMsg = (text, type = "info") => {
    if (msgTimeout.current) clearTimeout(msgTimeout.current);
    setMessage({ text, type });
    msgTimeout.current = setTimeout(() => setMessage({ text: "", type: "" }), 2500);
  };

  // ── Tile interactions ────────────────────────────────────────────────────────
  const toggleTile = (tile) => {
    if (settings.soundEffects > 0) AudioEngine.play("tileClick");
    setSelected(prev => {
      const already = prev.findIndex(t => t.id === tile.id);
      if (already !== -1) return prev.filter((_, i) => i !== already);
      if (prev.some(t => t.id === tile.id)) return prev;
      return [...prev, tile];
    });
  };

  const cycleVariant = (tile) => {
    if (settings.soundEffects > 0) AudioEngine.play("tileCycle");
    const cycle = t => (!t.variants || t.id !== tile.id) ? t
      : { ...t, activeVariant: (t.activeVariant + 1) % t.variants.length };
    setHand(prev => prev.map(cycle));
    setSelected(prev => prev.map(cycle));
  };

  // ── Make Word (check + score in one step) ───────────────────────────────────
  const scoreTimedWord = (word, tiles) => {
    if (settings.soundEffects > 0) AudioEngine.play("wordCorrect");
    const basePts = tiles.reduce((acc, t) => {
      const b = { specials:5, r_vowel:4, double_vowel:3, others:2, main_consonants:1, open_vowel:1, closed_vowel:1 };
      return acc + (b[t.category] || 1);
    }, 0) * word.length;
    const usedHint = settings.hintPenalty && showHint && hintWords.some(h => h.word === word);
    const pts = usedHint ? Math.max(1, Math.floor(basePts / 2)) : basePts;
    if (settings.cheerEffect) setTimedCheerKey(k => k + 1);
    setWordsScored(prev => [...prev, { tiles, word, pts, hinted: usedHint, originalPts: basePts }]);
    setScore(s => s + pts);
    // Replace used tiles via refs to avoid stale closures
    const usedIds = new Set(tiles.map(t => t.id));
    const currentDeck = deckRef.current;
    let idx = deckIndexRef.current;
    const remaining = handRef.current.filter(t => !usedIds.has(t.id));
    const needed = 24 - remaining.length;
    const newTiles = [];
    for (let i = 0; i < needed; i++) {
      if (idx >= currentDeck.length) idx = 0;
      const src = currentDeck[idx++];
      newTiles.push(parseTile(src.text, src.category, freshTileId()));
    }
    deckIndexRef.current = idx;
    const nextHand = [...remaining, ...newTiles];
    handRef.current = nextHand;
    setHand(nextHand);
    showMsg(`+${pts} pts! "${word}" scored!`, "success");
    setSelected([]);
    setHintWords([]);
    setShowHint(false);
    setChallengeWord(null);
  };

  const makeWord = () => {
    if (selected.length === 0) { showMsg("Select some tiles first!", "warn"); return; }
    const word = buildWordFromTiles(selected);
    if (word.length < 2) { showMsg("Too short!", "warn"); return; }
    if (wordsScored.find(w => w.word === word)) { showMsg(`"${word}" already scored!`, "warn"); return; }
    if (!checkWordInSet(word)) {
      if (settings.soundEffects > 0) AudioEngine.play("wordWrong");
      setChallengeWord({ word, tiles: [...selected] });
      return;
    }
    scoreTimedWord(word, selected);
  };

  const acceptTimedChallenge = () => {
    if (!challengeWord) return;
    addCustomWord(challengeWord.word);
    scoreTimedWord(challengeWord.word, challengeWord.tiles);
  };

  const rejectTimedChallenge = () => {
    setChallengeWord(null);
    setInvalidShake(true);
    setTimeout(() => { setInvalidShake(false); setSelected([]); }, 600);
  };

  const clearSelection = () => { setSelected([]); };

  // ── AUTO-MAKE WORD (timed mode) ──────────────────────────────────────────────
  useEffect(() => {
    if (!settings.autoMakeWord || phase !== "play" || selected.length < 1) return;
    const word = buildWordFromTiles(selected);
    if (word.length < 2 || !checkWordInSet(word)) return;
    if (wordsScored.find(w => w.word === word)) return;
    const t = setTimeout(() => { makeWord(); }, 320);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, settings.autoMakeWord, phase]);

  // ── Hint ────────────────────────────────────────────────────────────────────
  const findHints = () => {
    const tileSounds = hand.map(tile => tile.variants
      ? tile.variants.map(v => ({ sound: v, tile }))
      : [{ sound: tile.text.replace(/-/g,""), tile }]);
    const found = [];
    const used = new Set(wordsScored.map(w => w.word));

    function matchWord(word, pos, usedFlags, ids) {
      if (pos === word.length) return { ok: true, ids: [...ids] };
      for (let i = 0; i < tileSounds.length; i++) {
        if (usedFlags[i]) continue;
        for (const { sound, tile } of tileSounds[i]) {
          if (word.slice(pos, pos + sound.length) === sound) {
            usedFlags[i] = true; ids.push(tile.id);
            const r = matchWord(word, pos + sound.length, usedFlags, ids);
            if (r.ok) return r;
            ids.pop(); usedFlags[i] = false;
          }
        }
      }
      return { ok: false };
    }

    const allWords = [...WORD_LIST, ...SESSION_CUSTOM_WORDS];
    for (const word of allWords) {
      if (found.length >= 6) break;
      if (word.length < 2 || used.has(word)) continue;
      const r = matchWord(word, 0, new Array(tileSounds.length).fill(false), []);
      if (r.ok) found.push({ word, tileIds: r.ids });
    }
    setHintWords(found);
    setShowHint(true);
    if (found.length === 0) showMsg("No obvious words found — try cycling tiles!", "warn");
  };

  const highlightHint = (hint) => {
    if (settings.soundEffects > 0) AudioEngine.play("hintReveal");
    setHighlightIds(new Set(hint.tileIds));
    setTimeout(() => setHighlightIds(new Set()), 3000);
  };

  // ── Smoke ───────────────────────────────────────────────────────────────────
  const removeWord = useCallback((id) => setSmokeWords(prev => prev.filter(w => w.id !== id)), []);
  const handleTileHover = useCallback((tile, x, y) => {
    clearInterval(spawnTimerRef.current);
    clearTimeout(spawnTimerRef._t1);
    clearTimeout(spawnTimerRef._t2);
    if (!tile || !smokeEnabled) { hoverTileRef.current = null; return; }
    hoverTileRef.current = tile;
    const color = TILE_CATEGORIES[tile.category].color;
    const wordPool = getWordsForSound(getTileSound(tile));
    if (!wordPool.length) return;
    const spawnOne = () => {
      if (!hoverTileRef.current) return;
      let word;
      for (let i=0;i<12;i++){
        word=wordPool[Math.floor(Math.random()*wordPool.length)];
        if(!usedRecentlyRef.current.has(word)) break;
      }
      usedRecentlyRef.current.add(word);
      if(usedRecentlyRef.current.size>8){const f=usedRecentlyRef.current.values().next().value;usedRecentlyRef.current.delete(f);}
      setSmokeWords(prev=>[...prev.slice(-16),makeSmokeWord(word,x,y,color)]);
    };
    spawnOne();
    spawnTimerRef._t1=setTimeout(()=>{if(hoverTileRef.current)spawnOne();},700);
    spawnTimerRef._t2=setTimeout(()=>{if(hoverTileRef.current)spawnOne();},1400);
    spawnTimerRef.current=setInterval(spawnOne,1100);
  }, [smokeEnabled]);

  // ── Stats for end screen ────────────────────────────────────────────────────
  const longestWord = wordsScored.reduce((a,b)=>b.word.length>a.length?b.word:a,"");
  const bestWord = wordsScored.reduce((a,b)=>b.pts>a.pts?b:a,{word:"—",pts:0});
  const avgLen = wordsScored.length ? (wordsScored.reduce((s,w)=>s+w.word.length,0)/wordsScored.length).toFixed(1) : 0;

  // ─── PICK SCREEN ─────────────────────────────────────────────────────────────
  if (phase === "pick") return (
    <div style={{
      minHeight:"100vh", background:"#0d0d14",
      backgroundImage:"radial-gradient(ellipse at 30% 40%, #2a0a0a66 0%,transparent 55%),radial-gradient(ellipse at 75% 70%, #0a1a2e55 0%,transparent 55%)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#e0e0f0",
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{textAlign:"center",animation:"slideUp 0.6s ease both"}}>
        <div style={{fontSize:48,marginBottom:12}}>⏱</div>
        <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:36,fontWeight:900,color:"#E84855",marginBottom:6,letterSpacing:"0.04em"}}>Timed Mode</div>
        <div style={{fontSize:13,color:"#ffffff55",marginBottom:40,letterSpacing:"0.12em",textTransform:"uppercase"}}>24 tiles · Auto-replace · Race the clock</div>

        <div style={{fontSize:13,color:"#ffffff77",marginBottom:18,letterSpacing:"0.1em",textTransform:"uppercase"}}>Choose your time limit</div>
        <div style={{display:"flex",gap:14,justifyContent:"center",marginBottom:44}}>
          {TIME_OPTIONS.map(opt => (
            <button key={opt.seconds} onClick={()=>startGame(opt.seconds)} style={{
              padding:"18px 28px", borderRadius:14,
              background: "linear-gradient(135deg,#E8485522,#E8485511)",
              border:"2px solid #E8485566",
              color:"#ff6b78", fontSize:18, fontWeight:800,
              cursor:"pointer", letterSpacing:"0.06em",
              transition:"all 0.2s", fontFamily:"'Noto Serif SC',serif",
              boxShadow:"0 4px 24px #E8485522",
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="linear-gradient(135deg,#E8485544,#E8485522)";e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 10px 32px #E8485544";}}
            onMouseLeave={e=>{e.currentTarget.style.background="linear-gradient(135deg,#E8485522,#E8485511)";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 24px #E8485522";}}>
              {opt.label}
            </button>
          ))}
        </div>
        <button onClick={() => { AudioEngine.play("backToMenu"); onBackToTitle(); }} style={{
          background:"#ffffff0a",border:"1px solid #ffffff15",color:"#ffffff88",
          borderRadius:10,padding:"9px 18px",cursor:"pointer",fontSize:12,fontWeight:700,
          display:"flex",alignItems:"center",gap:6,margin:"0 auto",letterSpacing:"0.06em",
        }}>🚪 Home</button>
      </div>
    </div>
  );

  // ─── END SCREEN ──────────────────────────────────────────────────────────────
  if (phase === "done") return (
    <div style={{
      minHeight:"100vh", background:"#0d0d14",
      backgroundImage:"radial-gradient(ellipse at 50% 40%, #1a0a2e88 0%,transparent 60%)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#e0e0f0",
    }}>
      <style>{`@keyframes popIn{from{opacity:0;transform:scale(0.85) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      <div style={{
        background:"#13131f", border:"1px solid #ffffff18", borderRadius:24,
        padding:"40px 44px", maxWidth:520, width:"90%",
        boxShadow:"0 40px 100px #000000cc",
        animation:"popIn 0.5s cubic-bezier(0.16,1,0.3,1) both",
        textAlign:"center",
      }}>
        <div style={{fontSize:52,marginBottom:8}}>🏁</div>
        <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:30,fontWeight:900,color:"#f0c060",marginBottom:4}}>Time's Up!</div>
        <div style={{fontSize:12,color:"#ffffff44",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:32}}>
          {fmt(chosenTime)} game · {wordsScored.length} word{wordsScored.length!==1?"s":""} scored
        </div>

        {/* Big score */}
        <div style={{
          background:"linear-gradient(135deg,#f0c06022,#f0c06008)",
          border:"1px solid #f0c06033", borderRadius:16,
          padding:"20px", marginBottom:20,
        }}>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.14em",color:"#f0c06088",marginBottom:4}}>Final Score</div>
          <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:56,fontWeight:900,color:"#f0c060",lineHeight:1}}>{score}</div>
          <div style={{fontSize:12,color:"#f0c06066",marginTop:4}}>{wordsScored.length>0?`${(score/wordsScored.length).toFixed(1)} pts / word`:""}</div>
        </div>

        {/* Stat grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:24}}>
          {[
            ["Words", wordsScored.length],
            ["Best Word", bestWord.word!=="—"?`${bestWord.word} (+${bestWord.pts})`:"-"],
            ["Longest", longestWord||"-"],
            ["Avg Length", avgLen||"-"],
            ["Top Score", bestWord.pts||0],
            ["Letters", wordsScored.reduce((s,w)=>s+w.word.length,0)],
          ].map(([label,val],i)=>(
            <div key={i} style={{
              background:"#ffffff08",border:"1px solid #ffffff0f",
              borderRadius:12,padding:"12px 10px",
            }}>
              <div style={{fontSize:10,color:"#ffffff44",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{label}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#e0e0f0",fontFamily:"'Noto Serif SC',serif"}}>{val}</div>
            </div>
          ))}
        </div>

        {/* Words list */}
        {wordsScored.length > 0 && (
          <div style={{
            background:"#9EF01A0a",border:"1px solid #9EF01A18",
            borderRadius:12,padding:"14px 16px",marginBottom:24,
            maxHeight:130,overflowY:"auto",textAlign:"left",
          }}>
            <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#9EF01A77",marginBottom:10}}>Words Scored</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {wordsScored.map((w,i)=>(
                <span key={i} style={{
                  background:w.hinted?"#F4A26115":"#9EF01A15",
                  border:w.hinted?"1px solid #F4A26133":"1px solid #9EF01A33",
                  borderRadius:6, padding:"3px 9px",
                  color:w.hinted?"#ffbe85":"#c8ff5a", fontSize:12, fontWeight:700,
                  fontFamily:"'Noto Serif SC',serif",
                  display:"inline-flex", alignItems:"center", gap:4,
                }}>
                  {w.word}{w.hinted?" 💡":""}
                  {w.hinted&&w.originalPts&&<span style={{opacity:0.4,fontSize:10,textDecoration:"line-through"}}>{w.originalPts}</span>}
                  <span style={{opacity:0.6,fontSize:10}}>+{w.pts}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:12,justifyContent:"center"}}>
          <button onClick={()=>startGame(chosenTime)} style={{
            padding:"12px 28px",borderRadius:12,
            background:"linear-gradient(135deg,#E84855,#c0192a)",
            border:"1px solid #E8485566",color:"#fff",
            fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:"0.08em",
          }}>▶ Play Again</button>
          <button onClick={()=>setPhase("pick")} style={{
            padding:"12px 28px",borderRadius:12,
            background:"#ffffff0a",border:"1px solid #ffffff18",
            color:"#ffffff77",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:"0.08em",
          }}>⏱ Change Time</button>
          <button onClick={() => { AudioEngine.play("backToMenu"); onBackToTitle(); }} style={{
            padding:"12px 18px",borderRadius:12,
            background:"#ffffff06",border:"1px solid #ffffff12",
            color:"#ffffff88",fontSize:13,fontWeight:700,cursor:"pointer",
            display:"flex",alignItems:"center",gap:6,letterSpacing:"0.06em",
          }}>🚪 Home</button>
        </div>
      </div>
    </div>
  );

  // ─── PLAY SCREEN ─────────────────────────────────────────────────────────────
  const wordPreview = selected.map(t=>getTileSound(t)).join("").toLowerCase();
  const msgColors = {success:"#c8ff5a",error:"#ff6b78",warn:"#ffbe85",info:"#5de8e0"};
  const msgBg = {success:"#9EF01A22",error:"#E8485522",warn:"#F4A26122",info:"#2EC4B622"};

  const _th = TILE_THEMES[settings.tileTheme] || TILE_THEMES.neon;
  return (
    <div style={{
      minHeight:"100vh",
      background: _th.pageBg,
      backgroundImage: _th.pageBgImage ? "radial-gradient(ellipse at 20% 20%,#1a0a2e44 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,#0a1a2e44 0%,transparent 50%),repeating-linear-gradient(0deg,transparent,transparent 60px,#ffffff03 60px,#ffffff03 61px),repeating-linear-gradient(90deg,transparent,transparent 60px,#ffffff03 60px,#ffffff03 61px)" : "none",
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      color: _th.pageText,
      paddingBottom:40, transition:"background 0.4s",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes smokeRise{0%{opacity:0;transform:translateX(-50%) translateY(0)}12%{opacity:0.85}80%{opacity:0.6}100%{opacity:0;transform:translateX(-50%) translateY(-160px)}} @keyframes timerPulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Header */}
      <div style={{
        borderBottom:`1px solid ${_th.headerBorder}`,background:_th.headerBg,
        backdropFilter:"blur(12px)",padding:"12px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:100,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={() => { AudioEngine.play("backToMenu"); onBackToTitle(); }} style={{
            background:"#ffffff08",border:"1px solid #ffffff18",
            color:"#ffffff88",borderRadius:10,padding:"7px 14px",
            cursor:"pointer",fontSize:12,fontWeight:700,
            display:"flex",alignItems:"center",gap:6,
            flexShrink:0,transition:"all 0.15s",letterSpacing:"0.06em",
          }}>🚪 Home</button>
          <div style={{fontSize:22}}>⏱</div>
          <div>
            <div style={{fontFamily:"'Noto Serif SC',serif",fontSize:18,fontWeight:800,color:"#E84855",letterSpacing:"0.06em"}}>Timed Mode</div>
            <div style={{fontSize:10,color:"#ffffff44",letterSpacing:"0.1em",textTransform:"uppercase"}}>24 tiles · Auto-replace</div>
          </div>
        </div>

        {/* Big countdown */}
        <div style={{
          fontFamily:"monospace",fontSize:38,fontWeight:900,
          color:timerColor,letterSpacing:"0.1em",
          textShadow:`0 0 20px ${timerColor}88`,
          animation: pct < 0.17 ? "timerPulse 0.8s ease infinite" : "none",
          transition:"color 0.5s",
        }}>{fmt(timeLeft)}</div>

        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"#ffffff44",textTransform:"uppercase",letterSpacing:"0.1em"}}>Score</div>
            <div style={{fontSize:22,fontWeight:700,color:"#9EF01A",fontFamily:"monospace"}}>{score}</div>
          </div>
          <div style={{width:1,height:32,background:"#ffffff15"}}/>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"#ffffff44",textTransform:"uppercase",letterSpacing:"0.1em"}}>Words</div>
            <div style={{fontSize:22,fontWeight:700,color:"#f0c060",fontFamily:"monospace"}}>{wordsScored.length}</div>
          </div>
          <div style={{width:1,height:32,background:"#ffffff15"}}/>
          <button onClick={()=>setSmokeEnabled(v=>!v)} style={{
            background:smokeEnabled?"linear-gradient(135deg,#2EC4B622,#2EC4B611)":"#ffffff08",
            border:smokeEnabled?"1px solid #2EC4B655":"1px solid #ffffff18",
            color:smokeEnabled?"#5de8e0":"#ffffff33",
            borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,
            fontWeight:700,transition:"all 0.2s",letterSpacing:"0.06em",
          }}>{smokeEnabled?"💨 ON":"💨 OFF"}</button>
        </div>
      </div>

      {/* Timer bar */}
      <div style={{height:3,background:"#ffffff0a",position:"relative"}}>
        <div style={{
          position:"absolute",left:0,top:0,height:"100%",
          width:`${pct*100}%`,
          background:`linear-gradient(90deg,${timerColor}88,${timerColor})`,
          transition:"width 1s linear, background 0.5s",
          boxShadow:`0 0 8px ${timerColor}88`,
        }}/>
      </div>

      {/* Message */}
      {message.text && (
        <div style={{
          margin:"10px 20px 0",padding:"9px 16px",borderRadius:10,
          background:msgBg[message.type]||"#ffffff11",
          border:`1px solid ${(msgBg[message.type]||"#ffffff22").replace("22","55")}`,
          fontSize:13,color:msgColors[message.type]||"#e0e0f0",fontWeight:500,
        }}>{message.text}</div>
      )}

      <div style={{display:"flex",gap:18,padding:"16px 20px 0",alignItems:"flex-start"}}>
        {/* Main area */}
        <div style={{flex:1}}>
          {/* Word builder */}
          <div style={{background:"#ffffff06",border:"1px solid #ffffff10",borderRadius:14,padding:"14px 18px",marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.14em",color:"#ffffff44"}}>
                Word Builder — {selected.length} tile{selected.length!==1?"s":""}
              </div>
              <div style={{fontSize:10,color:settings.autoMakeWord?"#9EF01A88":"#ffffff22",letterSpacing:"0.1em"}}>
                {settings.autoMakeWord ? "⚡ Auto-on" : "Manual mode"}
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,minHeight:48,alignItems:"center",background:"#ffffff03",borderRadius:10,padding:"8px 10px",border:selected.length>0?"1px solid #ffffff14":"1px dashed #ffffff0a",marginBottom:selected.length>0?8:0}}>
              {selected.length===0
                ? <div style={{color:"#ffffff18",fontSize:13,fontStyle:"italic"}}>Click tiles below…</div>
                : selected.map(t=><Tile key={t.id} tile={t} selected onClick={()=>toggleTile(t)} onCycleVariant={cycleVariant} onHover={handleTileHover} small/>)
              }
            </div>
            {selected.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginTop:8}}>
                <div style={{flex:1,fontFamily:"'Noto Serif SC',serif",color:"#f0c060",fontWeight:800,fontSize:20,letterSpacing:"0.04em"}}>{wordPreview}</div>
                {!settings.autoMakeWord && (
                  <button onClick={makeWord} style={{padding:"7px 16px",borderRadius:9,background:"linear-gradient(135deg,#9EF01A33,#9EF01A18)",border:"1px solid #9EF01A66",color:"#c8ff5a",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",animation:invalidShake?"shake 0.5s ease":"none"}}>
                    ✓ Make Word
                  </button>
                )}
                {settings.autoMakeWord && invalidShake && (
                  <div style={{padding:"5px 12px",borderRadius:9,background:"#E8485522",border:"1px solid #E8485566",color:"#ff6b78",fontSize:12,fontWeight:700,animation:"shake 0.5s ease"}}>✕ Not a word</div>
                )}
                <button onClick={clearSelection} style={{padding:"7px 14px",borderRadius:9,background:"#ffffff08",border:"1px solid #ffffff18",color:"#ffffff55",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em"}}>
                  ✕ Clear
                </button>
              </div>
            )}

            {/* Challenge prompt for timed mode */}
            {challengeWord && (
              <div style={{
                marginTop: 12,
                background: "linear-gradient(135deg, #F4A26114, #F4A26108)",
                border: "1px solid #F4A26155",
                borderRadius: 12, padding: "12px 14px",
                animation: "fadeIn 0.2s ease",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 18, lineHeight: 1 }}>🤔</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#ffbe85", marginBottom: 2 }}>
                      "<span style={{ fontFamily: "'Noto Serif SC', serif" }}>{challengeWord.word}</span>" isn't in our list
                    </div>
                    <div style={{ fontSize: 11, color: "#ffffff44", marginBottom: 8 }}>Real word? Add it and score, or clear.</div>
                    <div style={{ display: "flex", gap: 7 }}>
                      <button onClick={acceptTimedChallenge} style={{
                        padding:"5px 12px", borderRadius:8,
                        background:"#F4A26133", border:"1px solid #F4A26177",
                        color:"#ffbe85", fontSize:11, fontWeight:800, cursor:"pointer",
                      }}>✓ Add &amp; Score</button>
                      <button onClick={rejectTimedChallenge} style={{
                        padding:"5px 10px", borderRadius:8,
                        background:"#ffffff08", border:"1px solid #ffffff18",
                        color:"#ffffff44", fontSize:11, fontWeight:700, cursor:"pointer",
                      }}>✕ Clear</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 24-tile hand — 4 rows of 6 */}
          <div style={{background:"#ffffff06",border:"1px solid #ffffff10",borderRadius:14,padding:"14px 18px"}}>
            <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.14em",color:"#ffffff44",marginBottom:12}}>
              Your 24 Tiles
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:9}}>
              {(() => {
                const selIds = new Set(selected.map(s => s.id));
                return hand.map(tile => (
                  <Tile key={tile.id} tile={tile}
                    selected={selIds.has(tile.id)}
                    highlighted={highlightIds.has(tile.id)}
                    onClick={toggleTile}
                    onCycleVariant={cycleVariant}
                    onHover={handleTileHover}
                    theme={settings.tileTheme}
                    animated={settings.tileAnimations}
                    showLabel={settings.soundLabels}
                  />
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div style={{width:210,flexShrink:0}}>
          {/* Hint */}
          <div style={{marginBottom:12}}>
            <button onClick={findHints} style={{
              width:"100%",padding:"10px",borderRadius:12,
              background:"linear-gradient(135deg,#C77DFF22,#C77DFF11)",
              border:"1px solid #C77DFF55",color:"#e4acff",
              fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",
              marginBottom:showHint&&hintWords.length>0?10:0,
            }}>💡 Hint</button>
            {showHint&&hintWords.length>0&&(
              <div style={{background:"#C77DFF0d",border:"1px solid #C77DFF22",borderRadius:10,padding:"10px 12px"}}>
                <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",color:"#C77DFF88",marginBottom:7}}>Click to highlight</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                  {hintWords.map((h,i)=>(
                    <button key={i} onClick={()=>highlightHint(h)} style={{
                      background:"#C77DFF18",border:"1px solid #C77DFF44",
                      borderRadius:6,padding:"3px 8px",color:"#e4acff",
                      fontSize:12,fontWeight:700,cursor:"pointer",
                      fontFamily:"'Noto Serif SC',serif",
                    }}>{h.word}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Words this game */}
          <div style={{background:"#ffffff06",border:"1px solid #ffffff10",borderRadius:14,padding:"14px 16px",maxHeight:420,overflowY:"auto"}}>
            <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.14em",color:"#ffffff44",marginBottom:10}}>Words Scored</div>
            {wordsScored.length===0
              ? <div style={{color:"#ffffff22",fontSize:12,fontStyle:"italic"}}>No words yet…</div>
              : [...wordsScored].reverse().map((w,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:w.hinted?"#F4A2610a":"#9EF01A0f",border:w.hinted?"1px solid #F4A26133":"1px solid #9EF01A22",borderRadius:8,padding:"6px 10px",marginBottom:6}}>
                  <span style={{fontFamily:"'Noto Serif SC',serif",color:w.hinted?"#ffbe85":"#c8ff5a",fontWeight:700,fontSize:14}}>{w.word}{w.hinted?" 💡":""}</span>
                  <span style={{fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                    {w.hinted&&w.originalPts&&<span style={{color:"#ffffff33",textDecoration:"line-through",fontSize:10}}>{w.originalPts}</span>}
                    <span style={{color:w.hinted?"#F4A261":"#9EF01A"}}>+{w.pts}</span>
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {timedCheerKey > 0 && <CheerBurst key={timedCheerKey} />}
      <WordSmokeCanvas words={smokeWords} onWordDone={removeWord}/>
    </div>
  );
}

// ─── CONFETTI / CHEER EFFECT ─────────────────────────────────────────────────
const CHEER_MESSAGES = [
  { text: "✨ Nice Word! ✨",    color: "#f0c060" },
  { text: "🔥 On Fire!",         color: "#E84855" },
  { text: "💎 Brilliant!",       color: "#2EC4B6" },
  { text: "⚡ Wordsmith!",       color: "#C77DFF" },
  { text: "🌟 Magnificent!",     color: "#f0c060" },
  { text: "🎯 Spot On!",         color: "#9EF01A" },
  { text: "🚀 Incredible!",      color: "#CBF3F0" },
  { text: "👑 Legendary!",       color: "#F4A261" },
  { text: "💥 Boom! Word!",      color: "#E84855" },
  { text: "🎉 Fantastic!",       color: "#C77DFF" },
  { text: "⭐ Superb!",          color: "#f0c060" },
  { text: "🏆 Champion!",        color: "#9EF01A" },
  { text: "🌈 Dazzling!",        color: "#2EC4B6" },
  { text: "🎸 Rock Star!",       color: "#F4A261" },
  { text: "🦄 Extraordinary!",   color: "#C77DFF" },
  { text: "💫 Unstoppable!",     color: "#f0c060" },
  { text: "🎪 Showstopper!",     color: "#E84855" },
  { text: "🌊 Crushing It!",     color: "#2EC4B6" },
  { text: "🎓 Scholar!",         color: "#CBF3F0" },
  { text: "🔮 Spellbinding!",    color: "#C77DFF" },
];

function CheerBurst() {
  // Self-contained: mounts → plays → unmounts via CSS animation duration
  // Parent controls visibility by mounting/unmounting via key prop
  const msg = CHEER_MESSAGES[Math.floor(Math.random() * CHEER_MESSAGES.length)];
  const pieces = 32;
  const colors = ["#f0c060","#E84855","#2EC4B6","#C77DFF","#9EF01A","#CBF3F0","#F4A261","#fff"];

  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:10000, overflow:"hidden" }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes cheerPop {
          0%   { transform: translateX(-50%) scale(0); opacity: 0; }
          40%  { transform: translateX(-50%) scale(1.2); opacity: 1; }
          70%  { transform: translateX(-50%) scale(0.97); opacity: 1; }
          100% { transform: translateX(-50%) scale(0.9) translateY(-40px); opacity: 0; }
        }
      `}</style>
      {Array.from({ length: pieces }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = 2 + Math.random() * 96;
        const delay = Math.random() * 0.6;
        const dur = 1.0 + Math.random() * 1.0;
        const size = 5 + Math.random() * 9;
        const shape = Math.random();
        return (
          <div key={i} style={{
            position:"absolute", left:`${left}%`, top:"-10px",
            width:size,
            height: shape > 0.66 ? size : shape > 0.33 ? size * 0.35 : size * 0.7,
            borderRadius: shape > 0.66 ? "50%" : shape > 0.33 ? 1 : "2px 6px",
            background: color,
            animation: `confettiFall ${dur}s ease-in ${delay}s forwards`,
            boxShadow: `0 0 5px ${color}88`,
          }}/>
        );
      })}
      <div style={{
        position:"absolute", left:"50%", top:"36%",
        fontFamily:"'Noto Serif SC',serif",
        fontSize: 50,
        fontWeight:900,
        color: msg.color,
        textShadow:`0 0 40px ${msg.color}88, 0 0 80px ${msg.color}44, 0 4px 16px #00000099`,
        animation:"cheerPop 1.6s cubic-bezier(0.16,1,0.3,1) forwards",
        whiteSpace:"nowrap",
        pointerEvents:"none",
        letterSpacing:"0.02em",
      }}>
        {msg.text}
      </div>
    </div>
  );
}

// ─── SINGLE PLAYER SUB-MENU ───────────────────────────────────────────────────
function SinglePlayerMenu({ onEndless, onTimed, onClassic, onBack }) {
  const [entered, setEntered] = useState(false);
  const [hovered, setHovered]   = useState(null);

  useEffect(() => { setTimeout(() => setEntered(true), 60); }, []);

  const modes = [
    {
      id: "endless",
      icon: "∞",
      label: "Endless Mode",
      desc: "Build words round after round. No timer, no pressure — pure phonics zen.",
      color: "#f0c060",
      bg: "linear-gradient(135deg, #f0c06018, #f0c06006)",
      border: "#f0c06055",
      onClick: () => { AudioEngine.play("modeSelect"); onEndless(); },
    },
    {
      id: "timed",
      icon: "⏱",
      label: "Timed Mode",
      desc: "Race the clock. Score as many words as you can before time runs out.",
      color: "#E84855",
      bg: "linear-gradient(135deg, #E8485518, #E8485506)",
      border: "#E8485555",
      onClick: () => { AudioEngine.play("modeSelect"); onTimed(); },
    },
    {
      id: "classic",
      icon: "🀄",
      label: "Classic Mahjong",
      desc: "Draw, discard, fuse words. Play against bots on a real Mahjong table.",
      color: "#C77DFF",
      bg: "linear-gradient(135deg, #C77DFF18, #C77DFF06)",
      border: "#C77DFF55",
      onClick: () => { AudioEngine.play("modeSelect"); onClassic(); },
    },
  ];

  // Mini floating tile decoration positions
  const floaters = [
    { text:"sh", color:"#FFBF69", x:5,  y:12, dur:7, delay:0   },
    { text:"ee", color:"#2EC4B6", x:88, y:8,  dur:8, delay:1.2 },
    { text:"or", color:"#CBF3F0", x:7,  y:75, dur:6, delay:0.5 },
    { text:"ng", color:"#9EF01A", x:90, y:70, dur:9, delay:2   },
    { text:"ai", color:"#2EC4B6", x:4,  y:45, dur:7, delay:1.8 },
    { text:"th", color:"#FFBF69", x:93, y:38, dur:8, delay:0.3 },
    { text:"oo", color:"#C77DFF", x:48, y:90, dur:6, delay:2.5 },
    { text:"ph", color:"#9EF01A", x:52, y:4,  dur:9, delay:0.9 },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0d14",
      backgroundImage: `
        radial-gradient(ellipse at 15% 25%, #1a0a2e55 0%, transparent 45%),
        radial-gradient(ellipse at 85% 75%, #0a1a2e55 0%, transparent 45%),
        radial-gradient(ellipse at 50% 50%, #0d1a0d33 0%, transparent 60%)
      `,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: "#e0e0f0",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes spFloat {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          50%      { transform: translateY(-22px) rotate(1deg); }
        }
        @keyframes spFadeIn {
          from { opacity:0; transform: translateY(28px) scale(0.96); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        @keyframes spCardIn {
          from { opacity:0; transform: translateX(-20px) scale(0.97); }
          to   { opacity:1; transform: translateX(0) scale(1); }
        }
        @keyframes shimmerSlide {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes iconBounce {
          0%,100% { transform: translateY(0) scale(1); }
          40%     { transform: translateY(-8px) scale(1.15); }
          70%     { transform: translateY(-3px) scale(1.05); }
        }
        @keyframes orbPulse {
          0%,100% { transform: scale(1); opacity:0.4; }
          50%     { transform: scale(1.15); opacity:0.7; }
        }
        .sp-card:hover { transform: translateY(-4px) scale(1.012) !important; }
        .sp-card { transition: transform 0.22s cubic-bezier(0.16,1,0.3,1), box-shadow 0.22s ease, border-color 0.2s ease !important; }
      `}</style>

      {/* Floating background tiles */}
      {floaters.map((f, i) => (
        <div key={i} style={{
          position:"absolute", left:`${f.x}%`, top:`${f.y}%`,
          width:46, height:54, borderRadius:8,
          border:`1.5px solid ${f.color}44`,
          background:`linear-gradient(145deg, ${f.color}14, ${f.color}06)`,
          display:"flex", alignItems:"center", justifyContent:"center",
          color:`${f.color}77`, fontFamily:"'Noto Serif SC',serif",
          fontSize: f.text.length > 2 ? 12 : 18, fontWeight:700,
          boxShadow:`0 4px 18px ${f.color}18`,
          animation:`spFloat ${f.dur}s ease-in-out ${f.delay}s infinite`,
          pointerEvents:"none",
        }}>{f.text}</div>
      ))}

      {/* Ambient orbs */}
      {[
        { color:"#C77DFF", x:20, y:30, size:180, delay:0 },
        { color:"#f0c060", x:75, y:60, size:140, delay:1.5 },
        { color:"#E84855", x:50, y:80, size:120, delay:3 },
      ].map((orb, i) => (
        <div key={i} style={{
          position:"absolute", left:`${orb.x}%`, top:`${orb.y}%`,
          width:orb.size, height:orb.size,
          borderRadius:"50%",
          background:`radial-gradient(circle, ${orb.color}0f 0%, transparent 70%)`,
          animation:`orbPulse ${5+i}s ease-in-out ${orb.delay}s infinite`,
          pointerEvents:"none",
          transform:"translate(-50%,-50%)",
        }}/>
      ))}

      {/* Center content */}
      <div style={{
        position:"relative", zIndex:10,
        opacity: entered ? 1 : 0,
        animation: entered ? "spFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) both" : "none",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 32,
        width: 400,
      }}>
        {/* Header */}
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:44, marginBottom:12, animation:"iconBounce 2.4s ease-in-out 0.6s infinite" }}>🎮</div>
          <div style={{ fontFamily:"'Noto Serif SC',serif", fontSize:28, fontWeight:900, color:"#f0c060", letterSpacing:"0.04em",
            background:"linear-gradient(90deg, #f0c060, #ffde9a, #f0c060)",
            backgroundSize:"400px 100%",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"shimmerSlide 3s linear infinite",
          }}>Single Player</div>
          <div style={{ fontSize:11, color:"#ffffff33", letterSpacing:"0.18em", textTransform:"uppercase", marginTop:8 }}>Choose your mode</div>
        </div>

        {/* Mode cards */}
        <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%" }}>
          {modes.map((mode, i) => (
            <button
              key={mode.id}
              className="sp-card"
              onClick={mode.onClick}
              onMouseEnter={e => { setHovered(mode.id); }}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === mode.id
                  ? mode.bg.replace("06", "12").replace("18", "28")
                  : mode.bg,
                border: `1.5px solid ${hovered === mode.id ? mode.color + "99" : mode.border}`,
                borderRadius: 16, padding: "18px 22px",
                color: mode.color, cursor: "pointer",
                textAlign: "left",
                display: "flex", alignItems: "center", gap: 16,
                boxShadow: hovered === mode.id ? `0 8px 32px ${mode.color}22, inset 0 1px 0 ${mode.color}22` : "none",
                position:"relative", overflow:"hidden",
                animation: `spCardIn 0.45s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.1}s both`,
                outline:"none",
              }}
            >
              {/* Shimmer sweep on hover */}
              {hovered === mode.id && (
                <div style={{
                  position:"absolute", inset:0, pointerEvents:"none",
                  background:`linear-gradient(105deg, transparent 30%, ${mode.color}18 50%, transparent 70%)`,
                  backgroundSize:"400px 100%",
                  animation:"shimmerSlide 1.2s linear infinite",
                }}/>
              )}
              <div style={{
                fontSize: mode.icon.length > 1 ? 28 : 34,
                animation: hovered === mode.id ? "iconBounce 0.6s ease" : "none",
                minWidth:40, textAlign:"center",
              }}>{mode.icon}</div>
              <div>
                <div style={{ fontFamily:"'Noto Serif SC',serif", fontSize:17, fontWeight:800, marginBottom:4 }}>{mode.label}</div>
                <div style={{ fontSize:11, color:`${mode.color}88`, lineHeight:1.55 }}>{mode.desc}</div>
              </div>
              {/* Arrow indicator */}
              <div style={{ marginLeft:"auto", fontSize:16, opacity: hovered === mode.id ? 1 : 0.2, transform: hovered === mode.id ? "translateX(3px)" : "translateX(0)", transition:"all 0.2s", color:mode.color }}>›</div>
            </button>
          ))}
        </div>

        <button onClick={() => { AudioEngine.play("backToMenu"); onBack(); }} style={{
          background:"none", border:"none", color:"#ffffff28", cursor:"pointer",
          fontSize:12, letterSpacing:"0.12em", display:"flex", alignItems:"center", gap:6,
          transition:"color 0.2s", outline:"none",
          padding:"6px 12px", borderRadius:8,
        }}
        onMouseEnter={e => e.currentTarget.style.color="#ffffff66"}
        onMouseLeave={e => e.currentTarget.style.color="#ffffff28"}
        >← Back to Menu</button>
      </div>
    </div>
  );
}

// ─── CLASSIC MODE ─────────────────────────────────────────────────────────────
// Rules: Real Mahjong adapted for phonics.
//  • Each player holds 13 tiles.
//  • On your turn: draw 1 from the deck OR claim the top discard, then discard 1.
//  • Win condition: after drawing, arrange ALL 14 tiles into valid words using
//    every tile exactly once (partition into words). Declare "Mahjong!" to win.
//  • Bots play automatically with a short thinking delay.
// ─────────────────────────────────────────────────────────────────────────────

const BOT_NAMES  = ["Bot Bào", "Bot Lóng", "Bot Fèng"];
const BOT_COLORS = ["#E84855", "#2EC4B6", "#F4A261"];
const PLAYER_COLOR = "#f0c060";
const HAND_SIZE = 13;

// Check whether `tiles` (14 tiles) can be partitioned entirely into valid words.
// Returns the partition (array of word-groups) or null.
function findWinningPartition(tiles) {
  const tileSounds = tiles.map(tile =>
    tile.variants
      ? tile.variants.map(v => ({ sound: v, tile }))
      : [{ sound: tile.text.replace(/-/g, ""), tile }]
  );

  // Backtracking: try to assign every tile to a word
  function solve(usedFlags, groups) {
    const firstFree = usedFlags.indexOf(false);
    if (firstFree === -1) return groups; // all tiles used — winning hand!

    // Try every word in the dictionary
    const allWords = [...WORD_LIST, ...SESSION_CUSTOM_WORDS];
    for (const word of allWords) {
      if (word.length < 2) continue;
      // Try to match this word starting from firstFree tile
      const matchResult = tryMatch(word, usedFlags, firstFree);
      if (matchResult) {
        // Mark those tiles used and recurse
        matchResult.idxUsed.forEach(i => { usedFlags[i] = true; });
        const result = solve(usedFlags, [...groups, { word, tiles: matchResult.tilesUsed }]);
        if (result) return result;
        matchResult.idxUsed.forEach(i => { usedFlags[i] = false; });
      }
    }
    return null;
  }

  function tryMatch(word, usedFlags, mustInclude) {
    // Backtracking tile-match for this word, must use tile at mustInclude
    function matchFrom(pos, usedLocal, idxUsed, tilesUsed, usedMustInclude) {
      if (pos === word.length) return usedMustInclude ? { idxUsed, tilesUsed } : null;
      for (let i = 0; i < tileSounds.length; i++) {
        if (usedFlags[i] || usedLocal[i]) continue;
        for (const { sound, tile } of tileSounds[i]) {
          if (word.slice(pos, pos + sound.length) === sound) {
            usedLocal[i] = true;
            const r = matchFrom(pos + sound.length, usedLocal, [...idxUsed, i], [...tilesUsed, tile], usedMustInclude || i === mustInclude);
            if (r) return r;
            usedLocal[i] = false;
          }
        }
      }
      return null;
    }
    return matchFrom(0, {}, [], [], false);
  }

  return solve(new Array(tiles.length).fill(false), []);
}

// Bot AI: pick up discard if it helps form a word, otherwise draw.
// Then discard the tile least useful to completing words.
function botTakeTurn(hand, discardTop) {
  const catBonus = { specials:5, r_vowel:4, double_vowel:3, others:2, main_consonants:1, open_vowel:1, closed_vowel:1 };

  // Score a hand: sum of tiles that appear in at least one valid word
  function handScore(h) {
    let score = 0;
    const tileSounds = h.map(t => t.variants ? t.variants[t.activeVariant] : t.text.replace(/-/g,""));
    for (const word of WORD_LIST) {
      if (word.length < 2) continue;
      let pos = 0; const used = new Array(h.length).fill(false);
      let ok = true;
      while (pos < word.length) {
        let adv = false;
        for (let i = 0; i < h.length; i++) {
          if (used[i]) continue;
          const s = tileSounds[i];
          if (word.slice(pos, pos + s.length) === s) { used[i] = true; pos += s.length; adv = true; break; }
        }
        if (!adv) { ok = false; break; }
      }
      if (ok && pos === word.length) used.forEach((u, i) => { if (u) score += (catBonus[h[i].category] || 1); });
    }
    return score;
  }

  // Decide whether to take discard
  let workingHand = hand;
  let tookDiscard = false;
  if (discardTop) {
    const withDiscard = [...hand, discardTop];
    if (handScore(withDiscard) > handScore(hand) + 2) {
      workingHand = withDiscard;
      tookDiscard = true;
    }
  }

  // Choose which tile to discard: tile whose removal maximally preserves score
  let bestDiscard = null, bestScore = -Infinity;
  for (let i = 0; i < workingHand.length; i++) {
    const without = workingHand.filter((_, j) => j !== i);
    const s = handScore(without);
    if (s > bestScore) { bestScore = s; bestDiscard = workingHand[i]; }
  }
  if (!bestDiscard) bestDiscard = workingHand[workingHand.length - 1];

  const newHand = workingHand.filter(t => t.id !== bestDiscard.id);
  return { newHand, discarded: bestDiscard, tookDiscard };
}

function ClassicMode({ onBackToTitle, settings = DEFAULT_SETTINGS }) {
  const [phase, setPhase]       = useState("lobby");
  const [botCount, setBotCount] = useState(1);
  const [difficulty, setDifficulty] = useState("normal"); // "easy"|"normal"|"hard"|"challenging"

  // ── Difficulty config ─────────────────────────────────────────────────────────
  const DIFF = {
    easy:        { label:"Easy",        color:"#9EF01A", playerTimer:60, botMin:20, botMax:30, botSmart:false, botClaims:false, botWinCheck:false, hints:3, emoji:"🌱" },
    normal:      { label:"Normal",      color:"#f0c060", playerTimer:45, botMin:12, botMax:25, botSmart:true,  botClaims:false, botWinCheck:true,  hints:1, emoji:"⚖️"  },
    hard:        { label:"Hard",        color:"#E84855", playerTimer:30, botMin:5,  botMax:20, botSmart:true,  botClaims:true,  botWinCheck:true,  hints:0, emoji:"🔥" },
    challenging: { label:"Challenging", color:"#C77DFF", playerTimer:20, botMin:3,  botMax:10, botSmart:true,  botClaims:true,  botWinCheck:true,  hints:0, emoji:"💀" },
  };
  const diff = DIFF[difficulty];

  // ── Game state ───────────────────────────────────────────────────────────────
  const [playerHand, setPlayerHand]   = useState([]);
  const [botHands, setBotHands]       = useState([[], [], []]);
  const [discardPile, setDiscardPile] = useState([]);
  const [deckTiles, setDeckTiles]     = useState([]);
  const [deckIdx, setDeckIdx]         = useState(0);
  const [turn, setTurn]               = useState("player");
  const [turnPhase, setTurnPhase]     = useState("draw");
  const [drawnTile, setDrawnTile]     = useState(null);
  const [selectedDiscard, setSelectedDiscard] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [message, setMessage]         = useState({ text: "", type: "" });
  const [winner, setWinner]           = useState(null);
  const [cheerKey, setCheerKey]       = useState(0);
  const [botThinking, setBotThinking] = useState(false);
  const [winPartition, setWinPartition] = useState(null);
  const [canClaimDiscard, setCanClaimDiscard] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [botTimeLeft, setBotTimeLeft] = useState(null);
  const [hintsLeft, setHintsLeft]     = useState(0);   // set on startGame
  const [hintTileId, setHintTileId]   = useState(null); // tile to highlight as hint
  // ── Word-forming state ───────────────────────────────────────────────────────
  const [formedWords, setFormedWords]   = useState([]);     // [{word, tiles, id}]
  const [wbSelected, setWbSelected]     = useState([]);     // tiles picked for builder
  const [handTab, setHandTab]           = useState("hand"); // "hand" | "words"
  const [fusedIds, setFusedIds]         = useState(new Set()); // tile ids in formedWords
  const [invalidWbShake, setInvalidWbShake] = useState(false);
  const [newFusedWordId, setNewFusedWordId] = useState(null); // for animation

  const msgRef    = useRef(null);
  const deckRef   = useRef([]);
  const deckIdxRef = useRef(0);
  const formedWordIdRef = useRef(0);
  const timerRef  = useRef(null);
  const botTimerRef = useRef(null);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const showMsg = (text, type = "info") => {
    if (msgRef.current) clearTimeout(msgRef.current);
    setMessage({ text, type });
    msgRef.current = setTimeout(() => setMessage({ text:"", type:"" }), 3500);
  };

  const drawFromDeck = () => {
    const deck = deckRef.current;
    let idx = deckIdxRef.current;
    if (idx >= deck.length) idx = 0;
    const src = deck[idx++];
    deckIdxRef.current = idx;
    return parseTile(src.text, src.category, freshTileId());
  };

  // ── Music ─────────────────────────────────────────────────────────────────────
  useEffect(() => { AudioEngine.startMusic(); return () => AudioEngine.stopMusic(); }, []);
  useEffect(() => { AudioEngine.setMusicVolume(settings.ambientMusic); }, [settings.ambientMusic]);
  useEffect(() => { AudioEngine.setSfxVolume(settings.soundEffects); }, [settings.soundEffects]);

  // ── Start ─────────────────────────────────────────────────────────────────────
  const startGame = () => {
    AudioEngine.play("gameStart");
    const d = shuffle(buildDeck());
    deckRef.current = d; deckIdxRef.current = 0;
    setDeckTiles(d);

    let idx = 0;
    const deal = () => {
      const src = d[idx % d.length]; idx++;
      return parseTile(src.text, src.category, freshTileId());
    };

    const pHand = Array.from({ length: HAND_SIZE }, deal);
    const bHands = Array.from({ length: 3 }, () => Array.from({ length: HAND_SIZE }, deal));
    deckIdxRef.current = idx;

    setPlayerHand(pHand);
    setBotHands(bHands);
    setDiscardPile([]);
    setTurn("player"); setTurnPhase("draw");
    setDrawnTile(null); setSelectedDiscard(null); setSelectedIds(new Set());
    setWinner(null); setWinPartition(null);
    setBotThinking(false);
    setFormedWords([]); setWbSelected([]); setFusedIds(new Set()); setHandTab("hand");
    setNewFusedWordId(null);
    setHintsLeft(diff.hints); setHintTileId(null);
    setTimeLeft(diff.playerTimer);
    setTimeout(() => AudioEngine.play("dealTiles"), 300);
    setPhase("play");
  };

  // ── Auto-draw at start of player turn ────────────────────────────────────────
  useEffect(() => {
    if (phase !== "play" || turn !== "player" || turnPhase !== "draw") return;
    // Small delay so the UI settles before auto-drawing
    const t = setTimeout(() => {
      const tile = drawFromDeck();
      AudioEngine.play("tileClick");
      setPlayerHand(prev => {
        const newHand = [...prev, tile];
        setDrawnTile(tile);
        setTurnPhase("discard");
        // Check win partition for banner (optional helper)
        const partition = findWinningPartition(newHand);
        if (partition) setWinPartition(partition);
        return newHand;
      });
      showMsg("Tile drawn — fuse words or discard one to end your turn.", "info");
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, turnPhase, phase]);

  // ── canClaimDiscard: available during draw phase ──────────────────────────────
  useEffect(() => {
    setCanClaimDiscard(turn === "player" && turnPhase === "draw" && discardPile.length > 0);
  }, [turn, turnPhase, discardPile]);

  // ── 30-second countdown during player discard phase ──────────────────────────
  useEffect(() => {
    if (phase !== "play" || turn !== "player" || turnPhase !== "discard") {
      setTimeLeft(diff.playerTimer);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(diff.playerTimer);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setPlayerHand(hand => {
            const target = hand.find(t => t.id === drawnTile?.id) || hand[hand.length - 1];
            if (!target) return hand;
            setDiscardPile(p => [...p, target]);
            setSelectedDiscard(null); setSelectedIds(new Set());
            setWbSelected([]);
            setDrawnTile(null); setWinPartition(null);
            showMsg(`⏰ Time's up! "${getTileSound(target)}" was auto-discarded.`, "warn");
            setTimeout(() => advanceTurn("player"), 300);
            return hand.filter(t => t.id !== target.id);
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, turnPhase, phase]);

  // ── Player: claim top discard (replaces auto-drawn tile) ─────────────────────
  // Now only callable BEFORE the auto-draw settles — i.e., during draw phase
  // (the auto-draw happens after 350ms so there's a brief window).
  // Simpler: keep "Claim Discard" as a button that replaces the last drawn tile.
  // Player presses it during discard phase to swap drawn tile for top discard.

  // ── Player: claim top discard (swap it for the auto-drawn tile) ──────────────
  const playerClaimDiscard = () => {
    if (turn !== "player" || turnPhase !== "discard" || discardPile.length === 0) return;
    const top = discardPile[discardPile.length - 1];
    AudioEngine.play("tileClick");
    // Put drawn tile back into discard, take top discard into hand
    setDiscardPile(prev => {
      const withoutTop = prev.slice(0, -1);
      return drawnTile ? [...withoutTop, drawnTile] : withoutTop;
    });
    setPlayerHand(prev => {
      const withoutDrawn = drawnTile ? prev.filter(t => t.id !== drawnTile.id) : prev;
      return [...withoutDrawn, top];
    });
    setDrawnTile(top);
    showMsg(`Swapped drawn tile for "${getTileSound(top)}" from discard.`, "info");
  };

  // ── Player: select tile to discard ───────────────────────────────────────────
  const toggleSelectTile = (tile) => {
    if (turn !== "player" || turnPhase !== "discard") return;
    AudioEngine.play("tileClick");
    // Only one tile can be selected at a time — clicking again deselects
    setSelectedDiscard(prev => prev?.id === tile.id ? null : tile);
    setSelectedIds(prev => {
      const id = tile.id;
      const alreadySelected = prev.has(id);
      return alreadySelected ? new Set() : new Set([id]);
    });
  };

  // ── Player: confirm discard ───────────────────────────────────────────────────
  const playerDiscard = () => {
    if (!selectedDiscard || turn !== "player" || turnPhase !== "discard") return;
    AudioEngine.play("tileCycle");
    setDiscardPile(prev => [...prev, selectedDiscard]);
    setPlayerHand(prev => prev.filter(t => t.id !== selectedDiscard.id));
    setSelectedDiscard(null); setSelectedIds(new Set());
    setWbSelected([]);
    setDrawnTile(null); setWinPartition(null);
    showMsg(`You discarded "${getTileSound(selectedDiscard)}".`, "info");
    advanceTurn("player");
  };

  // ── Player: declare Mahjong ───────────────────────────────────────────────────
  const declareMahjong = () => {
    // Win: all tiles in formedWords (hand empty, 14 tiles fused into valid words)
    const totalFused = formedWords.reduce((s, g) => s + g.tiles.length, 0);
    if (playerHand.length > 0 || totalFused < 14 || formedWords.length === 0) {
      showMsg("You need all 14 tiles fused into words to declare Mahjong!", "warn");
      return;
    }
    AudioEngine.play("sessionEnd");
    if (settings.cheerEffect) setCheerKey(k => k + 1);
    setWinner({ owner: "player", words: formedWords });
    setPhase("done");
  };

  // ── Word builder: toggle tile into/out of builder ────────────────────────────
  const wbToggleTile = (tile) => {
    // Allow word building during bot turn too; only block if player is in discard-selection mode
    if (turn === "player" && turnPhase === "discard") return;
    AudioEngine.play("tileClick");
    setWbSelected(prev => {
      const idx = prev.findIndex(t => t.id === tile.id);
      return idx !== -1 ? prev.filter((_, i) => i !== idx) : [...prev, tile];
    });
  };

  // ── Word builder: commit the selected tiles as a word ────────────────────────
  const wbCommitWord = () => {
    if (wbSelected.length === 0) return;
    const word = buildWordFromTiles(wbSelected);
    if (word.length < 2) {
      showMsg("Too short!", "warn"); return;
    }
    if (!checkWordInSet(word)) {
      AudioEngine.play("wordWrong");
      setInvalidWbShake(true);
      setTimeout(() => setInvalidWbShake(false), 550);
      showMsg(`"${word}" isn't a recognised word.`, "error");
      return;
    }
    AudioEngine.play("wordCorrect");
    const wordId = ++formedWordIdRef.current;
    const group = { word, tiles: [...wbSelected], id: wordId };
    setFormedWords(prev => [...prev, group]);
    setFusedIds(prev => { const n = new Set(prev); wbSelected.forEach(t => n.add(t.id)); return n; });
    setPlayerHand(prev => prev.filter(t => !wbSelected.find(s => s.id === t.id)));
    setWbSelected([]);
    setNewFusedWordId(wordId);
    setHandTab("words");
    setTimeout(() => setNewFusedWordId(null), 1200);
    showMsg(`"${word}" fused! ${playerHand.length - wbSelected.length} tiles left.`, "success");
  };

  // ── Word builder: break apart a fused word (return tiles to hand) ────────────
  const wbBreakWord = (wordId) => {
    const group = formedWords.find(g => g.id === wordId);
    if (!group) return;
    AudioEngine.play("tileCycle");
    setFormedWords(prev => prev.filter(g => g.id !== wordId));
    setFusedIds(prev => { const n = new Set(prev); group.tiles.forEach(t => n.delete(t.id)); return n; });
    setPlayerHand(prev => [...prev, ...group.tiles]);
    showMsg(`"${group.word}" broken apart — tiles returned to hand.`, "info");
  };

  // ── Hint: highlight a tile that appears in a valid word ──────────────────────
  const useHint = () => {
    if (hintsLeft <= 0 || playerHand.length === 0) return;
    AudioEngine.play("tileClick");
    // Find a tile in hand that appears in any valid word alongside another hand tile
    const handSounds = playerHand.map(t => getTileSound(t));
    let bestTile = null;
    outer: for (const word of WORD_LIST) {
      if (word.length < 2) continue;
      let pos = 0; const used = new Array(playerHand.length).fill(false);
      let ok = true;
      while (pos < word.length) {
        let adv = false;
        for (let i = 0; i < playerHand.length; i++) {
          if (used[i]) continue;
          const s = handSounds[i];
          if (word.slice(pos, pos + s.length) === s) { used[i] = true; pos += s.length; adv = true; break; }
        }
        if (!adv) { ok = false; break; }
      }
      if (ok && pos === word.length) {
        // Pick the first used tile not already fused
        for (let i = 0; i < playerHand.length; i++) {
          if (used[i]) { bestTile = playerHand[i]; break outer; }
        }
      }
    }
    if (!bestTile) { showMsg("No hint available — try different tiles!", "warn"); return; }
    setHintsLeft(h => h - 1);
    setHintTileId(bestTile.id);
    showMsg(`💡 Hint: try using "${getTileSound(bestTile)}" in a word!`, "info");
    setTimeout(() => setHintTileId(null), 3000);
  };
  const advanceTurn = (current) => {
    const order = ["player", ...Array.from({ length: botCount }, (_, i) => `bot${i}`)];
    const next = order[(order.indexOf(current) + 1) % order.length];
    setTurn(next); setTurnPhase("draw");
  };

  // ── Bot turn ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "play" || !turn.startsWith("bot")) {
      setBotTimeLeft(null);
      if (botTimerRef.current) clearInterval(botTimerRef.current);
      return;
    }
    const botIdx = parseInt(turn.replace("bot", ""));
    if (botIdx >= botCount) { advanceTurn(turn); return; }

    // Always display 30s on the clock; secretly fire at a random time within difficulty range
    const displayTime = 30;
    const fireAt = diff.botMin + Math.floor(Math.random() * (diff.botMax - diff.botMin + 1));
    setBotTimeLeft(displayTime);
    setBotThinking(true);

    let remaining = displayTime;
    botTimerRef.current = setInterval(() => {
      remaining -= 1;
      setBotTimeLeft(remaining);
      if (remaining <= fireAt) {
        clearInterval(botTimerRef.current);
        setBotTimeLeft(null);

        // Execute the bot's actual move
        setBotHands(prev => {
          const hand = prev[botIdx];
          const discardTop = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

          let workingHand = hand;
          let tookDiscard = false;

          if (discardTop && diff.botClaims) {
            // Challenging/Hard: check if discard gives a win
            const withDiscard = [...hand, discardTop];
            const partition = diff.botWinCheck ? findWinningPartition(withDiscard) : null;
            if (partition) {
              setDiscardPile(p => p.slice(0, -1));
              setBotThinking(false);
              setWinner({ owner: `bot${botIdx}`, words: partition });
              AudioEngine.play("sessionEnd");
              setPhase("done");
              return prev;
            }
            // Smart bots also evaluate whether to claim discard
            const result = botTakeTurn(hand, discardTop);
            if (result.tookDiscard) {
              workingHand = [...hand, discardTop];
              tookDiscard = true;
              setDiscardPile(p => p.slice(0, -1));
              showMsg(`${BOT_NAMES[botIdx]} claimed the discard.`, "info");
            }
          }

          if (!tookDiscard) {
            const drawn = drawFromDeck();
            workingHand = [...hand, drawn];
          }

          // Win check on 14-tile hand
          if (diff.botWinCheck) {
            const partition = findWinningPartition(workingHand);
            if (partition) {
              setBotThinking(false);
              setWinner({ owner: `bot${botIdx}`, words: partition });
              AudioEngine.play("sessionEnd");
              setPhase("done");
              return prev;
            }
          }

          // Discard strategy based on difficulty
          let finalHand, discarded;
          if (!diff.botSmart) {
            // Easy: discard a random tile
            const randIdx = Math.floor(Math.random() * workingHand.length);
            discarded = workingHand[randIdx];
            finalHand = workingHand.filter((_, i) => i !== randIdx);
          } else {
            // Normal/Hard/Challenging: smart discard
            const result = botTakeTurn(workingHand, null);
            finalHand = result.newHand;
            discarded = result.discarded;
          }

          setDiscardPile(p => [...p, discarded]);
          AudioEngine.play("tileCycle");
          showMsg(`${BOT_NAMES[botIdx]} discarded "${getTileSound(discarded)}".`, "info");

          const newBotHands = [...prev];
          newBotHands[botIdx] = finalHand;
          setBotThinking(false);
          setTimeout(() => advanceTurn(turn), 400);
          return newBotHands;
        });
      }
    }, 1000);

    return () => { if (botTimerRef.current) clearInterval(botTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, phase]);

  // ── Cycle variant ─────────────────────────────────────────────────────────────
  const cycleVariant = (tile) => {
    AudioEngine.play("tileCycle");
    const cycle = t => (!t.variants || t.id !== tile.id) ? t
      : { ...t, activeVariant: (t.activeVariant + 1) % t.variants.length };
    setPlayerHand(prev => prev.map(cycle));
  };

  // ────────────────────────────────────────────────────────────────────────────
  // LOBBY
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
  const _th = TILE_THEMES[settings.tileTheme] || TILE_THEMES.neon;
  return (
    <div style={{ minHeight:"100vh", background:_th.pageBg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif", color:_th.pageText }}>
      <div style={{ width:400, display:"flex", flexDirection:"column", alignItems:"center", gap:28 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:52, marginBottom:10 }}>🀄</div>
          <div style={{ fontFamily:"'Noto Serif SC',serif", fontSize:28, fontWeight:900, color:"#C77DFF" }}>Classic Mahjong</div>
          <div style={{ fontSize:11, color:"#ffffff44", letterSpacing:"0.14em", textTransform:"uppercase", marginTop:6 }}>Draw · Discard · Declare</div>
        </div>

        <div style={{ width:"100%", background:"#ffffff06", border:"1px solid #ffffff10", borderRadius:16, padding:"22px 24px" }}>
          <div style={{ fontSize:11, color:"#ffffff44", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:14 }}>How to win</div>
          <div style={{ fontSize:12, color:"#ffffff66", lineHeight:1.8 }}>
            🎯 Hold <b style={{color:"#fff"}}>13 tiles</b>. On your turn, draw 1 then discard 1.<br/>
            ✋ You may <b style={{color:"#C77DFF"}}>claim the top discard</b> instead of drawing.<br/>
            🀄 When your 14-tile hand can form <b style={{color:"#f0c060"}}>valid words using every tile</b>, declare <b style={{color:"#9EF01A"}}>Mahjong!</b>
          </div>
        </div>

        <div style={{ width:"100%", background:"#ffffff06", border:"1px solid #ffffff10", borderRadius:16, padding:"22px 24px" }}>
          <div style={{ fontSize:11, color:"#ffffff44", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:14 }}>Difficulty</div>
          <div style={{ display:"flex", gap:8 }}>
            {Object.entries(DIFF).map(([key, d]) => (
              <button key={key} onClick={() => setDifficulty(key)} style={{
                flex:1, padding:"12px 6px", borderRadius:12,
                background: difficulty===key ? `${d.color}22` : "#ffffff08",
                border: difficulty===key ? `2px solid ${d.color}88` : "1px solid #ffffff18",
                color: difficulty===key ? d.color : "#ffffff44",
                fontSize:9, fontWeight:800, cursor:"pointer", transition:"all 0.15s",
                textTransform:"uppercase", letterSpacing:"0.08em",
              }}>
                <div style={{ fontSize:18, marginBottom:4 }}>{d.emoji}</div>
                {d.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop:12, fontSize:11, color:"#ffffff33", lineHeight:1.7 }}>
            {difficulty==="easy"        && "⏱ 60s timer · Bots discard randomly · 3 hints"}
            {difficulty==="normal"      && "⏱ 45s timer · Bots play smart · 1 hint"}
            {difficulty==="hard"        && "⏱ 30s timer · Bots play smart & claim discards · No hints"}
            {difficulty==="challenging" && "⏱ 20s timer · Bots are aggressive & fast · No hints"}
          </div>
        </div>

        <div style={{ width:"100%", background:"#ffffff06", border:"1px solid #ffffff10", borderRadius:16, padding:"22px 24px" }}>
          <div style={{ fontSize:11, color:"#ffffff44", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:14 }}>Opponents</div>
          <div style={{ display:"flex", gap:10 }}>
            {[1,2,3].map(n => (
              <button key={n} onClick={() => setBotCount(n)} style={{
                flex:1, padding:"16px 0", borderRadius:12,
                background: botCount===n ? "linear-gradient(135deg,#C77DFF33,#C77DFF18)" : "#ffffff08",
                border: botCount===n ? "2px solid #C77DFF88" : "1px solid #ffffff18",
                color: botCount===n ? "#e4acff" : "#ffffff55",
                fontSize:20, fontWeight:800, cursor:"pointer", transition:"all 0.15s",
              }}>
                {n}
                <div style={{ fontSize:9, textTransform:"uppercase", letterSpacing:"0.1em", marginTop:3, opacity:0.6 }}>{n===1?"bot":"bots"}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:6 }}>
            {Array.from({length:botCount},(_,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:BOT_COLORS[i] }}/>
                <span style={{ fontSize:12, color:"#ffffff55" }}>{BOT_NAMES[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={startGame} style={{ width:"100%", padding:"16px", borderRadius:14, background:"linear-gradient(135deg,#C77DFF,#9b4dca)", border:"none", color:"#fff", fontSize:16, fontWeight:800, cursor:"pointer", letterSpacing:"0.08em", boxShadow:"0 4px 24px #C77DFF44" }}>
          ▶ Start Game
        </button>
        <button onClick={() => { AudioEngine.play("backToMenu"); onBackToTitle(); }} style={{ background:"none", border:"none", color:"#ffffff33", cursor:"pointer", fontSize:13, letterSpacing:"0.1em" }}>← Back</button>
      </div>
    </div>
  );
  } // end lobby

  // ────────────────────────────────────────────────────────────────────────────
  // DONE
  // ────────────────────────────────────────────────────────────────────────────
  if (phase === "done" && winner) {
    const _th = TILE_THEMES[settings.tileTheme] || TILE_THEMES.neon;
    const isPlayerWin = winner.owner === "player";
    const winnerName  = isPlayerWin ? "You" : BOT_NAMES[parseInt(winner.owner.replace("bot",""))];
    const winnerColor = isPlayerWin ? PLAYER_COLOR : BOT_COLORS[parseInt(winner.owner.replace("bot",""))];
    return (
      <div style={{ minHeight:"100vh", background:_th.pageBg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif", color:_th.pageText }}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div style={{ background:_th.cardBg, border:`1px solid ${winnerColor}33`, borderRadius:24, padding:"36px 40px", maxWidth:520, width:"90%", textAlign:"center", boxShadow:"0 40px 100px #000000dd", animation:"slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ fontSize:52, marginBottom:8 }}>{isPlayerWin ? "🏆" : "🤖"}</div>
          <div style={{ fontFamily:"'Noto Serif SC',serif", fontSize:28, fontWeight:900, color:winnerColor, marginBottom:4 }}>
            {isPlayerWin ? "Mahjong! You Win!" : `${winnerName} wins!`}
          </div>
          <div style={{ fontSize:11, color:"#ffffff33", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:28 }}>Winning hand</div>

          {/* Show winning word groups as tile rows */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:28, textAlign:"left" }}>
            {winner.words.map((group, gi) => (
              <div key={gi} style={{ display:"flex", alignItems:"center", gap:8, background:"#ffffff06", border:"1px solid #ffffff0f", borderRadius:12, padding:"10px 14px" }}>
                <div style={{ display:"flex", gap:4 }}>
                  {group.tiles.map((tile, ti) => {
                    const cat = TILE_CATEGORIES[tile.category];
                    const sound = getTileSound(tile);
                    return (
                      <div key={ti} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(145deg,#1e1e2e,#16161f)", border:`1.5px solid ${cat.color}66`, borderRadius:5, minWidth:sound.length>2?26:20, height:28, padding:"0 3px" }}>
                        <span style={{ fontFamily:"'Noto Serif SC',serif", fontSize:sound.length>3?8:sound.length>2?10:13, fontWeight:700, color:cat.color }}>{sound}</span>
                      </div>
                    );
                  })}
                </div>
                <span style={{ fontFamily:"'Noto Serif SC',serif", fontSize:15, fontWeight:800, color:winnerColor }}>{group.word}</span>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <button onClick={() => setPhase("lobby")} style={{ padding:"12px 28px", borderRadius:12, background:"linear-gradient(135deg,#C77DFF,#9b4dca)", border:"none", color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer", letterSpacing:"0.08em" }}>🔄 Play Again</button>
            <button onClick={() => { AudioEngine.play("backToMenu"); onBackToTitle(); }} style={{ padding:"12px 20px", borderRadius:12, background:"#ffffff08", border:"1px solid #ffffff18", color:"#ffffff66", fontSize:14, fontWeight:700, cursor:"pointer" }}>🚪 Home</button>
          </div>
        </div>
        {cheerKey > 0 && isPlayerWin && <CheerBurst key={cheerKey} />}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PLAY
  // ────────────────────────────────────────────────────────────────────────────
  const isPlayerTurn = turn === "player";
  const topDiscard   = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  const turnLabel    = isPlayerTurn
    ? (turnPhase === "draw" ? "Drawing tile…" : "Fuse words or discard to end turn")
    : `${BOT_NAMES[parseInt(turn.replace("bot",""))] ?? "Bot"} is thinking…`;
  const turnColor = isPlayerTurn ? PLAYER_COLOR : (BOT_COLORS[parseInt(turn.replace("bot",""))] || "#ffffff");

  // Total fused tile count — when 14, player can declare
  const fusedCount  = formedWords.reduce((s, g) => s + g.tiles.length, 0);
  const canDeclare  = playerHand.length === 0 && fusedCount === 14 && formedWords.length > 0;
  const wbPreview   = wbSelected.map(t => getTileSound(t)).join("").toLowerCase();

  const _th = TILE_THEMES[settings.tileTheme] || TILE_THEMES.neon;

  return (
    <div style={{ minHeight:"100vh", background:_th.pageBg, backgroundImage: _th.pageBgImage ? "radial-gradient(ellipse at 50% 0%, #1a3a1a44 0%, transparent 60%)" : _th.label==="Mahjong" ? "radial-gradient(ellipse at 50% 0%, #0a2a0a66 0%, transparent 60%)" : "none", fontFamily:"'Segoe UI',system-ui,sans-serif", color:_th.pageText, display:"flex", flexDirection:"column" }}>
      <style>{`
        @keyframes tileDeal{from{opacity:0;transform:translateY(-12px) scale(0.9)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes discardDrop{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes thinkPulse{0%,100%{opacity:0.4}50%{opacity:1}}
        @keyframes shake{0%,100%{transform:translateX(0)}15%{transform:translateX(-6px)}30%{transform:translateX(6px)}45%{transform:translateX(-4px)}60%{transform:translateX(4px)}75%{transform:translateX(-2px)}90%{transform:translateX(2px)}}
        @keyframes mahjongGlow{0%,100%{box-shadow:0 0 0 2px #9EF01A88,0 0 12px 3px #9EF01A33}50%{box-shadow:0 0 0 3px #9EF01Acc,0 0 28px 8px #9EF01A55}}
        @keyframes fuseIn{0%{opacity:0;transform:scale(0.8) translateY(-10px)}60%{transform:scale(1.04) translateY(1px)}100%{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes fusedPulse{0%,100%{box-shadow:0 0 0 1.5px #9EF01A66,0 0 8px 2px #9EF01A22}50%{box-shadow:0 0 0 2px #9EF01Acc,0 0 16px 5px #9EF01A55}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes timerPulse{0%,100%{opacity:1}50%{opacity:0.5}}
        button:focus { outline: none; box-shadow: none; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ borderBottom:`1px solid ${_th.headerBorder}`, background:_th.headerBg, backdropFilter:"blur(12px)", padding:"11px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={() => { AudioEngine.play("backToMenu"); onBackToTitle(); }} style={{ background:"#ffffff08", border:"1px solid #ffffff18", color:"#ffffff88", borderRadius:10, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:700, letterSpacing:"0.06em" }}>🚪 Home</button>
          <span style={{ fontSize:20 }}>🀄</span>
          <span style={{ fontFamily:"'Noto Serif SC',serif", fontSize:17, fontWeight:800, color:"#C77DFF" }}>Classic Mahjong</span>
          <span style={{ fontSize:10, fontWeight:700, color:diff.color, background:`${diff.color}18`, border:`1px solid ${diff.color}44`, borderRadius:8, padding:"3px 8px", letterSpacing:"0.1em", textTransform:"uppercase" }}>{diff.emoji} {diff.label}</span>
        </div>
        <div style={{ padding:"7px 18px", borderRadius:20, background:`${turnColor}18`, border:`1px solid ${turnColor}44`, color:turnColor, fontSize:12, fontWeight:700, animation:botThinking?"thinkPulse 1s ease-in-out infinite":"none", transition:"all 0.3s", maxWidth:280, textAlign:"center" }}>
          {turnLabel}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {Array.from({length:botCount},(_,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:8, background:turn===`bot${i}`?`${BOT_COLORS[i]}18`:"#ffffff08", border:turn===`bot${i}`?`1px solid ${BOT_COLORS[i]}44`:"1px solid #ffffff10", transition:"all 0.3s" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:BOT_COLORS[i] }}/>
              <span style={{ fontSize:11, color:BOT_COLORS[i], fontWeight:700 }}>{BOT_NAMES[i].split(" ")[1]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Message ── */}
      {message.text && (
        <div style={{ margin:"8px 20px 0", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:500, background:{success:"#9EF01A22",error:"#E8485522",warn:"#F4A26122",info:"#C77DFF18"}[message.type]||"#ffffff11", border:`1px solid ${{success:"#9EF01A55",error:"#E8485555",warn:"#F4A26155",info:"#C77DFF44"}[message.type]||"#ffffff22"}`, color:{success:"#c8ff5a",error:"#ff6b78",warn:"#ffbe85",info:"#e4acff"}[message.type]||"#e0e0f0" }}>{message.text}</div>
      )}

      {/* ── Main layout ── */}
      <div style={{ flex:1, display:"flex", gap:14, padding:"14px 20px 14px" }}>

        {/* ── Center: discard pile ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:_th.cardBg, border:`2px solid ${_th.cardBorder}`, borderRadius:18, padding:"16px 20px", minHeight:120, boxShadow:"inset 0 2px 16px #00000055" }}>
            <div style={{ fontSize:9, color:_th.pageText+"44", textTransform:"uppercase", letterSpacing:"0.18em", marginBottom:10 }}>Discard Pile</div>
            {discardPile.length === 0 ? (
              <div style={{ color:_th.pageText+"22", fontSize:12, fontStyle:"italic" }}>No discards yet…</div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"flex-start" }}>
                {[...discardPile].reverse().map((tile, i) => {
                  const cat = TILE_CATEGORIES[tile.category];
                  const sound = getTileSound(tile);
                  const isTop = i === 0;
                  return (
                    <div key={tile.id} style={{
                      display:"inline-flex", alignItems:"center", justifyContent:"center",
                      background: _th.tileBg(cat, false),
                      border: isTop ? `2px solid ${cat.color}88` : `1px solid ${cat.color}33`,
                      borderRadius:6, minWidth:sound.length>3?30:sound.length>2?26:22, height:32, padding:"0 4px",
                      opacity: isTop ? 1 : 0.4,
                      boxShadow: isTop ? `0 0 12px ${cat.color}33` : "none",
                      animation: isTop ? "discardDrop 0.3s ease" : "none",
                    }}>
                      <span style={{ fontFamily:"'Noto Serif SC',serif", fontSize:sound.length>3?9:sound.length>2?11:14, fontWeight:700, color:_th.tileText(cat, false) }}>{sound}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Declare Mahjong banner */}
          {canDeclare && (
            <div style={{ background:"linear-gradient(135deg,#9EF01A22,#9EF01A0a)", border:"2px solid #9EF01A66", borderRadius:14, padding:"14px 18px", animation:"mahjongGlow 1.5s ease-in-out infinite, fadeIn 0.3s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:"#c8ff5a", marginBottom:3 }}>🀄 All tiles fused into words!</div>
                  <div style={{ fontSize:11, color:"#9EF01A77" }}>You can declare Mahjong</div>
                </div>
                <button onClick={declareMahjong} style={{ padding:"10px 22px", borderRadius:12, background:"linear-gradient(135deg,#9EF01A,#6abf12)", border:"none", color:"#0d1400", fontSize:14, fontWeight:900, cursor:"pointer", letterSpacing:"0.06em", boxShadow:"0 4px 16px #9EF01A44", outline:"none" }}>
                  Declare Mahjong!
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: action panel ── */}
        <div style={{ width:196, flexShrink:0, display:"flex", flexDirection:"column", gap:10 }}>

          {/* Timer — player countdown or bot countdown */}
          {isPlayerTurn && turnPhase === "discard" && (
            <div style={{ background: timeLeft <= 10 ? "#E8485522" : "#ffffff06", border: `1px solid ${timeLeft <= 10 ? "#E8485566" : "#ffffff10"}`, borderRadius:14, padding:"12px 14px", textAlign:"center", transition:"all 0.3s" }}>
              <div style={{ fontSize:9, color: timeLeft <= 10 ? "#ff6b78" : "#ffffff33", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>Time to discard</div>
              <div style={{ fontFamily:"monospace", fontSize:28, fontWeight:900, color: timeLeft <= 10 ? "#ff6b78" : "#f0c060", lineHeight:1, marginBottom:6 }}>{timeLeft}</div>
              <div style={{ background:"#ffffff10", borderRadius:4, height:4, overflow:"hidden" }}>
                <div style={{ height:"100%", background: timeLeft <= 10 ? "#E84855" : "#f0c060", width:`${(timeLeft/diff.playerTimer)*100}%`, transition:"width 1s linear", borderRadius:4 }}/>
              </div>
            </div>
          )}
          {!isPlayerTurn && botTimeLeft !== null && (
            <div style={{ background: botTimeLeft <= 5 ? `${turnColor}22` : "#ffffff06", border: `1px solid ${botTimeLeft <= 5 ? turnColor + "66" : "#ffffff10"}`, borderRadius:14, padding:"12px 14px", textAlign:"center", transition:"all 0.3s" }}>
              <div style={{ fontSize:9, color:`${turnColor}88`, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>
                {BOT_NAMES[parseInt(turn.replace("bot",""))]?.split(" ")[1]} thinking
              </div>
              <div style={{ fontFamily:"monospace", fontSize:28, fontWeight:900, color: botTimeLeft <= 5 ? turnColor : "#ffffff55", lineHeight:1, marginBottom:6 }}>{botTimeLeft}</div>
              <div style={{ background:"#ffffff10", borderRadius:4, height:4, overflow:"hidden" }}>
                <div style={{ height:"100%", background: turnColor, width:`${(botTimeLeft/30)*100}%`, transition:"width 1s linear", borderRadius:4 }}/>
              </div>
            </div>
          )}

          {/* Claim Discard */}
          <div style={{ background:_th.cardBg, border:`1px solid ${_th.cardBorder}`, borderRadius:14, padding:"14px" }}>
            <div style={{ fontSize:9, color:_th.pageText+"44", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>Discard Pile</div>
            <button onClick={playerClaimDiscard} disabled={!isPlayerTurn||turnPhase!=="discard"||discardPile.length===0} style={{ width:"100%", padding:"10px", borderRadius:10, background:isPlayerTurn&&turnPhase==="discard"&&discardPile.length>0?"linear-gradient(135deg,#C77DFF33,#C77DFF18)":"#ffffff08", border:isPlayerTurn&&turnPhase==="discard"&&discardPile.length>0?"1px solid #C77DFF66":"1px solid #ffffff10", color:isPlayerTurn&&turnPhase==="discard"&&discardPile.length>0?"#e4acff":"#ffffff22", fontSize:12, fontWeight:700, cursor:isPlayerTurn&&turnPhase==="discard"&&discardPile.length>0?"pointer":"default", letterSpacing:"0.06em", outline:"none", boxShadow:"none" }}>
              ✋ Swap for Discard
              {topDiscard && <div style={{ fontSize:9, opacity:0.7, marginTop:2 }}>"{getTileSound(topDiscard)}"</div>}
            </button>
          </div>

          {/* Discard selected */}
          <div style={{ background:_th.cardBg, border:`1px solid ${_th.cardBorder}`, borderRadius:14, padding:"14px" }}>
            <div style={{ fontSize:9, color:_th.pageText+"44", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:10 }}>
              {turnPhase==="discard" ? "Tap tile → discard" : "Waiting…"}
            </div>
            {selectedDiscard && (
              <div style={{ marginBottom:8, display:"flex", justifyContent:"center" }}>
                <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(145deg,${TILE_CATEGORIES[selectedDiscard.category].bg},#16161f)`, border:`2px solid ${TILE_CATEGORIES[selectedDiscard.category].color}88`, borderRadius:6, minWidth:28, height:34, padding:"0 5px" }}>
                  <span style={{ fontFamily:"'Noto Serif SC',serif", fontSize:14, fontWeight:700, color:TILE_CATEGORIES[selectedDiscard.category].color }}>{getTileSound(selectedDiscard)}</span>
                </div>
              </div>
            )}
            <button onClick={playerDiscard} disabled={!selectedDiscard||turnPhase!=="discard"} style={{ width:"100%", padding:"10px", borderRadius:10, background:selectedDiscard&&turnPhase==="discard"?"linear-gradient(135deg,#E8485533,#E8485518)":"#ffffff08", border:selectedDiscard&&turnPhase==="discard"?"1px solid #E8485566":"1px solid #ffffff10", color:selectedDiscard&&turnPhase==="discard"?"#ff6b78":"#ffffff22", fontSize:12, fontWeight:700, cursor:selectedDiscard&&turnPhase==="discard"?"pointer":"default", letterSpacing:"0.06em", outline:"none", boxShadow:"none" }}>🗑 Discard</button>
          </div>

          {/* Tile counter */}
          <div style={{ background:_th.cardBg, border:`1px solid ${_th.cardBorder}`, borderRadius:14, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:_th.pageText+"33", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:6 }}>Progress</div>
            <div style={{ display:"flex", justifyContent:"center", gap:3, flexWrap:"wrap", marginBottom:6 }}>
              {Array.from({length:14}, (_,i) => (
                <div key={i} style={{ width:10, height:10, borderRadius:2, background: i < fusedCount ? "#9EF01A" : "#ffffff15", transition:"background 0.3s" }}/>
              ))}
            </div>
            <div style={{ fontSize:11, color:"#ffffff44" }}>{fusedCount}/14 tiles fused</div>
          </div>

          {/* Hint button (only if difficulty grants hints) */}
          {diff.hints > 0 && (
            <div style={{ background:_th.cardBg, border:`1px solid ${_th.cardBorder}`, borderRadius:14, padding:"12px 14px", textAlign:"center" }}>
              <div style={{ fontSize:9, color:_th.pageText+"33", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:8 }}>Hints</div>
              <button onClick={useHint} disabled={hintsLeft <= 0 || !isPlayerTurn} style={{ width:"100%", padding:"9px", borderRadius:10, background: hintsLeft > 0 && isPlayerTurn ? "linear-gradient(135deg,#f0c06033,#f0c06018)" : "#ffffff08", border: hintsLeft > 0 && isPlayerTurn ? "1px solid #f0c06066" : "1px solid #ffffff10", color: hintsLeft > 0 && isPlayerTurn ? "#f0c060" : "#ffffff22", fontSize:12, fontWeight:700, cursor: hintsLeft > 0 && isPlayerTurn ? "pointer" : "default", outline:"none" }}>
                💡 Hint ({hintsLeft})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Hand area (tabbed) ── */}
      <div style={{ background:_th.cardBg, borderTop:`1px solid ${_th.cardBorder}`, padding:"0 20px 18px" }}>
        {/* Tabs */}
        <div style={{ display:"flex", gap:0, marginBottom:12, borderBottom:"1px solid #ffffff0f", paddingTop:2 }}>
          {[
            { id:"hand", label:`Your Hand (${playerHand.length})` },
            { id:"words", label:`Fused Words (${formedWords.length})` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setHandTab(tab.id)} style={{ padding:"10px 18px", background:"none", border:"none", borderBottom: handTab===tab.id ? "2px solid #C77DFF" : "2px solid transparent", color: handTab===tab.id ? "#e4acff" : "#ffffff33", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:"0.06em", transition:"all 0.15s", outline:"none" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hand tab */}
        {handTab === "hand" && (
          <div>
            {/* Word builder strip */}
            {wbSelected.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, padding:"10px 14px", background:"#C77DFF0a", border:"1px solid #C77DFF33", borderRadius:12, animation:"fadeIn 0.2s ease" }}>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", flex:1 }}>
                  {wbSelected.map(t => {
                    const cat = TILE_CATEGORIES[t.category];
                    const sound = getTileSound(t);
                    return (
                      <div key={t.id} onClick={() => wbToggleTile(t)} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(145deg,${cat.bg},#16161f)`, border:`2px solid ${cat.color}`, borderRadius:6, minWidth:sound.length>3?28:sound.length>2?24:20, height:28, padding:"0 4px", cursor:"pointer", boxShadow:`0 0 8px ${cat.color}44` }}>
                        <span style={{ fontFamily:"'Noto Serif SC',serif", fontSize:sound.length>3?8:sound.length>2?10:13, fontWeight:700, color:cat.color }}>{sound}</span>
                      </div>
                    );
                  })}
                </div>
                <span style={{ fontFamily:"'Noto Serif SC',serif", fontSize:20, fontWeight:800, color:"#e4acff", minWidth:60 }}>{wbPreview}</span>
                <button onClick={wbCommitWord} style={{ padding:"8px 16px", borderRadius:10, background:"linear-gradient(135deg,#9EF01A33,#9EF01A18)", border:"1px solid #9EF01A66", color:"#c8ff5a", fontSize:12, fontWeight:700, cursor:"pointer", letterSpacing:"0.06em", outline:"none", animation:invalidWbShake?"shake 0.5s ease":"none" }}>✓ Fuse Word</button>
                <button onClick={() => setWbSelected([])} style={{ padding:"8px 12px", borderRadius:10, background:"#ffffff08", border:"1px solid #ffffff18", color:"#ffffff44", fontSize:12, fontWeight:700, cursor:"pointer", outline:"none" }}>✕</button>
              </div>
            )}

            <div style={{ fontSize:9, color:"#ffffff22", textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:10 }}>
              {isPlayerTurn && turnPhase==="discard"
                ? <span style={{ color:"#F4A261" }}>Tap a tile to select for discard, or fuse words first</span>
                : !isPlayerTurn
                ? <span style={{ color:"#9EF01A88" }}>Bot is thinking — tap tiles to build words now!</span>
                : <span>Waiting…</span>}
            </div>

            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {playerHand.length === 0 ? (
                <div style={{ color:"#ffffff22", fontSize:12, fontStyle:"italic" }}>No tiles in hand — all fused!</div>
              ) : playerHand.map(tile => {
                const isWbSel = wbSelected.some(t => t.id === tile.id);
                const isDiscardSel = selectedIds.has(tile.id);
                const isBotTurn = !isPlayerTurn;
                return (
                  <div key={tile.id} style={{ position:"relative" }}>
                    <Tile
                      tile={tile}
                      selected={isPlayerTurn && turnPhase==="discard" ? isDiscardSel : isWbSel}
                      highlighted={tile.id === hintTileId}
                      onClick={isPlayerTurn && turnPhase==="discard" ? toggleSelectTile : wbToggleTile}
                      onCycleVariant={cycleVariant}
                      theme={settings.tileTheme}
                      animated={settings.tileAnimations}
                      showLabel={settings.soundLabels}
                      disabled={isPlayerTurn && turnPhase==="draw"}
                    />
                    {tile.id === drawnTile?.id && (
                      <div style={{ position:"absolute", top:-6, right:-4, background:"#9EF01A", color:"#0d1400", fontSize:7, fontWeight:900, borderRadius:4, padding:"1px 4px", letterSpacing:"0.06em", pointerEvents:"none" }}>NEW</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fused Words tab */}
        {handTab === "words" && (
          <div>
            {formedWords.length === 0 ? (
              <div style={{ color:"#ffffff22", fontSize:12, fontStyle:"italic", padding:"8px 0" }}>
                No words fused yet — select tiles in the Hand tab to build words.
              </div>
            ) : (
              <div style={{ display:"flex", flexWrap:"wrap", gap:12 }}>
                {formedWords.map(group => {
                  const isNew = group.id === newFusedWordId;
                  return (
                    <div key={group.id} style={{
                      display:"inline-flex", flexDirection:"column", alignItems:"center", gap:5,
                      padding:"10px 12px",
                      background:"linear-gradient(145deg,#0d1f0d,#0a160a)",
                      border:"1.5px solid #9EF01A44",
                      borderRadius:12,
                      animation: isNew ? "fuseIn 0.5s cubic-bezier(0.16,1,0.3,1)" : "none",
                      boxShadow: isNew ? "0 0 20px #9EF01A44" : "0 0 0 1px #9EF01A11",
                      transition:"box-shadow 0.4s",
                      cursor:"default",
                      position:"relative",
                    }}>
                      {/* Tile chips fused together */}
                      <div style={{ display:"flex", gap:0, alignItems:"center" }}>
                        {group.tiles.map((tile, ti) => {
                          const cat = TILE_CATEGORIES[tile.category];
                          const sound = getTileSound(tile);
                          const isFirst = ti === 0;
                          const isLast  = ti === group.tiles.length - 1;
                          return (
                            <div key={tile.id} style={{
                              display:"inline-flex", alignItems:"center", justifyContent:"center",
                              background:_th.tileBg(cat, false),
                              border:`1.5px solid ${cat.color}88`,
                              borderLeft: !isFirst ? `1px solid ${cat.color}33` : `1.5px solid ${cat.color}88`,
                              borderRadius: isFirst ? "7px 0 0 7px" : isLast ? "0 7px 7px 0" : "0",
                              minWidth:sound.length>3?28:sound.length>2?24:20,
                              height:32, padding:"0 4px",
                              boxShadow:`inset 0 0 6px ${cat.color}22, 0 0 4px ${cat.color}33`,
                            }}>
                              <span style={{ fontFamily:"'Noto Serif SC',serif", fontSize:sound.length>3?8:sound.length>2?11:14, fontWeight:700, color:_th.tileText(cat, false), lineHeight:1 }}>{sound}</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Word label */}
                      <div style={{ fontSize:11, fontFamily:"'Noto Serif SC',serif", fontWeight:800, color:"#9EF01A", letterSpacing:"0.04em" }}>{group.word}</div>
                      {/* Break button */}
                      <button onClick={() => wbBreakWord(group.id)} title="Break apart" style={{ position:"absolute", top:-6, right:-6, width:16, height:16, borderRadius:"50%", background:"#E8485533", border:"1px solid #E8485566", color:"#ff6b78", fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", outline:"none", padding:0, lineHeight:1 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {cheerKey > 0 && <CheerBurst key={cheerKey} />}
    </div>
  );
}


// ─── ROOT APP — manages screen routing ────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("title"); // "title" | "singleplayer" | "endless" | "timed" | "classic"
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const updateSetting = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  const handleUnlock = () => AudioEngine.unlock();

  let content;
  if (screen === "endless") {
    content = <MahjongPhonicsGame onBackToTitle={() => setScreen("title")} settings={settings} />;
  } else if (screen === "timed") {
    content = <TimedMode onBackToTitle={() => setScreen("title")} settings={settings} />;
  } else if (screen === "classic") {
    content = <ClassicMode onBackToTitle={() => setScreen("title")} settings={settings} />;
  } else if (screen === "singleplayer") {
    content = <SinglePlayerMenu
      onEndless={() => setScreen("endless")}
      onTimed={() => setScreen("timed")}
      onClassic={() => setScreen("classic")}
      onBack={() => setScreen("title")}
    />;
  } else {
    content = <TitleScreen
      onPlay={() => setScreen("singleplayer")}
      onPlayTimed={() => setScreen("singleplayer")}
      settings={settings}
      updateSetting={updateSetting}
    />;
  }

  return (
    <div onClick={handleUnlock} onKeyDown={handleUnlock} style={{ outline: "none" }}>
      {content}
    </div>
  );
}
