/* LLM Lab — tab "Transformer" › The Interview Room. Built from Greg's four sketch pages (Oct 13), column for column:
   1) Start at the end of Input: Token · Token ID · Emb vector + Position vector = Input vector → ID…position fade, "Input vector" becomes "Information card".
   2) Transformer block 1 (interview room 1): Token · Info card · Interviewer 1 … 12 (lanes fade in).
   3) Block 1 / attention head 1: Token · Info card · Question (Query) · Response (Key) · Significance · Contribution (Value) · Interviewer note · Note examples;
      then the notes animate into interviewer column 1.
   4) Supervisor: Token · Info card + Interviewer notes 1…12 = Supervisor summary · Summary examples. Note 1 flies in from its place on the right,
      notes 2–12 fly in from off-screen right in succession, then the summary flies to the info card column and the others fade.
   5) Fact checker: Token · Supervisor summary + Relevant facts · Fact examples = Final description · Final description examples, with a Facts panel
      whose facts fly over to each token; then the final vectors become the next room's starting info cards.
   6) What is known: the last token\'s final description → "If GPT-2 stopped here, it would list…" (Rank · Token · Logit), "river would be #X".
   7) Return to 2) for block 2 … block 12.
   Text columns are our analogy (made up). Info card, supervisor summary, relevant facts and final description are real GPT-2 vectors (flow-data.js);
   the interview columns (contribution, notes) are pictures made from the real cards. The old Use Context tab was removed Oct 14. */
'use strict';
(() => {
  const { $, esc } = NT;
  const S = NT.state;
  const VZ = NT.viz;
  const st = () => $('#stage');
  const STORY = 'story', RIVER = 7850, T = 13, LAST = 12;
  const tr = { beat: 0, room: 1, q: 0, ctx: null, fv: null, playing: false, timer: null };
  const W = ['The', 'banker', 'left¹', 'the', 'bank¹', 'and', 'sat', 'on', 'the', 'left²', 'bank²', 'of', 'the'];
  const COL = Array.from({ length: 13 }, (_, i) => (i === 12 ? '#c2185b' : '#9aa3b2')); // Nov 3 (Greg, option B): gray token bars, the last token crimson
  // ---------- our analogy, room 1 (from the old Use Context pages, as Greg's notes A–H ask) ----------
  // interviewer 1 of each room has its own line of questioning: [short topic, its question to each token (A), each token\'s response (B), how much each response helps (G)]
  const THEMES = {
    1: ['Where?', ['Where is this happening?', 'Where does a banker work?', 'Left where?', 'The what place?', 'Which kind of bank?', 'Where are we so far?', 'Sat where?', 'On what?', 'On the what?', 'Left as in going, or a side?', 'Which kind of bank is this one?', 'Bank of what?', 'What kind of place is this?'],
      ['I start the sentence: no place info.', 'I have info about a person tied to a money place.', 'I have info about leaving a place.', 'I have info about a thing that comes next.', 'I have info about a place: money or river.', 'I join two parts: no place info.', 'I have info about resting somewhere.', 'I have info about a position on something.', 'I have info about a thing that comes next.', 'I have info about a side or direction.', 'I have info about a place: money or river.', 'I have info about a part of some whole.', 'I have info about a thing that comes next.'],
      [0.05, 0.35, 0.2, 0.08, 0.8, 0.05, 0.55, 0.5, 0.1, 0.5, 1, 0.45, 0.15]],
    2: ['Who?', ['Who is this about?', 'Who is the banker?', 'Who left?', 'Who does “the” point to?', 'Whose bank is it?', 'Who comes next?', 'Who sat?', 'Who is on something?', 'Who is “the” about?', 'Who went left?', 'Whose bank is this?', 'Who does it belong to?', 'Who is this sentence about?'],
      ['I have no info about a person.', 'I have info about a person: the banker.', 'I have info about what a person did.', 'I have info about a thing, not a person.', 'I have info about a place a person works.', 'I join actions, likely by one person.', 'I have info about what a person did.', 'I have info about where someone is.', 'I have info about a thing, not a person.', 'I have info about a side, not a person.', 'I have info about a place, not a person.', 'I have info about belonging.', 'I have info about a thing, not a person.'],
      [0.05, 1, 0.6, 0.05, 0.4, 0.2, 0.6, 0.3, 0.05, 0.1, 0.15, 0.05, 0.1]],
    3: ['What happened?', ['What happened?', 'What did the banker do?', 'What happened when he left?', 'What happened to the …?', 'What happened at the bank?', 'What happens next?', 'What did he do then?', 'What did he sit on?', 'What is the thing?', 'What happened on the left?', 'What happened at this bank?', 'What is “of” about?', 'What just happened?'],
      ['I have no event info.', 'I have info about who acts.', 'I have info about an event: leaving.', 'I have info about a thing that comes next.', 'I have info about the place that was left.', 'I have info that another event follows.', 'I have info about an event: sitting.', 'I have info about where the sitting was.', 'I have info about a thing that comes next.', 'I have info about a side, not an event.', 'I have info about the place he sat.', 'I have info that a part of something follows.', 'I have info about a thing that comes next.'],
      [0.05, 0.5, 0.7, 0.05, 0.4, 0.3, 1, 0.6, 0.05, 0.2, 0.6, 0.05, 0.1]],
    4: ['Money or nature?', ['Money or nature?', 'Is a banker about money?', 'Did he leave a money place?', 'Money or nature?', 'Is this a money bank?', 'Money or nature?', 'Do you sit at a money place?', 'On money or on nature?', 'Money or nature?', 'Is the left side money or nature?', 'Is this bank money or nature?', 'Money or nature?', 'Money or nature?'],
      ['I have no money or nature info.', 'I have info about money.', 'I have info about leaving, not money.', 'I have info about a thing that comes next.', 'I have info about a bank: money or river.', 'I join parts: no money info.', 'I have info about resting, often outdoors.', 'I have info about a surface.', 'I have info about a thing that comes next.', 'I have info about a side.', 'I have info about a bank: money or river.', 'I have info about what something belongs to.', 'I have info about a thing that comes next.'],
      [0.05, 0.6, 0.5, 0.05, 0.6, 0.05, 0.8, 0.5, 0.05, 0.2, 1, 0.1, 0.1]],
    5: ['Just before me?', ['What comes before me?', 'What’s before “banker”?', 'What’s before “left”?', 'What’s before “the”?', 'What’s before “bank”?', 'What’s before “and”?', 'What’s before “sat”?', 'What’s before “on”?', 'What’s before “the”?', 'What’s before “left”?', 'What’s before “bank”?', 'What’s before “of”?', 'What’s right before me?'],
      ['I have info about being first.', 'I have info about the word “banker”.', 'I have info about the word “left”.', 'I have info about the word “the”.', 'I have info about the word “bank”.', 'I have info about the word “and”.', 'I have info about the word “sat”.', 'I have info about the word “on”.', 'I have info about the word “the”.', 'I have info about the word “left”.', 'I have info about the word “bank”.', 'I have info about the word “of”.', 'I have info about the word “the”.'],
      [0.02, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.1, 1, 0.2]],
    6: ['Which side?', ['Which side?', 'Which side is the banker on?', 'Left as in a side?', 'Which side?', 'Which side of the bank?', 'Which side?', 'Which side did he sit on?', 'On which side?', 'Which side?', 'Is “left” a side here?', 'Which side of this bank?', 'Which side?', 'Which side is this on?'],
      ['I have no side info.', 'I have no side info.', 'I have info about leaving (or a side).', 'I have no side info.', 'I have info about a place with sides.', 'I have no side info.', 'I have info about resting somewhere.', 'I have info about a position.', 'I have no side info.', 'I have info about a side: the left.', 'I have info about a place with sides.', 'I have info about what owns the side.', 'I have no side info.'],
      [0.03, 0.05, 0.3, 0.03, 0.1, 0.03, 0.2, 0.3, 0.03, 1, 0.8, 0.1, 0.1]],
    7: ['Seen this place?', ['Any place so far?', 'Has a place come up?', 'Did he leave a place?', 'Is a place coming?', 'Is “bank” a place?', 'Any place so far?', 'A place to sit?', 'On some place?', 'Is a place coming?', 'A place on the left?', 'Is this the same bank?', 'Part of a place?', 'Has this place come up before?'],
      ['I have no place info.', 'I have info about a person, not a place.', 'I have info about leaving a place.', 'I have info about a thing that comes next.', 'I have info about a first place: a bank.', 'I have info that a new part starts.', 'I have info about resting somewhere.', 'I have info about a surface.', 'I have info about a thing that comes next.', 'I have info about a side of a place.', 'I have info about a second bank.', 'I have info about what a place belongs to.', 'I have info about a thing that comes next.'],
      [0.03, 0.05, 0.4, 0.05, 0.8, 0.1, 0.5, 0.4, 0.05, 0.4, 1, 0.4, 0.1]],
    8: ['Sit on what?', ['What can you sit on?', 'Can you sit on a banker?', 'Can you sit on “left”?', 'What can you sit on?', 'Can you sit on a bank?', 'What can you sit on?', 'What did he sit on?', 'On top of what?', 'What can you sit on?', 'Can you sit on the left?', 'Can you sit on this bank?', 'What can you sit on?', 'What did he sit on?'],
      ['I have no seat info.', 'I have info about a person, not a seat.', 'I have info about leaving.', 'I have info about a thing that comes next.', 'I have info about a building with money.', 'I have info that a new action follows.', 'I have info about sitting.', 'I have info about a surface to sit on.', 'I have info about a thing that comes next.', 'I have info about a side.', 'I have info about a slope or a money bank.', 'I have info about what owns it.', 'I have info about a thing that comes next.'],
      [0.03, 0.05, 0.05, 0.03, 0.3, 0.03, 0.7, 0.6, 0.05, 0.4, 1, 0.3, 0.1]],
    9: ['A name coming?', ['Is a name coming?', 'Is “banker” a name?', 'Is a place named?', 'Is a name coming?', 'Is the bank named?', 'Is a name coming?', 'Is the seat named?', 'Is something named next?', 'Is a name coming?', 'Is a side named?', 'Is this bank named?', 'Is a name coming after “of”?', 'Is a name coming next?'],
      ['I have info about a thing being named.', 'I have info about a job, not a name.', 'I have info about an action.', 'I have info about a thing being named.', 'I have info about an unnamed bank.', 'I have info about joining.', 'I have info about an action.', 'I have info about a position.', 'I have info about a thing being named.', 'I have info about a side.', 'I have info about a bank, not yet named.', 'I have info that a name may follow.', 'I have info about a thing being named.'],
      [0.03, 0.05, 0.05, 0.2, 0.2, 0.03, 0.1, 0.4, 0.2, 0.2, 0.6, 1, 0.1]],
    10: ['“of” connects?', ['What does “of” connect?', 'Is the banker part of it?', 'Is “left” part of it?', 'Is “the” part of it?', 'Is the first bank part of it?', 'Is “and” part of it?', 'Is “sat” part of it?', 'Is “on” part of it?', 'Is this “the” part of it?', 'Is “left” part of it?', 'Is this bank part of it?', 'What does “of” connect?', 'What does “of” connect me to?'],
      ['I have no link info.', 'I have info about a person.', 'I have info about an action.', 'I have info about a thing that comes next.', 'I have info about the first bank.', 'I have info about joining actions.', 'I have info about sitting.', 'I have info about a position.', 'I have info about a thing that comes next.', 'I have info about a side.', 'I have info about the bank being linked.', 'I have info about linking to a whole.', 'I have info about a thing that comes next.'],
      [0.03, 0.05, 0.05, 0.03, 0.1, 0.03, 0.4, 0.3, 0.3, 0.5, 1, 0.9, 0.1]],
    11: ['Bank of what?', ['What is a bank of?', 'Is it the banker’s bank?', 'Did he leave a bank of money?', 'A bank of what?', 'A bank of money?', 'A bank of what?', 'A bank you sit on is of what?', 'On a bank of what?', 'A bank of what?', 'The left bank of what?', 'This bank is of what?', 'Bank of what?', 'Bank of the … what?'],
      ['I have no bank info.', 'I have info about money banks.', 'I have info about leaving.', 'I have info about a thing that comes next.', 'I have info about a money bank.', 'I have info that a new part starts.', 'I have info about resting outdoors.', 'I have info about a surface.', 'I have info about a thing that comes next.', 'I have info about a side of a river or road.', 'I have info about a riverside bank.', 'I have info that the bank’s owner follows.', 'I have info about a thing that comes next.'],
      [0.03, 0.1, 0.1, 0.03, 0.2, 0.03, 0.6, 0.5, 0.05, 0.9, 1, 0.8, 0.1]],
    12: ['What next?', ['What comes next?', 'What comes after “banker”?', 'What comes after “left”?', 'What comes after “the”?', 'What comes after “bank”?', 'What comes after “and”?', 'What comes after “sat”?', 'What comes after “on”?', 'What comes after “the”?', 'What comes after “left”?', 'What comes after “bank”?', 'What comes after “of”?', 'What word comes next?'],
      ['I have info about being first.', 'I have info about the main person.', 'I have info about the first action.', 'I have info about a thing that comes next.', 'I have info about the first place.', 'I have info about a second action.', 'I have info about the second action.', 'I have info about a position.', 'I have info about a thing that comes next.', 'I have info about a side.', 'I have info about the second place.', 'I have info that a place name follows.', 'I have info that a noun comes next.'],
      [0.02, 0.05, 0.1, 0.05, 0.2, 0.05, 0.2, 0.2, 0.1, 0.5, 0.8, 1, 0.1]],
  };
  // the other interviewers' lines of questioning (short topics), mixed differently in every room
  const POOL = ['Where?', 'Who?', 'What happened?', 'Money or nature?', 'Just before me?', 'Which side?', 'Seen this place?', 'Sit on what?', 'A name coming?', '“of” connects?', 'Bank of what?', 'What next?', 'When?', 'Person or thing?', 'Past or now?', 'Indoors or out?', 'How many?', 'Big or small?', 'Doing or being?', 'Same word before?'];
  const ICOL = ['#5b38d1', '#c2185b', '#1e8a3a', '#d9730d', '#2b5aa8', '#8e44ad', '#16a085', '#b8860b', '#7a7d12', '#0f6b8a', '#6d4c41', '#7a8699'];
  const topics = (r) => { const t1 = THEMES[r][0], rest = POOL.filter((x) => x !== t1); const out = [t1]; for (let k = 0; out.length < 12; k++) out.push(rest[(r * 7 + k * 3) % rest.length]); return [...new Set(out)].concat(rest).slice(0, 12); };
  const TH = () => THEMES[tr.room];
  const QUESTION = 'Where is this happening?';
  const NOTEX = ['nothing comes before me', 'I’m the one doing things', 'it was the banker who left', 'it’s “the bank” he left', 'a money bank (a banker is near)', 'joins two actions', 'the banker sat down', 'sat on something', '“the” something he sat on', 'a side: “on the left”', 'a place he sat on: money or river?', '“bank of” something', '“the” what? a place where he sat']; // F
  const SUMX = ['the start of the sentence', 'the banker: the one who left', 'the banker left (went away)', 'points at “bank”', 'a money bank: the one the banker left', 'joins “left the bank” and what came next', 'the banker sat down', 'sat on something', 'points at “left”', 'a side, not leaving', 'a bank he sat on, on the left side', '“bank of” something', 'a place the banker sat on: a bank, on the left side']; // C
  const FACTX = ['', 'bankers work at banks', '“left the bank” = went away from it', '', 'a bank is a place you can leave', '', 'people sit on benches, grass, banks', '', '', '“on the left” = a side', 'river banks are places to sit', '“bank of …” names what the bank belongs to', '“bank of the …” is often followed by a kind of place']; // D
  const FINX = ['the start', 'the banker, who left his bank', 'went away from the bank', 'points at the money bank', 'the money bank he left', 'then something else happened', 'the banker sat down', 'sat on something', 'points at the next thing', 'on the left side', 'a bank to sit on: by the water?', '“bank of” some place', 'next: what kind of place? street? river?']; // E
  const FACTS = ['bankers work at banks', '“left the bank” usually means went away', 'people sit on benches, grass, banks', 'river banks are places to sit', '“on the left” is a side', '“bank of the …” is followed by a kind of place', '… 3,066 more'];
  // later rooms: what the cards of bank¹, bank², and "the" add, room by room (our analogy); other rows show their numbers only
  const LATER = {
    4: { 2: 'where a banker works', 5: 'the money kind: the one he left', 8: 'a building, in a town' },
    10: { 2: 'grassy, outdoors', 4: 'not the money kind: he sat on it', 8: 'a river’s edge' },
    12: { 2: 'a bank he sat on, on the left side', 5: 'this is a story about a place', 8: 'a bank you can sit on is often by water', 10: 'next: a river, the kind of bank you sit on', 12: 'most likely: river, maybe bank or street' },
  };
  const NOTES_R = {"2": ["no one yet", "I’m the person here", "the banker is the one who left", "a thing, not a person", "the banker’s workplace", "the banker again", "the banker sat down", "the banker is on something", "a thing the banker is on", "a side, not a person", "nobody’s: a place he sat", "belongs to a place, not a who", "still about the banker"], "3": ["nothing yet", "a banker: he’ll do something", "the banker went away", "he left “the” something", "he left the bank", "another action is coming", "he left, then sat down", "he sat on something", "he sat on “the” something", "on the left side of it", "he sat on a bank", "a bank of something", "he sat on the left bank of …"], "4": ["can’t tell yet", "money: a banker", "he left a money place?", "still sounds like money", "a money bank", "money so far", "sitting: maybe outdoors", "on something: nature?", "leaning toward nature", "a side of something", "you sit on a river bank: nature", "nature: a bank of something", "nature, most likely"], "5": ["I’m first", "after “The”: the banker", "“banker left”", "“left the”", "“the bank”", "“bank and”", "“and sat”", "“sat on”", "“on the”", "“the left”", "“left bank”", "“bank of”", "“of the”: bank of the …"], "6": ["no side yet", "a person, no side", "“left” as in went away", "“the” …: no side", "a bank: no side", "joining: no side", "sat: side not said", "on something: which side?", "a side might come", "the left side!", "the left bank", "the left bank of …", "the left one"], "7": ["no place yet", "a banker: a bank nearby?", "he left some place", "a place is coming", "the bank: place #1", "one place so far: the bank", "a place to sit", "on some place", "“the” place again?", "the left side of a place", "a second bank, not the first", "part of some place", "two banks so far"], "8": ["nothing to sit on", "not a banker!", "not “left”", "a thing you might sit on", "not a money bank", "nothing yet", "something outdoors", "a seat? the ground?", "“the” seat or ground", "its left side", "a grassy bank by water", "a bank of something", "a bank, by the water"], "9": ["not yet", "a job, not a name", "no place named", "“the” names a thing next", "the bank: no name", "not yet: joining", "no name", "a thing is named next", "“the” names a thing", "“left” names a side", "bank of …: a name soon", "what the bank belongs to!", "a kind of place comes next"], "10": ["nothing yet", "the banker: not linked", "“left”: not linked", "not yet", "the bank he left: no", "joins two actions", "he sat there", "on it", "“on the left bank”", "the left bank", "bank of …!", "links “bank” to a place", "“bank of the …”: a place"], "11": ["don’t know", "his bank holds money", "he left a money bank", "don’t know yet", "a bank of money", "still money", "sat by a river? a lake?", "on a bank of a river?", "a bank of what?", "rivers have left banks", "a bank of a river!", "of a river or a street", "a river, most likely"], "12": ["any token", "next: “left” or “was”", "next: “the bank”", "next: “bank”", "next: “and”", "next: “sat”", "next: “on”", "next: “the”", "next: “left”", "next: “bank”", "next: “of”", "next: “the”", "next: “river”, “bank” or “street”"]}; // rooms 2–12: each token’s note, answering its own question
  const later = (r, i) => { const L = LATER[i]; if (!L) return ''; let t = ''; Object.keys(L).forEach((k) => { if (+k <= r) t = L[k]; }); return t; };

  // ---------- the beats (one room) ----------
  const BEATS = [
    [1, 'start', 'Each token brings its Case File (Input Vector) to 12 Detectives.', 'The Case File is the token’s hidden state: it starts as Embedding Vector + Position Vector (768 numbers) and is updated in every block.'],
    [1, 'fadein', 'Each token brings its Case File (Input Vector) to 12 Detectives.', 'The Case File is the token’s hidden state: it starts as Embedding Vector + Position Vector (768 numbers) and is updated in every block.'],
    [2, 'stack', 'Each token’s Case File passes through 12 Investigation Rooms (Transformer Blocks), one after another.', 'Each room updates every Case File and hands it to the next room, so the rooms work in order. Each room holds 12 Detectives (Attention Heads).'],
    [2, 'room', 'We will first look at just one Investigation Room (Transformer Block).', 'Within each Investigation Room are 12 Detectives who each have a specific line of questioning.'],
    [2, "focus", "We’ll follow Detective 1, whose line of questioning is “{topic}”.", "The other 11 Detectives work in parallel, each using its own learned methods."],
    [3, "q", "Detective 1 follows the same line of questioning for every token in this room.", "It uses the same learned Q matrix for every Case File. Because the Case Files differ, the resulting 64-number Questions (Queries) can differ."],
    [3, "k", "Each witness offers a Statement and a Verbal Sketch from its Case File.", "Statement: Here is what I can offer about this line of inquiry. Verbal Sketch: Here is my verbal sketch of that information."],
    [3, "s", "For “{q}”, the Detective compares one Question with every eligible witness’s Statement.", "Only “{q}” and earlier tokens can serve as witnesses. Their relevance scores become attention percentages totaling 100%. Relevance does not mean truth."],
    [3, 'v', 'Verbal Sketches (Values) are combined in proportion to Relevance.', 'Verbal Sketch is already prepared. Multiply each Value by its percentage, then add the weighted vectors: one 64-number Note.'],
    [3, 'n', 'The detective writes a short note about each token (a 64-element vector: 768 ÷ 12).', 'Detective 1 makes a separate 64-number note for every token, using its permitted witnesses.'],
    [3, 'nx', 'What the notes say.', 'The notes are really a vector of 64 numbers; these words are our analogy of what they hold.'],
    [4, 'sup1', 'All 12 detectives’ notes are assembled together.', 'Join 12 × 64 numbers end to end: 768 numbers. Joining is not adding.'],
    [4, 'sup2', 'All 12 detectives’ notes are assembled together.', 'Join 12 × 64 numbers end to end: 768 numbers. Joining is not adding.'],
    [4, 'join', 'The 12 Notes join into one 768-number vector.', 'Concatenate means join end to end, not add. Each Note contributes 64 numbers.'],
    [4, 'project', 'The Sketch Artist transforms the joined Notes.', 'The learned output projection W_O mixes the 768 numbers before residual addition.'],
    [4, 'sup3', 'The Sketch Artist combines the notes into a Sketch Update and files it in the existing Case File.', 'Join 12 Notes → transform the 768 numbers with W_O → add to the existing Case File.'],
    [4, "sup4", "The Updated Case File is the updated Case File.", "The projected attention output has been added to the incoming Case File. The result still has 768 numbers."],
    [5, 'f1', 'The Forensics Expert (MLP) uses additional expertise to refine each Case File.', 'It expands each Case File to 3,072 numbers, transforms them with learned patterns, and condenses the result back to 768.'],
    [5, 'f2', 'The Final Case File.', 'Add the MLP output back: a second residual update. Each Case File stays 768 numbers.'],
    [5, 'f3', 'The Final Case Files pass to the next Investigation Room.', '{next}'],
    [6, 'known', 'What is known so far?', 'If GPT-2 stopped after block {r}, the last token’s Case File would rank these tokens next.'],
  ];
  const B = Object.fromEntries(BEATS.map((b, i) => [b[1], i]));
  // Nov 3: the stack and zoom beats read differently once the story has already been through a room
  const LATER_CAP = {
    stack: ['Room {p} is done. Its Case Files now enter Room {r}.', 'Each room needs the previous room’s output, so the rooms work in order: {p} done, {left} to go.'],
    room: ['Now we look inside Room {r} (Transformer Block {r}).', 'Room {r} has its own 12 Detectives, each with its own line of questioning, different from Room {p}’s.'],
  };
  const STEPS = [[1, '🪪', 'Input'], [2, '🚪', 'Transformer Block'], [3, '🎤', 'Attention Head 1'], [4, '✍️', 'Assembly'], [5, '📚', 'Feed-Forward'], [6, '🔎', 'What is known']];
  // “river”'s real rank if GPT-2 stopped after each block (all 50,257 scored offline with GPT-2's weights, Oct 15; blocks 7–12 also match the stored top 50)
  const RIVER_RANK = [15818, 2910, 2505, 1391, 919, 727, 290, 37, 3, 2, 1, 1, 1];
  const REAL = {
    1: 'The Case File is the token’s <b>input vector</b>: 768 numbers.',
    2: 'Each investigation room is a <b>transformer block</b>; each detective is an <b>attention head</b> (12 per block). Heads learn different patterns during pre-training; our named specialties are illustrative, not literal jobs. Each block needs the preceding block’s output, so the 12 blocks run in sequence.',
    3: 'Question = <b>Query</b>; Statement = <b>Key</b>; Verbal Sketch = <b>Value</b>. Each head reuses its learned Q/K/V matrices across tokens. Q–K dot products ÷ √64 (= 8), masking, and Softmax give percentages totaling 100%. Weight the Values and add to form a 64-number Note. A token can attend to itself and earlier tokens, never later ones.',
    4: 'The 12 notes (12 × 64 = 768 numbers) are joined, mixed by one learned matrix, and <b>added</b> to the token’s vector. The Case File stays 768 numbers long.',
    5: 'The Forensics Expert is the <b>feed-forward network (MLP)</b>. Learned transformations expand each 768-number vector to 3,072 dimensions and return it to 768; the result is added to its Case File. Pattern examples illustrate learned relationships, not a database or an external fact check.',
    6: 'GPT-2 scores the last token’s vector against every token’s embedding row (logits), as in the Output tab.',
  };

  // ---------- scene geometry ----------
  const SW = 1290, TOP = 74, ROW = 34, VW = 120;
  const H = TOP + T * ROW + 70;
  const rowY = (i) => TOP + i * ROW;
  const X = { tok: 18, card: 108, id: 112, emb: 175, p1: 475, pos: 495, e1: 800, inp: 825, lane: (k, w) => 420 + k * w, q: 390, k: 510, s: 665, v: 730, n: 815, nx: 1064, sp: 405, se: 800, sum: 825, sx: 1125, fp: 405, f: 435, fx: 592, fe: 800, fin: 825, fnx: 1125, panel: 1060, box: 430 };

  const P = 'tr_', E = (id) => document.getElementById(P + id);
  // ---------- the 12-room stack (Nov 3): one rounded rectangle per room, each room's output feeding the next ----------
  const SK = { x: 478, w: 780, y0: 22, h: 28, gap: 18, lw: 112 };
  const SLOT = (SK.w - SK.lw - 24 - 52) / 12, CHW = 50; // the last 52 px hold the room's Sketch Artist and Forensics Expert // one detective chip per slot in a stack row
  const skY = (k) => SK.y0 + (k - 1) * (SK.h + SK.gap); // room k = 1..12
  // zoom timeline (ms, scaled by Speed): later rooms fade, earlier rooms fade, this room grows and its detectives spread, questions, dashed boxes
  const zoomT = () => { const prior = tr.room > 1 ? ms(650) : 0, grow = prior + ms(650); return { later: 0, prior, grow, ask: grow + ms(1150), boxes: grow + ms(1750), end: grow + ms(2300) }; };
  const ZOOM = { x: 404, y: 20, w: 848, h: rowY(T) + 30 - 20 }; // room for the Sketch Artist / Forensics line at the bottom // the expanded room: around the 12 lane headers and boxes

  // ---------- data ----------
  async function loadData() {
    if (!window.REALLY_DATA) await new Promise(resolve => { const script = document.createElement('script'); script.src='./data/really-data.js'; script.onload=resolve; script.onerror=resolve; document.head.appendChild(script); });
    const D = window.CTX_DATA || (NT.ctxData ? await NT.ctxData().catch(() => null) : null);
    tr.ctx = D && D.stack[STORY];
    const FD = NT.flowData ? await NT.flowData() : null, X8 = FD && FD[STORY];
    if (X8 && X8.T === T) {
      const dec = (k) => X8['_' + k] || (X8['_' + k] = (() => { const u = NT.b64(X8[k]); return new Int8Array(u.buffer, u.byteOffset, u.byteLength); })());
      tr.fv = (kind, b, i) => { const q = dec(kind), sc = X8[kind + 's'][b * T + i], o = (b * T + i) * 768, a = new Float32Array(768); for (let e = 0; e < 768; e++) a[e] = (q[o + e] / 127) * sc; return a; };
    }
  }
  const zero = () => new Float32Array(768);
  const card = (b, i) => (tr.fv ? tr.fv('h', b, i) : zero()); // after room b (0 = the input vector)
  const att = (b, i) => (tr.fv ? tr.fv('a', b - 1, i) : zero()); // what room b's 12 interviewers added
  const mlp = (b, i) => (tr.fv ? tr.fv('m', b - 1, i) : zero()); // what room b's fact checker added
  const add = (a, c) => Float32Array.from(a, (x, k) => x + c[k]);
  const emb = (i) => { const ex = NT.current().ex; return ex && ex.tok ? ex.tok.slice(i * 768, i * 768 + 768) : zero(); };
  const trace = () => window.REALLY_DATA && window.REALLY_DATA.blocks[tr.room - 1];
  const decodeTrace = (p, i) => { const bytes=NT.b64(p.d); const data=new Int8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength); return Float32Array.from({length:p.n},(_,k)=>data[i*p.n+k]*p.s[i]/127); };
  const shares = q => { const b=trace(); return Array.from({length:T},(_,i)=>i<=q && b ? b.att[q][i] : 0); };
  const illustrativeValue = (b,j,k=0) => window.REALLY_DATA ? decodeTrace(window.REALLY_DATA.blocks[b-1].v,k*T+j) : new Float32Array(64);
  const note = (b,i,k=0) => window.REALLY_DATA ? decodeTrace(window.REALLY_DATA.blocks[b-1].z,k*T+i) : new Float32Array(64);
  const role = VZ.role;
  const riverRank = (b) => { const L = tr.ctx && tr.ctx.lens && tr.ctx.lens[b]; if (!L) return null; const k = L.findIndex(([id]) => id === RIVER); return k < 0 ? null : k + 1; };

  // ---------- building the scene for one room ----------
  function txt(kind, i) {
    const r = tr.room, th = TH();
    if (kind === 'q') return th[1][i];
    if (kind === 'k') return th[2][i].replace('I have info about', 'I can offer').replace('I have no', 'I have no');
    if (r === 1) return { nx: NOTEX, sx: SUMX, fx: FACTX, fnx: FINX }[kind][i];
    // later rooms: the note mostly comes from the most significant response; key rows also get their story lines
    const w = shares(i); let top = 0; for (let j = 0; j <= i; j++) if (j !== i && w[j] > w[top]) top = j; if (i === 0) top = 0;
    const fromTop = NOTES_R[r][i];
    if (kind === 'nx') return fromTop;
    if (kind === 'sx') return later(r, i) || '+ ' + fromTop;
    if (kind === 'fx') return i === LAST || i === 4 || i === 10 ? FACTX[i] : '…';
    return later(r, i) || fromTop;
  }
  const cell = (id, cls, html, w, style = '') => `<div class="tr-c ${cls}" id="${P}${id}" style="width:${w}px;height:${ROW - 6}px;${style}">${html}</div>`;
  const cv = (id, w = VW, cls = '') => {
    const head = /^(?:v\d|n\d|lc\d|vsumc)/.test(id);
    const size = VZ.vectorSize(head ? 64 : 768, /^(?:card|sum|fin|emb|pos)/.test(id) ? 288 : w);
    return `<canvas class="fl-strip tr-cv ${cls}" id="${P}${id}" style="width:${size.width}px;height:${size.height}px"></canvas>`;
  };
  function build() {
    const r = tr.room, laneW = 30;
    let h = `<div class="fl-scene tr-scene" id="${P}sc" style="width:${SW}px;height:${H}px"><svg class="fl-svg" id="${P}svg" width="${SW}" height="${H}" viewBox="0 0 ${SW} ${H}"></svg>`;
    const head = (k, t, w = 140) => (h += `<div class="fl-h tr-h" id="${P}h-${k}" style="width:${w}px">${t}</div>`);
    // the stack sits under everything else, so the expanded room's frame never covers the lanes
    for (let k = 1; k <= 12; k++) {
      const cls = k < r ? 'done' : k === r ? 'now' : 'next';
      h += `<div class="tr-rm ${cls}" id="${P}rm${k}" style="width:${SK.w}px;height:${SK.h}px"></div>`;
      h += `<div class="tr-rml ${cls}" id="${P}rml${k}" style="width:${SK.lw}px">${k < r ? '✓ ' : ''}Room ${k} <small>Block ${k}</small></div>`;
      // each detective is its own chip, so on the zoom the current room's detectives can spread out to their places
      for (let d = 0; d < 12; d++) h += `<div class="tr-rc" id="${P}rc${k}_${d}" style="width:${CHW}px;color:${ICOL[d]}">🎤<b>${d + 1}</b></div>`;
      h += `<div class="tr-rx" id="${P}rx${k}" title="Sketch Artist and Forensics Expert (MLP)">✍️ 📚</div>`;
    }
    { // the funnel: every token's Case File flows into this room; then a single arrow between rooms, middle to middle
      const cx = SK.x + SK.w / 2, ry = skY(r) + SK.h / 2, x0 = X.card + 292, xm = SK.x - 26;
      let g = `<defs><marker id="${P}sar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#5b38d1"/></marker></defs>`;
      for (let i = 0; i < T; i++) { const y = rowY(i) + ROW / 2 - 3; g += `<path class="tr-fan" style="--i:${i}" d="M${x0} ${y} C ${x0 + 46} ${y}, ${xm - 40} ${ry}, ${xm} ${ry}" stroke="${COL[i]}" stroke-width="1.6" fill="none" opacity=".75"/>`; }
      g += `<circle class="tr-fanj" cx="${xm}" cy="${ry}" r="3.5" fill="#5b38d1"/><path class="tr-fanj" d="M${xm} ${ry} H${SK.x - 3}" stroke="#5b38d1" stroke-width="2.5" fill="none" marker-end="url(#${P}sar)"/>`;
      h += `<svg class="tr-stsvg" id="${P}stfan" width="${SW}" height="${H}" viewBox="0 0 ${SW} ${H}">${g}</svg>`;
      let a = `<defs><marker id="${P}sar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#8b78d8"/></marker></defs>`;
      // Nov 3 (Greg): no room-to-room arrows; the Case Files are what move between rooms (the funnel arrow shows that)
      a += `<path d="M${cx} ${skY(12) + SK.h + 1} V${skY(12) + SK.h + 14}" stroke="#8b78d8" stroke-width="2" fill="none" marker-end="url(#${P}sar2)"/>`;
      h += `<svg class="tr-stsvg" id="${P}stsvg" width="${SW}" height="${H}" viewBox="0 0 ${SW} ${H}">${a}</svg>`;
      h += `<div class="tr-skout" id="${P}skout" style="width:220px">to Output: the next-token scores</div>`;
      // the zoomed room also holds a Sketch Artist and a Forensics Expert (their work comes after the 12 Detectives')
      h += `<div class="tr-zcrew" id="${P}zcrew"><span>✍️ <b>Sketch Artist</b> assembles the 12 Notes</span><span>📚 <b>Forensics Expert</b> (MLP) adds learned patterns</span></div>`;
    }
    head('tok', 'Token', 80); head('id', 'Token ID', 60); head('emb', 'Embedding <small>Embedding Vector: 768 Numbers</small>', 288); head('pos', 'Position <small>Position Vector: 768 Numbers</small>', 288); head('card', r === 1 ? 'Input vector' : `🪪 Case Files <small>from Room ${r - 1}</small>`, 150);
    const tp = topics(r); for (let k = 0; k < 12; k++) head('l' + k, `<span class="tr-topic" style="--ic:${ICOL[k]}">🎤${k + 1}<i>${esc(tp[k])}</i></span>`, 74);
    head('joined', 'Concatenated Notes <small>Head Outputs: 768 Numbers</small>', 320); head('projected', 'Sketch Update <small>Attention Output: 768 Numbers</small>', 320); head('lanes', 'Detective notes', 300); head('lanes2', 'Detective', 200);
    head('q', '<span class="tr-qh">❓ Question <small>Q: 64 Numbers</small></span>', 175); head('k', '<span class="tr-kh">🏷️ Statement <small>K: 64 Numbers</small></span>', 175); head('s', 'Relevance', 60); head('v', '📨 Verbal Sketch <small>V: 64 Numbers</small>', 130); head('n', '<span class="tr-vh">📝 Note <small>Head Output:<br>64 Numbers</small></span>', 90); head('nx', 'Note examples <span class="tr-an">our analogy</span>', 240);
    head('sum', '✍️ Updated Case File <small>Updated Vector: 768 Numbers</small>', 288); head('sx', 'Summary examples <span class="tr-an">our analogy</span>', 150);
    head('f', '📚 Learned patterns <small>MLP Output: 768 Numbers</small>', 150); head('fx', 'Pattern examples <span class="tr-an">our analogy</span>', 196); head('fin', `🪪 Final Case File <small>Block ${r} Output: 768 Numbers</small>`, 288); head('fnx', 'Final file examples <span class="tr-an">our analogy</span>', 150);
    for (let i = 0; i < T; i++) {
      h += `<div class="tr-c tr-tok" id="${P}t${i}" data-i="${i}" style="--c:${COL[i]};width:84px;height:${ROW - 6}px">${esc(W[i])}</div>`;
      h += cv('joined' + i, 288) + cv('projected' + i, 288);
      for (let k = 0; k < 11; k++) h += `<div class="fl-op" id="${P}concat${k}_${i}" style="font-size:12px">‖</div>`;
      h += cell('id' + i, 'tr-id', NT.current().ids[i], 56);
      h += cv('emb' + i) + `<div class="fl-op" id="${P}p1${i}">+</div>` + cv('pos' + i) + `<div class="fl-op" id="${P}e1${i}">=</div>` + cv('card' + i, 140);
      for (let k = 0; k < 12; k++) h += `<div class="tr-lane empty" id="${P}lb${k}_${i}" style="--ic:${ICOL[k]};width:24px;height:20px"></div>`;
      for (let k = 0; k < 12; k++) h += `<div class="tr-lane" id="${P}l${k}_${i}" style="--ic:${ICOL[k]};width:24px;height:20px">${cv('lc' + k + '_' + i, laneW - 6, 'tr-lc')}</div>`;
      h += cell('q' + i, 'tr-tx tr-qcol', esc(txt('q', i) || ''), 175) + cell('k' + i, 'tr-tx tr-tag', esc(txt('k', i) || ''), 175) + cell('s' + i, 'tr-pc', '', 50) + cv('v' + i, 100) + cv('n' + i, 100) + cell('nx' + i, 'tr-tx', esc(txt('nx', i) || ''), 200);
      h += `<div class="fl-op" id="${P}sp${i}">+</div><div class="fl-op" id="${P}se${i}">=</div>` + cv('sum' + i, 120) + cell('sx' + i, 'tr-tx', esc(txt('sx', i) || ''), 150);
      h += `<div class="fl-op" id="${P}fp${i}">+</div><div class="fl-op" id="${P}fe${i}">=</div>` + cv('f' + i, 120) + cell('fx' + i, 'tr-tx tr-fact', esc(txt('fx', i) || ''), 196) + cv('fin' + i, 140) + cell('fnx' + i, 'tr-tx', esc(txt('fnx', i) || ''), 150);
    }
    h += `<div class="tr-akey" id="${P}akey">Relevance color = share of attention<br>${['20%+', '10–20', '5–10', '2–5', '&lt;2%'].map((t, i) => `<i style="background:${VZ.LINECOL[i]}"></i>${t}`).join(' ')}</div>`; // Nov 3 color key (arcs and %)
    h += `<div class="tr-c tr-total" id="${P}tot" style="width:60px">100%</div><div class="tr-c tr-sumrow" id="${P}vsum" style="width:240px">Σ weighted sketch for <b id="${P}vsumw"></b> ${cv('vsumc', 100)}</div>`;
    h += `<div class="tr-panel2" id="${P}panel"><div class="rk-tt">📚 Learned Patterns <small class="muted">learned in training</small></div>${FACTS.map((f) => `<div class="tr-fl">• ${esc(f)}</div>`).join('')}</div>`;
    h += `<div class="tr-box" id="${P}box"></div>`;
    return h + '</div>';
  }
  function paintVecs() {
    const r = tr.room;
    for (let i = 0; i < T; i++) {
      const c0 = card(r - 1, i), s1 = add(c0, att(r, i));
      VZ.vec(E('emb' + i), emb(i)); VZ.vec(E('pos' + i), NT.posRow(i)); VZ.vec(E('card' + i), c0);
      const joined = Float32Array.from(Array.from({ length: 12 }, (_, k) => Array.from(note(r, i, k))).flat());
      const joinedScale = VZ.p98(joined);
      role(E('joined' + i), joined, 'n', joinedScale);
      role(E('projected' + i), att(r, i), 'o');
      for (let k = 0; k < 12; k++) role(E('lc' + k + '_' + i), note(r, i, k), 'n', joinedScale);
      role(E('n' + i), note(r, i, 0), 'n'); VZ.vec(E('sum' + i), s1); role(E('f' + i), mlp(r, i), 'a'); VZ.vec(E('fin' + i), card(r, i));
    }
    interview();
  }
  // significance, contribution and the note sum for the interviewee q
  function interview() {
    const q = tr.q, w = shares(q), r = tr.room, attention = BEATS[tr.beat][0] === 3;
    const values = Array.from({ length: T }, (_, j) => illustrativeValue(r, j));
    const valueScale = VZ.sharedScale(values);
    const weighted = tr.beat >= B.v;
    E('h-v').innerHTML = '<span class="tr-vh">' + 'Verbal Sketch' + '<small>V: 64 Numbers</small></span>'; E('h-v').style.width = '86px'; // Nov 3: two lines, so it never runs into Note
    for (let j = 0; j < T; j++) {
      const s = E('s' + j); s.textContent = j <= q ? Math.round(w[j] * 100) + '%' : '0%'; s.style.color = VZ.shareCol(w[j]);
      const v = E('v' + j);
      role(v, weighted ? Float32Array.from(values[j], x => x * w[j]) : values[j], 'v', valueScale);
      v.title = j > q && tr.beat >= B.s ? 'Masked: future position contributes 0%' : (weighted ? 'Value × attention percentage' : 'Prepared Value: 64 illustrative numbers');
      // Keep every column in a future token's row grey, using the same causal selection.
      const rowIds = ['t', 'id', 'emb', 'p1', 'pos', 'e1', 'card', 'q', 'k', 's', 'v', 'n', 'nx',
        'joined', 'projected', 'sp', 'se', 'sum', 'sx', 'fp', 'fe', 'f', 'fx', 'fin', 'fnx'].map(k => k + j);
      for (let k = 0; k < 12; k++) rowIds.push('lb' + k + '_' + j, 'l' + k + '_' + j);
      for (let k = 0; k < 11; k++) rowIds.push('concat' + k + '_' + j);
      rowIds.forEach(id => { const el = E(id); if (el) el.classList.toggle('tr-later', attention && j > q); });
      E('t' + j).classList.toggle('tr-me', attention && j === q);
      E('t' + j).style.cursor = attention ? 'pointer' : 'default';
      E('t' + j).style.zIndex = '5';
      E('q' + j).classList.toggle('tr-active-query', attention && j === q);
    }
    role(E('vsumc'), note(r, q, 0), 'n', valueScale); E('vsumw').textContent = `“${W[q]}”`;
    inquiryView();
    arcs();
  }
  function inquiryView() {
    const active=BEATS[tr.beat][0]===3;
    let chart=E('causalBuild');
    if (!chart) { chart=document.createElement('div');chart.id=P+'causalBuild'; E('sc').appendChild(chart); }
    chart.style.cssText='position:absolute;left:875px;top:0;width:400px;font-size:10px;';
    chart.style.display=active?'block':'none';
    E('sc').style.width=SW+'px'; E('sc').style.height=H+'px';
    for(let i=0;i<T;i++) {
      for(const key of ['card','q','k','s','v','n','nx']) { const el=E(key+i); if(el) el.style.visibility=active && (i>tr.q || key==='q' && i!==tr.q || key==='nx')?'hidden':''; }
    }
    if(!active)return;
    const done=tr.beat>=B.n?tr.q:tr.q-1;
    let html='<div style="position:absolute;top:4px;font-weight:bold">Causal Attention · Room '+tr.room+' · Detective 1</div>';
    const cw=400/T;
    W.forEach((w,j)=>{html+='<div style="position:absolute;top:44px;left:'+(j*cw)+'px;width:'+cw+'px;text-align:center;font-size:9px">'+esc(w)+'</div>';});
    for(let i=0;i<T;i++)for(let j=0;j<T;j++){
      const show=i<=done || i===tr.q && tr.beat>=B.s, val=shares(i)[j];
      const color=j>i?'#faeff2':show?VZ.shareCol(val):'#f5f5f5';
      html+='<div style="box-sizing:border-box;position:absolute;top:'+(rowY(i))+'px;left:'+(j*cw)+'px;width:'+(cw-2)+'px;height:28px;display:flex;align-items:center;justify-content:center;border:1px solid color-mix(in srgb, '+color+' 55%, white);border-radius:3px;background:color-mix(in srgb, '+color+' 20%, white);'+(i===tr.q?'font-weight:bold;':'')+'">'+(show?(j<=i?Math.round(val*100):'—'):'')+'</div>';
    }
    chart.innerHTML=html;

  }
  function arcs() {
    const svg = E('svg'); if (!svg) return; const b = BEATS[tr.beat][0], sub = tr.beat;
    let g = '';
    if (b === 3 && sub >= B.s && sub <= B.nx) { // from the interviewee's response to each witness's response, bulging to the right, beside the responses
      const q = tr.q, w = shares(q), x = X.k + 179, y0 = rowY(q) + ROW / 2 - 3;
      for (let j = 0; j < q; j++) { const y = rowY(j) + ROW / 2 - 3, bl = 8 + (q - j) * 5; g += `<path d="M${x} ${y0} C ${x + bl} ${y0}, ${x + bl} ${y}, ${x} ${y}" fill="none" stroke="${VZ.shareCol(w[j])}" stroke-width="${(0.5 + w[j] * 7).toFixed(1)}" stroke-linecap="round" opacity=".9"/>`; }

    }
    if (b === 6) { const y = rowY(LAST) + ROW / 2 - 3; g += `<rect x="${X.card - 4}" y="${rowY(LAST) - 4}" width="296" height="${ROW - 6}" rx="4" fill="none" stroke="#5b38d1" stroke-width="2.5"/><path d="M${X.card + 298} ${y} C ${X.box - 60} ${y}, ${X.box - 70} ${TOP + 60}, ${X.box - 6} ${TOP + 40}" fill="none" stroke="#5b38d1" stroke-width="2" marker-end="url(#${P}ar)"/>`; }
    svg.innerHTML = `<defs><marker id="${P}ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#5b38d1"/></marker></defs>` + g;
  }

  // ---------- where everything sits at each beat ----------
  function layout(bt) {
    const L = {}, set = (id, o) => (L[id] = Object.assign({ x: 0, y: 0, o: 1 }, o)), hide = (id, x, y) => set(id, { x, y, o: 0 });
    const step = BEATS[bt][0], hy = TOP - 30;
    const cols = { id: 0, emb: 0, pos: 0, p1: 0, e1: 0, card: 0, lanes: 0, q: 0, k: 0, s: 0, v: 0, n: 0, nx: 0, sp: 0, lanefill: 0, se: 0, sum: 0, sx: 0, fp: 0, f: 0, fx: 0, fe: 0, fin: 0, fnx: 0 };
    let cardX = X.card, laneW = 68, sumX = X.sum, summaryExamplesX = X.sx, summaryEqualsX = X.se, finX = X.fin, cardO = 1;
    if (bt === B.start) Object.assign(cols, { id: 1, emb: 1, p1: 1, pos: 1, e1: 1, card: 1 }), (cardX = X.inp);
    if (bt === B.fadein) cols.card = 1;
    if (step === 2) Object.assign(cols, { card: 1, lanes: bt === B.stack ? 0 : 1 });
    if (step === 3) { cols.card = 1; cols.q = 1; if (bt >= B.k) cols.k = 1; if (bt >= B.s) cols.s = 1; if (bt >= B.k) cols.v = 1; if (bt >= B.n) cols.n = 1; if (bt >= B.nx) cols.nx = 1; }
    if (step === 4) { laneW = bt >= B.join ? 24 : 40; sumX = 744; summaryExamplesX = 1044; summaryEqualsX = 720; Object.assign(cols, { card: 1, lanes: bt <= B.join ? 1 : 0, lanefill: bt === B.sup1 ? 1 : 12 }); if (bt >= B.sup3) Object.assign(cols, { sp: 1, se: 1, sum: 1, sx: 1 }); if (bt === B.sup4) { Object.assign(cols, { sp: 0, lanes: 0, se: 0, sx: 0 }); sumX = X.card; cardO = 0; } }
    if (step === 5) { Object.assign(cols, { sum: 1, fp: 1, f: 1, fx: 1 }); sumX = X.card; cardO = 0; cols.card = 1; if (bt >= B.f2) Object.assign(cols, { fe: 1, fin: 1, fnx: 1 }); if (bt === B.f3) { Object.assign(cols, { fp: 0, f: 0, fx: 0, fe: 0, fnx: 0, sum: 0 }); finX = X.card; } }
    if (step === 6) { Object.assign(cols, { fin: 1 }); finX = X.card; cardO = 0; cols.card = 1; }
    set('h-joined', { x: 420, y: hy, o: bt === B.join ? 1 : 0 });
    set('h-projected', { x: 420, y: hy, o: bt === B.project || bt === B.sup3 ? 1 : 0 });
    // headers
    set('h-tok', { x: X.tok, y: hy, o: 1 });
    [['id', X.id], ['emb', X.emb], ['pos', X.pos]].forEach(([k, x]) => set('h-' + k, { x, y: hy, o: cols[k] ? 1 : 0 }));
    set('h-card', { x: cardX, y: hy, o: cols.card && cardO ? 1 : 0 });
    // lane headers: each interviewer's line of questioning in the room (step 2); just its number under "Interviewer notes" (step 4).
    // On "focus", lanes 12 → 2 fade away one by one, leaving interviewer 1.
    const fadeDelay = (k) => (bt === B.focus && k > 0 ? (11 - k) * 260 : bt === B.room ? zoomT().ask + k * 40 : 0); // on the zoom: the questions appear once the room has expanded
    for (let k = 0; k < 12; k++) set('h-l' + k, { x: X.lane(k, laneW), y: step === 4 ? hy + 12 : hy - 10, o: (step === 2 && bt !== B.stack && (bt === B.room || k === 0)) || (step === 4 && cols.lanes && bt !== B.join) ? 1 : 0, delay: fadeDelay(k), num: step === 4 });
    // the stack: visible on its own beat. The zoom (Greg, Nov 3): later rooms and the arrows fade → then the earlier rooms fade →
    // then this room's detectives spread out to their places while its box expands → their questions appear → the dashed boxes appear
    const zm = bt === B.room, r = tr.room, Z = zoomT();
    for (let k = 1; k <= 12; k++) {
      const me = k === r, big = me && bt > B.stack; // after the zoom, this room stays expanded until the next beat fades it
      const fadeAt = !zm ? 0 : k > r ? Z.later : Z.prior;
      set('rm' + k, big ? { x: ZOOM.x, y: ZOOM.y, w: ZOOM.w, h: ZOOM.h, o: zm ? 1 : 0, delay: zm ? Z.grow : 0 } : { x: SK.x, y: skY(k), w: SK.w, h: SK.h, o: bt === B.stack ? 1 : 0, delay: fadeAt });
      set('rml' + k, { x: SK.x + 10, y: skY(k) + 5, o: bt === B.stack ? 1 : 0, delay: zm ? (me ? Z.grow : fadeAt) : 0 });
      for (let d = 0; d < 12; d++) {
        const home = { x: SK.x + SK.lw + 4 + d * SLOT, y: skY(k) + 5 };
        if (me && zm) set(`rc${k}_${d}`, { x: X.lane(d, 68) + 37 - CHW / 2, y: hy - 7, o: 0, delay: Z.grow, odelay: Z.ask + d * 40 }); // spread out, then hand over to the header with its question
        else set(`rc${k}_${d}`, { ...home, o: bt === B.stack ? 1 : 0, delay: fadeAt });
      }
    }
    for (let k = 1; k <= 12; k++) set('rx' + k, { x: SK.x + SK.w - 52, y: skY(k) + 5, o: bt === B.stack ? 1 : 0, delay: !zm ? 0 : k > r ? Z.later : k < r ? Z.prior : Z.grow });
    set('zcrew', { x: ZOOM.x + 18, y: ZOOM.y + ZOOM.h - 26, o: zm ? 1 : 0, delay: zm ? Z.boxes + 400 : 0 });
    set('stsvg', { x: 0, y: 0, o: bt === B.stack ? 1 : 0, delay: 0 });
    set('stfan', { x: 0, y: 0, o: bt === B.stack ? 1 : 0, delay: zm ? Z.prior : 0 });
    set('skout', { x: SK.x + SK.w / 2 + 10, y: skY(12) + SK.h + 2, o: bt === B.stack ? 1 : 0 });
    set('h-lanes', { x: X.lane(0, laneW), y: hy - 12, o: step === 4 && cols.lanes && bt !== B.join ? 1 : 0 }); set('h-lanes2', { x: X.lane(0, laneW), y: hy - 22, o: 0 });
    [['q', X.q], ['k', X.k], ['s', X.s - 20], ['v', X.v], ['n', X.n], ['nx', X.nx]].forEach(([k, x]) => set('h-' + k, { x, y: hy, o: cols[k] ? 1 : 0 }));
    set('h-sum', { x: sumX, y: hy, o: cols.sum ? 1 : 0 }); set('h-sx', { x: summaryExamplesX, y: hy, o: cols.sx ? 1 : 0 });
    [['f', X.f], ['fx', X.fx], ['fnx', X.fnx]].forEach(([k, x]) => set('h-' + k, { x, y: hy, o: cols[k] ? 1 : 0 }));
    set('h-fin', { x: finX, y: hy, o: cols.fin ? 1 : 0 });
    for (let i = 0; i < T; i++) {
      const y = rowY(i);
      set('joined' + i, { x: 420, y: y + 4, o: bt === B.join ? 1 : 0, delay: bt === B.join ? 1100 : 0 });
      set('projected' + i, { x: 420, y: y + 4, o: bt === B.project || bt === B.sup3 ? 1 : 0 });
      for (let k = 0; k < 11; k++) set('concat' + k + '_' + i, { x: 420 + k * 40 + 27, y: y + 3, o: bt === B.sup2 ? 1 : 0 });
      set('t' + i, { x: X.tok, y });
      set('id' + i, { x: X.id, y, o: cols.id }); set('emb' + i, { x: X.emb, y: y + 4, o: cols.emb }); set('p1' + i, { x: X.p1, y: y + 2, o: cols.p1 }); set('pos' + i, { x: X.pos, y: y + 4, o: cols.pos }); set('e1' + i, { x: X.e1, y: y + 2, o: cols.e1 });
      set('card' + i, { x: cardX, y: y + 4, o: cols.card ? cardO : 0 });
      for (let k = 0; k < 12; k++) {
        const filled = step === 4 && k < cols.lanefill, lx = X.lane(k, laneW) + (step === 4 ? 0 : 12); // the box sits centered under its interviewer's colored bar
        const on = cols.lanes && !(step === 2 && bt === B.focus && k > 0);
        // the dotted box stays put; the note's picture flies in on top of it
        set('lb' + k + '_' + i, { x: lx, y: y + 4, o: on && bt !== B.join ? 1 : 0, delay: bt === B.focus ? fadeDelay(k) : bt === B.room ? zoomT().boxes + k * 40 + i * 12 : 0 });
        set('l' + k + '_' + i, { x: lx, y: y + 4, o: on && filled && bt !== B.join ? 1 : 0, retireAfterMove: bt === B.join, cls: bt === B.join ? 'joined' : 'full', delay: bt === B.sup2 && k > 0 ? (k - 1) * 140 : 0,
          from: bt === B.sup1 && k === 0 ? { x: X.n, y: y + 4, o: 1 } : bt === B.sup2 && k > 0 ? { x: SW + 40, y: y + 4, o: 1 } : null });
      }
      set('q' + i, { x: X.q, y, o: cols.q && i === tr.q ? 1 : 0 }); set('k' + i, { x: X.k, y, o: cols.k }); set('s' + i, { x: X.s, y, o: cols.s });
      set('v' + i, { x: X.v, y: y + 4, o: cols.v ? 1 : 0 }); set('n' + i, { x: X.n, y: y + 4, o: step === 3 && (i < tr.q || (i === tr.q && bt >= B.n)) ? 1 : 0, from: bt === B.n && i === tr.q ? { x: X.v + 120, y: rowY(T) + 6, o: 1 } : null, delay: bt === B.n && i !== tr.q ? 500 : 0 });
      set('nx' + i, { x: X.nx, y, o: 0 });
      set('sp' + i, { x: X.sp, y: y + 2, o: cols.sp }); set('se' + i, { x: summaryEqualsX, y: y + 2, o: cols.se });
      set('sum' + i, { x: sumX, y: y + 4, o: cols.sum, delay: bt === B.sup3 ? 300 : 0 }); set('sx' + i, { x: summaryExamplesX, y, o: cols.sx, delay: bt === B.sup3 ? 700 : 0 });
      set('fp' + i, { x: X.fp, y: y + 2, o: cols.fp });
      const fromPanel = bt === B.f1 ? { x: X.panel, y: TOP + 40, o: 1 } : null;
      set('f' + i, { x: X.f, y: y + 4, o: cols.f, from: fromPanel, delay: bt === B.f1 ? i * 160 : 0 }); set('fx' + i, { x: X.fx, y, o: cols.fx, from: fromPanel, delay: bt === B.f1 ? i * 160 : 0 });
      set('fe' + i, { x: X.fe, y: y + 2, o: cols.fe }); set('fin' + i, { x: finX, y: y + 4, o: cols.fin ? (step === 6 && i !== LAST ? 0.45 : 1) : 0, delay: bt === B.f2 ? 200 : 0 }); set('fnx' + i, { x: X.fnx, y, o: cols.fnx, delay: bt === B.f2 ? 600 : 0 });
    }
    set('tot', { x: X.s - 6, y: rowY(T), o: cols.s }); set('akey', { x: X.k, y: rowY(T) + 2, o: cols.s ? 1 : 0 }); set('vsum', { x: X.v - 120, y: rowY(T) + 26, o: cols.v && bt === B.v ? 1 : 0 });
    set('panel', { x: X.panel, y: TOP - 4, o: step === 5 && bt < B.f2 ? 1 : 0 }); // Nov 3: gone before the Final Case File examples need its place
    set('box', { x: X.box, y: TOP - 34, o: step === 6 ? 1 : 0 });
    if(step===3){
      const positions={card:85,q:390,k:510,s:665,v:730,n:815};
      for(const [key,x] of Object.entries(positions)){
        if(L['h-'+key])L['h-'+key].x=x;
        for(let i=0;i<T;i++)if(L[key+i])L[key+i].x=x;
      }
      for(const key of ['q','k']){E('h-'+key).style.width=(key==='q'?115:145)+'px';for(let i=0;i<T;i++){E(key+i).style.width=(key==='q'?115:145)+'px';E(key+i).style.fontSize='11px';}}
      E('h-n').style.width='58px';E('h-n').innerHTML='Detective Note<small>64 Numbers</small>';E('h-n').style.color='#218343';
      L.tot.x=665;L.tot.y=rowY(tr.q+1)+2;
      L.akey.x=390;L.akey.y=rowY(tr.q+1)+2;
      L.vsum.x=610;L.vsum.y=rowY(tr.q+1)+32;
      for(const key of ['v','n']) {
        const width=parseFloat(E('h-'+key).style.width);
        for(let i=0;i<T;i++) L[key+i].x=positions[key]+(width-E(key+i).offsetWidth)/2;
      }
      // Start at the actual canvas, not the text container that precedes it.
      if(L['n'+tr.q].from){
        const source=E('vsumc').getBoundingClientRect(), scene=E('sc').getBoundingClientRect();
        const scale=scene.width/E('sc').offsetWidth;
        L['n'+tr.q].from={x:(source.left-scene.left)/scale,y:(source.top-scene.top)/scale,o:1};
      }
      E('vsum').style.borderTop='none';
      E('tot').style.borderTop='2px solid #218343';
      E('tot').style.paddingTop='3px';
      if(L['h-nx'])L['h-nx'].o=0;
    }
    return L;
  }
  function apply(L, dur) {
    Object.entries(L).forEach(([id, p]) => {
      const el = E(id); if (!el) return;
      if (p.cls) { el.classList.toggle('full', p.cls === 'full' || p.cls === 'joined'); el.classList.toggle('empty', p.cls === 'empty'); }
      if (p.num !== undefined) el.classList.toggle('num', !!p.num);
      if (el._dl && !(dur && p.delay)) { el.style.transition = 'none'; el.style.opacity = getComputedStyle(el).opacity; void el.offsetWidth; } // cancel a long delayed fade from the last beat
      el._dl = dur ? p.delay || 0 : 0;
      const put = (q, d, dl = 0) => {
        const wh = q.w != null ? `, width ${d}ms cubic-bezier(.45,.05,.25,1) ${dl}ms, height ${d}ms cubic-bezier(.45,.05,.25,1) ${dl}ms` : '';
        el.style.transition = d ? `transform ${d}ms cubic-bezier(.45,.05,.25,1) ${dl}ms, opacity ${Math.round(d * 0.6)}ms ${p.odelay != null ? p.odelay : p.retireAfterMove ? d : q.w != null && q.o ? 0 : dl}ms${wh}` : 'none';
        el.style.transform = `translate(${q.x}px,${q.y}px)`; if (q.o !== null && q.o !== undefined) el.style.opacity = q.o;
        if (q.w != null) { el.style.width = q.w + 'px'; el.style.height = q.h + 'px'; }
      };
      const tok = (el._tok = (el._tok || 0) + 1); // a newer beat always wins over an animation still waiting to start
      if (p.from && dur) { put(p.from, 0); void el.offsetWidth; requestAnimationFrame(() => { if (el._tok === tok) put(p, dur, p.delay || 0); }); } else put(p, dur, dur ? p.delay || 0 : 0);
    });
  }

  // ---------- "What is known" box ----------
  function knownBox() {
    const b = tr.room, E2 = tr.ctx, box = E('box'); if (!box) return;
    if (!E2 || !E2.lg || !E2.lg[b]) { box.innerHTML = '<div class="muted">GPT-2’s scores after each room are stored for the story sentence.</div>'; return; }
    const pm = new Map((E2.lens[b] || []).map(([id, p]) => [id, p])), L = E2.lg[b];
    const pr = { ids: L.map(([id]) => id), logits: L.map(([, l]) => l), p: L.map(([id]) => pm.get(id) || 0), K: L.length };
    const r = riverRank(b) || RIVER_RANK[b];
    box.innerHTML = `<div class="rk-tt">If GPT-2 stopped here, after block ${b}, this Case File for “the”…</div>${VZ.vecHTML(P + 'bv', 'rk-vec')}<div class="rk-tt">…would list these tokens next: <span class="tr-real">real GPT-2</span></div>${VZ.rankTable(pr, NT.ALL, { n: 5, prob: false, more: false, mark: (i) => (pr.ids[i] === RIVER ? 'tr-river' : '') })}<div class="tr-rline">“river” would be <b>#${r.toLocaleString('en-US')}</b>${b === 1 ? ' (before block 1 it was #15,818)' : ''}</div>
      ${b < 12 ? `<div class="tr-hint">Next: block ${b + 1} starts with these Case Files and does it all again.</div>` : `<div class="tr-hint">That was block 12, the last one. This final Case File for “the” is what the Output tab scores against every token. <button class="btn small" id="trPick">Output ›</button></div>`}`;
    VZ.vec(E('bv'), card(b, LAST));
    if ($('#trPick')) $('#trPick').onclick = () => NT.goTab('pick');
  }

  // ---------- the page ----------
  NT.stations.tfroom = {
    async init() {
      pause();
      if (NT.current().text !== NT.EX[STORY].text) { this.switching = true; NT.setText(NT.EX[STORY].text, 'edit'); this.switching = false; }
      st().innerHTML = `<section class="panel tr-panel"><div class="tr-head"><div class="fl-ctl"><button class="btn" id="trRew" title="Start over">⏮</button><button class="btn" id="trBack">◀ Back</button><button class="btn primary" id="trNext">Next ▶</button><button class="btn" id="trPlay">▶ Play</button><label class="delay" hidden>Speed <input type="range" id="trSpeed" min="0" max="4" value="${tr.sp == null ? 2 : tr.sp}"></label></div></div>
        <div class="fl-cap fixed" id="trCap"></div><div class="fl-box" id="trBox"></div>
        <div class="tr-legend">Story text and detective specialties are <span class="tr-an">illustrative</span>. Attention percentages, Verbal Sketches, Notes, Case Files and block updates use stored GPT-2 vectors. <b>How it really works</b> shows actual Q/K/V calculations. Vector proportions and role colors match the technical view; scenes use different zoom levels.</div>
        <div id="trReally"></div></section>`;
      NT.guideRow(st().querySelector('.tr-panel'));
      if (NT.really) NT.really.mount($('#trReally')); // "How it really works": the real GPT-2 operations behind the current step
      $('#trRew').onclick = () => { pause(); tr.room = 1; tr.beat = 0; tr.q = 0; rebuild(false); };
      $('#trBack').onclick = () => { pause(); back(); };
      $('#trNext').onclick = () => { pause(); if (!tr.busy) next(); };
      $('#trPlay').onclick = () => (tr.playing ? pause() : play());
      $('#trSpeed').oninput = (e) => { tr.sp = +e.target.value; };
      $('#trBox').innerHTML = NT.pendingHTML('Getting GPT-2’s numbers for the story…');
      await loadData();
      if (S.station === 'tfroom') rebuild(false);
    },
    onText() { if (NT.stations.tfroom.switching) return; NT.stations.tfroom.init(); },
    onTK() {},
    // Nov 4: used only by the checks (js/checks.js) to know the current scene and to jump to one
    scene: { beats: () => BEATS, now: () => tr.beat, ready: () => !!E('sc'), seek(i) { if (!E('sc')) return false; pause(); tr.room = 1; tr.beat = i; tr.q = 0; rebuild(false); return true; } },
    // a token clicked in the story, or in How it really works (screen = the HIRW screen showing, fromHirw = HIRW is leading)
    selectAttentionToken(i, screen = null, fromHirw = false) {
      if (screen == null) { if (BEATS[tr.beat][0] !== 3) return; pause(); tr.q = i; go(tr.beat, false); return; }
      if (screen < 2 || screen > 9) return;
      pause(); tr.q = i;
      const M = NT.really.MAP, keep = (M[BEATS[tr.beat][1]] || []).includes(screen);
      go(keep ? tr.beat : B[{ 2: 'q', 3: 'k', 4: 'k', 5: 'k', 6: 's', 7: 's', 8: 'v', 9: 'n' }[screen]], false, screen, fromHirw);
    },
    // ---------- How it really works leads: it steps through its screens, and the story moves to the matching beat (Nov 3) ----------
    // one walk through a room, HIRW screen by screen (0 = its 12-block stack view); each screen is paired with the story beat it belongs to
    hirwStep(dir) {
      const seq = hirwSeq(), i = hirwIdx(seq), j = i + dir;
      if (j >= 0 && j < seq.length) { pause(); toHirw(seq[j]); return true; }
      if (dir > 0 && tr.room < 12) { pause(); if (!tr.busy) next(); return true; } // past screen 14: the next room
      if (dir < 0 && !(tr.room === 1 && tr.beat === B.start)) { pause(); back(); return true; }
      return false;
    },
    state: () => ({ key: BEATS[tr.beat][1], room: tr.room, q: tr.q, attentionThrough: BEATS[tr.beat][0]===3 ? (tr.beat>=B.s?tr.q:tr.q-1) : LAST, notesThrough: BEATS[tr.beat][0]===3 ? (tr.beat>=B.n?tr.q:tr.q-1) : LAST }), // for checks: where the story is
    hirwCan(dir) { const seq = hirwSeq(), j = hirwIdx(seq) + dir; return (j >= 0 && j < seq.length) || (dir > 0 ? tr.room < 12 : !(tr.room === 1 && tr.beat === B.start)); },
    // a numbered screen chosen in HIRW: stay on this beat if it already shows that screen, otherwise go to the nearest beat that does
    followHirw(sc) {
      const M = NT.really.MAP; pause();
      if ((M[BEATS[tr.beat][1]] || []).includes(sc)) { toHirw({ b: tr.beat, s: sc }); return; }
      const seq = hirwSeq(), i = hirwIdx(seq); let best = null;
      seq.forEach((e, j) => { if (e.s === sc && (!best || Math.abs(j - i) < Math.abs(best.j - i))) best = { ...e, j }; });
      if (best) toHirw(best);
    },
  };
  // the HIRW walk for this room: [beat, screen] pairs; Room 1 begins at the Input step, later rooms at the stack
  const HSEQ = [['start', 1], ['stack', 0], ['room', 1], ['q', 2], ['k', 3], ['k', 4], ['k', 5], ['s', 6], ['s', 7], ['v', 8], ['n', 9], ['sup1', 10], ['project', 11], ['f1', 12], ['f2', 13], ['f3', 14]];
  const hirwSeq = () => HSEQ.filter(([k]) => tr.room === 1 || k !== 'start').map(([k, sc]) => ({ b: B[k], s: sc }));
  // where the pair (current beat, screen HIRW shows) sits in that walk; otherwise the last pair at or before the current beat
  function hirwIdx(seq) {
    const shown = NT.really.shown(); let k = seq.findIndex((e) => e.b === tr.beat && e.s === shown);
    if (k < 0) seq.forEach((e, j) => { if (e.b <= tr.beat) k = j; });
    return Math.max(0, k);
  }
  function toHirw(e) { if (e.b === tr.beat) NT.really.sync(BEATS[e.b][1], tr.room, tr.q, spd(), true, e.s, true); else go(e.b, true, e.s, true); }
  const spd = () => [0.5, 0.75, 1, 1.5, 2][tr.sp == null ? 2 : tr.sp];
  const ms = (x) => Math.round(x / spd());
  function rebuild(animate, carry) {
    const box = $('#trBox'); if (!box) return;
    box.innerHTML = build(); paintVecs(); fit(); wire();
    if (carry) { // coming from "What is known": the scene looks exactly as it was left, then the 12 interviewers fade in and their topics flip
      const L = layout(tr.beat), L0 = {};
      Object.entries(L).forEach(([id, q]) => { L0[id] = Object.assign({}, q, { from: null, delay: 0 }, /^(l\d|lb\d|h-l\d)/.test(id) ? { o: 0 } : {}); });
      apply(L0, 0);
      requestAnimationFrame(() => requestAnimationFrame(() => { if (E('sc')) go(tr.beat, true); }));
      return;
    }
    go(tr.beat, animate);
  }
  // "What is known" → the next block, without redrawing the screen: the final descriptions brighten, the box, its arrow and the frame fade,
  // and their header becomes "Information Cards from Room r"; then the new room's interviewers fade in (rebuild with carry)
  function toNextRoom() {
    const r = tr.room, d = ms(700);
    const fade = (el) => { if (el) { el.style.transition = `opacity ${d}ms`; el.style.opacity = 0; } };
    fade(E('box')); fade(E('svg'));
    for (let i = 0; i < T; i++) { const f = E('fin' + i); if (f) { f.style.transition = `opacity ${d}ms`; f.style.opacity = 1; } }
    const h = E('h-fin'); if (h) { h.style.transition = `opacity ${Math.round(d / 2)}ms`; h.style.opacity = 0; setTimeout(() => { if (!h.isConnected) return; h.innerHTML = `🪪 Case Files <small>from Room ${r}</small>`; h.style.opacity = 1; }, Math.round(d / 2)); }
    tr.busy = true;
    setTimeout(() => { tr.busy = false; if (S.station !== 'tfroom' || tr.room !== r) return; tr.room = r + 1; tr.beat = B.stack; rebuild(true, true); }, d + ms(250));
  }
  function flipTopics(from, to, wait = 500) {
    const a = topics(from), b = topics(to);
    for (let k = 0; k < 12; k++) {
      const chip = E('h-l' + k) && E('h-l' + k).querySelector('.tr-topic i'), card = chip && chip.parentNode; if (!card) continue;
      chip.textContent = a[k];
      setTimeout(() => { if (!card.isConnected) return; card.classList.add('flip'); setTimeout(() => { if (card.isConnected) chip.textContent = b[k]; }, ms(260)); setTimeout(() => card.classList.remove('flip'), ms(560)); }, ms(wait + k * 110));
    }
  }
  function wire() {
    for (let i = 0; i < T; i++) E('t' + i).onclick = () => NT.stations.tfroom.selectAttentionToken(i); // redraw in place: shares, arcs, caption
  }
  function fit() {
    const box = $('#trBox'), sc = E('sc'); if (!box || !sc) return;
    const top = box.getBoundingClientRect().top + window.scrollY, avail = window.innerHeight - top - 10; // fit the width and the height left on screen
    const width=SW, height=H;
    const k = Math.max(0.5, Math.min(1.25, box.clientWidth / width, avail > 250 ? avail / H : 9)); sc.style.transform = `translate(${Math.max(0, (box.clientWidth - width * k) / 2)}px,0) scale(${k})`; box.style.height = Math.ceil(height * k) + 'px';
  }
  window.addEventListener('resize', () => { if (S.station === 'tfroom') fit(); });
  function go(bt, animate, screen = null, fromHirw = false) {
    if (bt === B.q && BEATS[tr.beat][0] !== 3) tr.q=0;
    tr.beat = bt;
    const step = BEATS[bt][0];
    apply(layout(bt), animate ? ms(bt === B.sup2 ? 900 : bt === B.focus ? 700 : 1100) : 0);
    cardHeader(bt, animate);
    { const rm = E('rm' + tr.room); if (rm) { clearTimeout(rm._wt); if (bt !== B.room) rm.classList.remove('white'); else if (!animate) rm.classList.add('white'); else { rm.classList.remove('white'); rm._wt = setTimeout(() => rm.classList.add('white'), zoomT().ask + ms(400)); } } }
    { const f = E('stfan'); if (f) { f.classList.remove('draw'); if (animate && bt === B.stack) { void f.getBoundingClientRect(); f.classList.add('draw'); } } }
    interview(); // significance, contribution (only from its own beat on) and arcs
    fit(); arcs(); if (step === 6) knownBox();
    const fill = (t) => t.replace(/\{p\}/g, tr.room - 1).replace(/\{left\}/g, 13 - tr.room).replace(/\{r\}/g, tr.room).replace(/\{q\}/g, W[tr.q]).replace('{topic}', TH()[0]).replace('{next}', tr.room < 12 ? `They leave room ${tr.room} and become room ${tr.room + 1}’s starting Case Files.` : 'This was room 12, the last room.');
    const capT = tr.room > 1 && LATER_CAP[BEATS[bt][1]] || [BEATS[bt][2], BEATS[bt][3]];
    if (step===3 && bt===B.q) capT[0]='Given what you currently know about the case, what information about “'+TH()[0].replace(/\?$/, '')+'” would help us work out what comes next?';
    $('#trCap').innerHTML = `<div class="fl-ch"><b>${fill(capT[0])}</b></div><div class="fl-cd">${fill(capT[1])}</div>`;
    // the steps are the sub-tabs: chevrons right under the main tabs, then the block counter and a jump to the next block
    const subs = $('#subtabs');
    if (subs) {
      subs.innerHTML = STEPS.map(([s, , l]) => `<button class="sub ${s === step ? 'on' : s < step ? 'done' : ''}" data-s="${s}" aria-pressed="${s === step}" ${tr.room > 1 && s === 1 ? 'disabled' : ''}>${l}</button>`).join('')
        + `<div class="tr-blk"><span class="tr-room">Block ${tr.room} of 12</span>${tr.room < 12 ? `<button class="btn small" id="trSkip" title="Jump to the next block">⏭ Block ${tr.room + 1}</button>` : ''}</div>`;
      subs.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { pause(); const i = BEATS.findIndex(([s]) => s === +b.dataset.s); go(i, true); }));
      if ($('#trSkip')) $('#trSkip').onclick = () => { pause(); tr.room++; tr.beat = B.stack; rebuild(true); };
    }
    if (step !== 1) NT.setWho(false); NT.whoToggle(); // "On this page" folds away after the first step, to save room
    if (NT.really) NT.really.sync(BEATS[bt][1], tr.room, tr.q, spd(), animate, screen, fromHirw); // the story and How it really works always move together
    const b = $('#trBack'); if (b) b.disabled = tr.room === 1 && bt === B.start;
    const n = $('#trNext'); if (n) n.disabled = tr.room === 12 && bt === BEATS.length - 1;
    NT.setStatus(`Block ${tr.room} of 12 · ${STEPS[step - 1][2]}`);
  }
  // the Case File column's header: on the very first screen it is the Input Vector (Case File); once it slides over, the Case File (Input Vector: 768 Numbers)
  function cardHeader(bt, animate) {
    const hdr = E('h-card'); if (!hdr) return;
    hdr.style.width = '288px';
    const html = tr.room === 1 && bt === B.start ? 'Input Vector<small>(Case File)</small>' : (tr.room === 1 ? '🪪 Case File<small>Input Vector' : `🪪 Revised Case File after Room ${tr.room - 1}<small>Block ${tr.room - 1} Output`) + ': 768 Numbers</small>';
    if (hdr.innerHTML === html) return;
    if (!animate) { hdr.innerHTML = html; return; }
    hdr.classList.add('tr-swap'); // fade out, swap the words while it slides, fade back in
    setTimeout(() => { if (!hdr.isConnected) return; hdr.innerHTML = html; hdr.classList.remove('tr-swap'); }, ms(350));
  }
  function runInquiry() {
    go(B.q,true);
    let ix=0;
    const phases=[B.k,B.s,B.v,B.n,B.nx];
    const tick=()=>{tr.inquiryTimer=setTimeout(()=>{go(phases[ix++],true);if(ix<phases.length)tick();else tr.inquiryTimer=null;},ms(1700));};tick();
    return true;
  }
  function next() {
    if(tr.inquiryTimer) return true;
    if(tr.beat===B.focus){tr.q=0;return runInquiry();}
    if (tr.beat === B.nx && tr.q < LAST) { tr.q++; return runInquiry(); }
    if (tr.beat < BEATS.length - 1) { go(tr.beat + 1, true); return true; }
    if (tr.room < 12) { toNextRoom(); return true; } // 7) return to 2) for the next room, in place
    return false;
  }
  function back() {
    if(tr.beat===B.q && tr.q>0){tr.q--;go(B.nx,false);return;}
    const first = tr.room === 1 ? B.start : B.stack;
    if (tr.beat > first) { go(tr.beat - 1, false); return; }
    if (tr.room > 1) { tr.room--; tr.beat = BEATS.length - 1; rebuild(false); }
  }
  function play() { tr.playing = true; syncPlay(); const tick = () => { tr.timer = setTimeout(() => { if (!tr.playing || S.station !== 'tfroom') return; if (next()) tick(); else pause(); }, ms(BEATS[tr.beat][0] === 6 ? 3600 : tr.beat === B.focus ? 4200 : tr.beat === B.stack ? 4000 : tr.beat === B.room ? 2400 + zoomT().end * spd() : 2600)); }; tick(); }
  function pause() { clearTimeout(tr.inquiryTimer); tr.inquiryTimer=null; tr.playing = false; clearTimeout(tr.timer); syncPlay(); }
  function syncPlay() { const p = $('#trPlay'); if (p) p.textContent = tr.playing ? '⏸ Pause' : '▶ Play'; }
})();
