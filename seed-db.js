const Database = require('better-sqlite3');
const https = require('https');
const http = require('http');
const path = require('path');

const LETTER_VALUES = {
  T:1, S:1, R:1, O:1, I:1, E:1, A:1,
  U:2, N:2, L:2, D:2,
  Y:3, H:3, G:3,
  W:4, P:4, M:4, F:4, C:4, B:4,
  V:5, K:5,
  X:8,
  Z:10, Q:10, J:10
};

function letterValue(ch) {
  return LETTER_VALUES[ch.toUpperCase()] || 1;
}

// Compute all possible scores for a word with one 2x DL and one 3x TL bonus
function computeScores(word) {
  const w = word.toUpperCase();
  const vals = w.split('').map(letterValue);
  const base = vals.reduce((a, b) => a + b, 0);
  const scores = new Set();
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      if (i === j) continue;
      // position i gets 2x DL, position j gets 3x TL
      const s = base + vals[i] + vals[j] * 2;
      scores.add(s);
    }
  }
  return scores;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Authoritative Scrabble/WWF word lists only
const WORD_SOURCES = [
  // Collins Scrabble Words (CSW) — used in international Scrabble & WWF
  'https://raw.githubusercontent.com/redbo/scrabblewords/master/dictionary.txt',
  // ENABLE word list — Tournament Word List (TWL) used in North American Scrabble
  'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt',
  // Collins English Words (lorenbrichter mirror of CSW)
  'https://raw.githubusercontent.com/lorenbrichter/Words/master/Words/en.txt',
];

// Embedded fallback word list (common 5-letter words)
const FALLBACK_WORDS = `about above abuse actor acute adage admit adobe adopt adult after again agent agree ahead aided
aimer aired aisle alarm album alert alike alien align allay alley allot allow aloft alone along aloof aloud
alter amber amble amend amuse angel anger angle angry anime annex antic anvil aorta apart apple apply apron
arena argue arise armor aroma arose array arson asset atlas atone attic audio audit auger avail avoid awake
award aware awful baker baler balls baron basic basis basil batch beach beard beast bedew began begin beige
being belle bench beset bevel bible bingo black blade blame bland blank blaze bleak bleed blend bless blind
bliss block blood blown board boast bogus bonus books boost booth bored bound brave brawn break breed bribe
bride brief brine bring brink brisk broad broke brook broth brown brush build built bulge bully buyer cacao
cabin cable camel candy caper cargo carol caste catch cause caulk cease cedar chain chair chant chase chasm
cheap check cheek chess chest chief chimp china chunk claim clamp clank claps clash clasp class clean clear
cleft clerk click cliff climb clink cloak clock clone close cloth cloud clout clown cluck clump cobra coast
coils color comma conga coral comet comic could count court cover covet craft crane crave crawl creak cream
creek creep crept crest crimp crisp crock cross crowd crown crude cruel crush crust crux cubic curly cyber
daily dance daunt daffy dazed decay decal decoy delta depot depth derby detox diary digit dingy disco ditch
ditty dizzy dodge doing dolly donor draft drain drama drape drawl drawn dread dream dress dried drift drink
drool droop drove drown druid drown dumpy dunce dusty dwarf eager early earth easel eerie eight eject elder
elect ember emote empty enact endow enjoy envoy equal error erupt essay ethos evade event every exact exert
exile exist extra exult fable facet faint faith fancy farce fatal favor feast feign fence ferry ferry fetch
fiend fifty fight filet filly finch flair flame flank flare flash flask flats flaunt flaw flea fleet flesh
fling flint float flock flood floor flora flour flout flown fluid fluke flute focal foray forge forte forum
fount found frail frame frank frill frond front frost froze frugal fruit fungi funky fuzzy gaily games garde
giant giddy glade gland glare gleam glean glide glint gloat gloom gloss glove glyph gnash gnome golem graft
grain grand grant graph grasp grate grave graze greed greet greet grief greet grind gripe groan groin groat
grope grove growl gruel gruff guile guise gusto gypsy hasty haste hatch haven haven heart heavy heave hedge
hence herbs heron highs hinge hoary hoist homer honor horse hound hover humid humph hurry hyena hyena hyper
imply infer ingot inlay input inter issue ivory jaunt jazzy joust joust karma kayak knave kneel knelt knife
knight knoll known kudos lance lapel lapse lapse larch large latch laud lathe layup leach leapt learn lease
leash leave ledge leech legal lemon level lever libel light limit limbo linen lingo liner lingo lingo liner
links liver llama lodge lodge lofty logic loose lorry loosen louse lusty lyric magic maize major maker mambo
manor manly manor marsh match mauve maxim maybe means medal mercy merge merit mirth model moose morph mourn
mouse muddy multi murky mushy mussy myrrh nasal navel nerve night noble noise notch noted novel novice nudge
nymph oaken obeam occur ochre oddly offer often olive onset onward oaken optic orate orbit order otter outwit
ovary ovoid ozone paced pagan palsy panel panic paper papal parable parse party paste patch patch patchy pause
peace peach pecan penal perch peril petty phase phone piano picot pinch pinky pitch pixel pizza plain plait
plane plank plant plash plasm plead pleat plonk pluck plumb plume plump plunk plush poach point poker poppy
porky pouch preen press pride prime primp prism prize probe prong prose proud prowl prune psalm pubic pudgy
pulse punch puree purge preen quack quail qualm qualm quaff queen quest queue quiet quill quirk quote rabbi
radix rally rainy rapid ravel reach react realm rebel recap recon reign relax relay rebus renal repay repel
rerun reset resin retch revue rhyme ridge risky rival rivet robin rocky roman roost rouge rough round rouse
royal rugby runic rural rusty sadly saint salvo sauce scamp scalp scant scare scarf scorn scour scout scowl
scram scrub scuff sedan seize sense serum seven shade shady shaky shall shank shape share shark shave shawl
sheen sheer sheet shelf shell shift shine shiny shire shirt shone shook shore short shout shove shown shred
shrub shrug shunt sided siege sieve sight silky since sinew sixth sixty skied skimp skirt skull slain slant
slash sleet slept slice slick slide slime slimy sling slink slips slope slosh sloth slunk slurp smart smash
smear smell smelt smirk smite smoke smoky snack snake snaky snare snark sneak sneer snide snoop snore snort
snout snow snuck soggy solar solid solve sorry south spark spasm spawn spear speck spend spill spine spiral
spite spitz splat spoke spoof spook spool spoon sport spray spree sprig spunk squad squat squeal stab stack
staff staid stain stair stalk stall stamp stand stank stave stead steak steal steam steep steer stern stiff
still sting stink stint stomp stone stood stool stoop store storm stout stove strap stray strew stria strip
strut stuck study stump stung stunk stunt suave sugar suite sulky sunny super surge swamp swarm swear sweat
sweep swift swine swoop swore sworn syrup taboo taint taken tally talon taunt tawny taxed tense tepid thatch
thorn throb throe throw thrum thump tiara tidal tidal tiger tilts tinge tipsy toast today token totem touch
tough towel tower toxic trail trait tramp trawl tread trend triad trial trick tried tripe trite troll tromp
trope troth trout trove truce truck truly trump trunk truss trust truth tuber tulle tumor tunic tutor twang
tweak twice twill twirl twixt udder ulcer ultra umbra unfit union unite until unzip upend usurp utter uvula
vague valor valve vapor vault vicar vigil viola viper viper vivid viand vixen voila vying vapid wader watch
waver whelp whack whale wheal wheat wheel where which while whiff whirl whisk white whole widen wield wiggle
wince windy witch witch witty woken woman worse worst worth wrath wring wrote yacht yearn yodel young zappy
zebra zilch zingy zippy zombi zonal`.split(/\s+/).filter(w => w.length === 5);

async function loadWords() {
  const allWords = new Set();

  // Add fallback words first
  FALLBACK_WORDS.forEach(w => allWords.add(w.toUpperCase()));
  console.log(`Loaded ${allWords.size} fallback words`);

  for (const url of WORD_SOURCES) {
    try {
      console.log(`Fetching ${url}...`);
      const text = await fetchUrl(url);
      const words = text.split(/\s+/)
        .map(w => w.trim().toUpperCase())
        .filter(w => /^[A-Z]{5}$/.test(w));
      words.forEach(w => allWords.add(w));
      console.log(`  Added ${words.length} words from source (total: ${allWords.size})`);
    } catch (err) {
      console.warn(`  Failed to fetch ${url}: ${err.message}`);
    }
  }

  return allWords;
}

async function main() {
  const dbPath = path.join(__dirname, 'words.db');
  const db = new Database(dbPath);

  db.exec('DELETE FROM words');

  const words = await loadWords();
  console.log(`\nSeeding ${words.size} unique 5-letter words...`);

  const insert = db.prepare('INSERT OR IGNORE INTO words (word, score) VALUES (?, ?)');

  const insertMany = db.transaction((wordList) => {
    let count = 0;
    for (const word of wordList) {
      // Store minimum possible score (with no bonuses for lookup flexibility)
      // We'll compute real scores at query time, but store base score for indexing
      const vals = word.split('').map(letterValue);
      const base = vals.reduce((a, b) => a + b, 0);
      insert.run(word, base);
      count++;
    }
    return count;
  });

  const count = insertMany(words);
  console.log(`Seeded ${count} words.`);

  const row = db.prepare('SELECT COUNT(*) as cnt FROM words').get();
  console.log(`Database contains ${row.cnt} words.`);

  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });
