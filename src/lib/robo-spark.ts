// Robo Spark: the run of show, the judging checklist and all 60 missions, in one place.
// The deck (/events/robo-spark/present), the missions page and the judge page all read from here.
// Missions 1 to 50 come from the Robo Spark Judge Guide. Missions 51 to 60 were added so every team has its own.

export type Mission = {
  n: number;
  title: string;
  card: string; // the line copied word for word onto the front of the card
  means: string; // what it means, in plain words
  ticks: [string, string, string, string]; // ticks 7, 8, 9 and 10 (10 is the trap avoided)
  ask: string; // one question to ask on stage
};

/** Team N gets mission card N. */
export const TEAM_COUNT = 60;

/** The run of show, as it appears on the "Today's route" slide. */
export const route = [
  { name: "Club intro", at: "11:54" },
  { name: "Meet your group", at: "12:00" },
  { name: "The challenge", at: "12:05" },
  { name: "Shortlist", at: "12:28" },
  { name: "On stage", at: "12:33" },
  { name: "Wrap up", at: "12:53" },
];

export const ICEBREAKER_MINUTES = 5;
export const DISCUSSION_MINUTES = 20;
export const STAGE_TEAMS = 5;

/** Ticks 1 to 6, the same for every team. */
export const commonTicks = [
  {
    n: 1,
    tick: "The back of the card shows the team number and mission number",
    yes: '"Team 23, Mission 23" at the top',
  },
  {
    n: 2,
    tick: "They say who has the problem",
    yes: '"An old man living alone", not just "people"',
  },
  {
    n: 3,
    tick: "Their idea fits in one clear sentence",
    yes: '"A small robot that rolls on the farm and tells the farmer which plants are dry"',
  },
  {
    n: 4,
    tick: "They say what the robot senses",
    yes: '"It has a soil moisture sensor" or "a camera sees cracks"',
  },
  {
    n: 5,
    tick: "They say what the robot does",
    yes: '"It sends an alarm", "it picks up the bottle", "it sprays water"',
  },
  {
    n: 6,
    tick: "At least 4 members spoke or wrote",
    yes: "You saw most of the team join in, not one person doing everything",
  },
] as const;

/** Every robot idea has the same four parts. */
export const robotParts = [
  {
    part: "Senses",
    plain: "How the robot knows what is happening around it",
    say: "camera, microphone, touch or pressure sensor, temperature sensor, distance sensor, gas sensor, moisture sensor, GPS, a button the person presses",
  },
  {
    part: "Thinks",
    plain: "The brain that decides what to do",
    say: 'a small computer or chip, a program, a phone app, rules like "if the floor is wet, slow down"',
  },
  {
    part: "Acts",
    plain: "What it physically does",
    say: "wheels, legs, arms, grippers, propellers (drone), pumps, sprayers, speakers, lights, vibration",
  },
  {
    part: "Power",
    plain: "What keeps it running",
    say: "battery, solar panel, charging dock, plugged into the wall",
  },
] as const;

export const judgeTimeline = [
  {
    at: "11:30",
    what: "Open this page on your phone, enter the judge passcode and your name. Collect a pen and your team numbers from the head judge.",
  },
  {
    at: "12:04",
    what: "Stand near your teams while the card team hands out the mission cards. Read their missions below: it takes 2 minutes.",
  },
  {
    at: "12:08",
    what: "Discussion starts. Walk between your teams, listen, and tick the checklist on the Score page.",
  },
  {
    at: "12:23",
    what: "5 minutes left. Read the back of each card as it fills up and add the ticks you missed.",
  },
  {
    at: "12:28",
    what: "Cards in. Check every team you watched is saved. The ranking picks the top teams for the stage.",
  },
  {
    at: "12:33",
    what: "Sit near the stage. A head judge may ask you to put one question to a team.",
  },
] as const;

export const judgeSteps = [
  "Before 12:08, read the missions of your teams on this page. It tells you what to listen for.",
  "Stand a little behind the team so they forget you are there. Do not sit with them.",
  "Listen for the 4 robot parts: senses, thinks, acts, power. Tick 4 and 5 as soon as you hear them.",
  "Watch who talks. If one person does everything for 10 minutes, tick 6 stays empty.",
  "From 12:23, read the back of the card. Ticks 1, 3 and 7 to 10 usually show up there.",
  "Press Save after every change. You can come back to a team and change its ticks until the head judge closes scoring.",
  "If your phone or the network fails, write the ticks on paper and give them to the head judge.",
] as const;

export const judgeDo = [
  "Smile, and keep the room friendly. This is the students' first club event.",
  'Remind a team kindly if a phone comes out: "Phones away for now, please."',
  'Answer questions about the rules, like "can we draw?" (yes) or "how long is left?"',
  "Judge the thinking, not English or handwriting.",
] as const;

export const judgeDont = [
  'Don\'t give ideas, hints or examples, even if a team is stuck. Say "Think about who has this problem."',
  "Don't take anyone's phone or raise your voice.",
  "Don't use your phone for anything except this page and the time.",
  "Don't tell a team its score, or show them your screen.",
] as const;

export const judgeIfThen = [
  {
    when: "A team says it does not understand its mission",
    then: 'Read the card with them, then ask: "Who has this problem, and what is hard for them?" Nothing more.',
  },
  {
    when: "A team finishes early",
    then: 'Ask: "What could go wrong with your robot?" They can add it under "hardest part".',
  },
  {
    when: "A team has only 3 people",
    then: "Judge it normally. For tick 6, all 3 must take part.",
  },
  {
    when: "Two of your teams have very different energy",
    then: "Score each against the checklist only, never against each other.",
  },
  {
    when: "A team copies the next team",
    then: "Neighbours have different missions, so a copied idea will miss ticks 7 to 10 on its own.",
  },
  {
    when: "You are unsure about a tick",
    then: "Leave it empty. Only tick what you clearly heard or read.",
  },
  {
    when: "Two teams tie for the last stage place",
    then: "The head judge picks the team whose idea you could explain to a friend after hearing it once. Still tied? The team where more members took part.",
  },
] as const;

export const cardMaking = [
  "Team N gets mission N, so card 17 goes to team 17. Neighbouring teams always get different missions.",
  "Use half an A4 sheet or bigger, so the back has room to write.",
  'Front: the mission number in big letters, then the "On the card" line, copied word for word.',
  "Back: draw 5 short lines labelled: Team and mission number, Our idea in one line, How it works (senses and does), Who it helps and why, The hardest part.",
  "Split the writing: 10 coordinators write 6 cards each, about 15 minutes per person.",
  "Put each card, face down, with a pen on the first seat of its block before the hall opens.",
] as const;

const m = (
  n: number,
  title: string,
  card: string,
  means: string,
  ticks: Mission["ticks"],
  ask: string,
): Mission => ({ n, title, card, means, ticks, ask });

export const missions: Mission[] = [
  m(
    1,
    "Elder care",
    "Help an elderly person who lives alone stay safe at home.",
    "An old person living alone can fall, forget medicine, or need help with nobody nearby.",
    [
      "It notices a fall, or no movement for a long time.",
      "It alerts family, a neighbour or an ambulance.",
      "It is very easy for an old person to use: a big button, voice, or nothing to do at all.",
      "It does not depend on the old person using a smartphone app.",
    ],
    "What happens if the person falls at night?",
  ),
  m(
    2,
    "Waste sorter",
    "Sort campus garbage into wet, dry and recyclable waste.",
    "People throw all waste in one bin, so recycling never happens.",
    [
      "It tells waste types apart, for example with a camera, weight or a metal sensor.",
      "It moves each item into the right bin or section.",
      "They say what happens next: who empties it and where each type goes.",
      "It does not need people to sort the waste first.",
    ],
    "What does your robot do with a wet plastic packet?",
  ),
  m(
    3,
    "Flood rescue",
    "Find people stranded on rooftops after a flood and help them.",
    "In floods, people wait on roofs for hours and rescuers don't know where they are.",
    [
      "It can move over water or fly, like a boat robot or a drone.",
      "It finds people, for example with a camera, heat sensing or sound.",
      "It sends the location to rescuers, or drops food, water or a life jacket.",
      "It still works without mobile network or internet.",
    ],
    "How does your robot work in heavy rain?",
  ),
  m(
    4,
    "Collapsed building",
    "Find people trapped under a collapsed building.",
    "After an earthquake, people are stuck under rubble and every hour matters.",
    [
      "It is small or snake-like enough to get into gaps.",
      "It detects life: body heat, breathing sound, voice or movement.",
      "It tells rescuers the exact spot, or lets them talk to the trapped person.",
      "It does not try to lift the whole building by itself.",
    ],
    "How does the robot find its way back out?",
  ),
  m(
    5,
    "Hospital helper",
    "Carry medicines and food to patients in a busy hospital.",
    "Nurses spend a lot of time walking and carrying instead of caring for patients.",
    [
      "It moves safely around people, beds and wheelchairs in corridors.",
      "It delivers to the right patient, using a room number, scan or code.",
      "It keeps things clean and locked so only the right person takes the medicine.",
      "It helps nurses and doctors. It does not replace them.",
    ],
    "What if two patients have the same name?",
  ),
  m(
    6,
    "Blind assist",
    "Help a blind person cross a busy road safely.",
    "A blind person cannot see the signal, gaps in traffic, or holes in the road.",
    [
      "It detects vehicles and obstacles, with a camera or distance sensor.",
      "It tells the person by vibration, a handle that pulls, or sound.",
      "It is light and easy to carry or wear: a stick, belt, shoes or a guide robot.",
      "It does not rely only on voice messages, which are hard to hear on a noisy road.",
    ],
    "How does it know when the signal turns green?",
  ),
  m(
    7,
    "Bridge inspector",
    "Check an old bridge for cracks without sending a person underneath.",
    "Checking under bridges is slow and dangerous for workers.",
    [
      "It reaches hard places by flying, climbing or hanging on a cable.",
      "It spots cracks or rust, with a camera or by tapping and listening.",
      "It reports where the damage is, with photos, so engineers can act.",
      "They think about wind, rain or traffic on the bridge.",
    ],
    "Who looks at what the robot finds?",
  ),
  m(
    8,
    "Campus guide",
    "Guide new students and visitors around our campus.",
    "New people get lost and do not know where offices, labs or canteens are.",
    [
      "It knows the campus map and where the person wants to go.",
      "It leads the way or shows directions clearly.",
      "It talks in more than one language, or works for someone who cannot read.",
      "It is safe in crowds and does not block corridors or stairs.",
    ],
    "How does someone call the robot?",
  ),
  m(
    9,
    "Water cleanup",
    "Remove floating plastic from a lake.",
    "Plastic bottles and covers float on lakes and harm fish and birds.",
    [
      "It floats and moves on water.",
      "It collects plastic with a net, a belt or a scoop, and stores it.",
      "They say how it is powered and emptied, for example solar and a return dock.",
      "It does not hurt fish, birds or plants.",
    ],
    "How does it know plastic from a leaf?",
  ),
  m(
    10,
    "Village tutor",
    "Help children in a village school learn when there are not enough teachers.",
    "One teacher may handle many classes, so children get little attention.",
    [
      "It is friendly and simple for small children.",
      "It works with weak or no internet.",
      "It speaks the local language, like Kannada.",
      "The teacher stays in charge. The robot helps, it does not replace the teacher.",
    ],
    "How does it know a child did not understand?",
  ),
  m(
    11,
    "Space junk",
    "Clear broken satellites and junk from space around Earth.",
    "Old satellite pieces fly around Earth very fast and can smash working satellites.",
    [
      "It finds and follows a piece of junk, using a camera or radar.",
      "It catches it with a net, an arm, a magnet or a harpoon.",
      "It gets rid of it, for example by pushing it down to burn up in the air.",
      "They remember there is no air and no gravity to hold things, so the robot must not break the junk into more pieces.",
    ],
    "How does your robot get its power in space?",
  ),
  m(
    12,
    "Forest fire watch",
    "Spot a forest fire early and warn people.",
    "Fires in forests spread before anyone sees them, and by then they are hard to stop.",
    [
      "It watches large areas, for example a drone or towers with cameras.",
      "It detects fire or smoke with heat, smoke or a camera.",
      "It sends the exact location to forest officers or fire services quickly.",
      "It can tell a real fire from a cooking fire or sunlight.",
    ],
    "How does the warning reach people with no internet?",
  ),
  m(
    13,
    "Drain cleaner",
    "Clean blocked drains so that no person has to go inside.",
    "People still go down into dirty, dangerous drains by hand. Some die from toxic gas.",
    [
      "It goes inside the drain, for example on wheels, tracks or a long arm.",
      "It removes the blockage by cutting, sucking or scooping.",
      "It is controlled from outside, with a camera so the operator can see.",
      "No person goes into the drain at any step.",
    ],
    "How do you clean the robot after?",
  ),
  m(
    14,
    "Library helper",
    "Find books and put them back on the right shelf in a big library.",
    "Books get put back in the wrong place, so nobody can find them.",
    [
      "It identifies each book, for example by barcode, tag or a camera reading the label.",
      "It moves along shelves and reaches high or low rows.",
      "It grips books gently without tearing them.",
      "It is quiet and safe around readers.",
    ],
    "What does it do with a book that has no label?",
  ),
  m(
    15,
    "Traffic helper",
    "Manage traffic at a busy junction when the signals stop working.",
    "When signals fail, the junction jams and accidents happen.",
    [
      "It sees the traffic from each road, with cameras or sensors.",
      "It gives clear signals that drivers understand, like lights, arms or a display.",
      "It decides who goes first in a fair way, and lets ambulances through.",
      "It does not stand where vehicles can hit it, and drivers can see it at night.",
    ],
    "What if a driver ignores the robot?",
  ),
  m(
    16,
    "Kitchen helper",
    "Help a person with one arm cook a simple meal.",
    "Cutting, stirring and lifting pots need two hands.",
    [
      "It holds things steady, like a vegetable while cutting or a pot while pouring.",
      "It does one or two clear jobs: stirring, chopping, lifting.",
      "It is easy to control with one hand or by voice.",
      "It is safe near fire, hot oil and knives.",
    ],
    "How do you stop it if something goes wrong?",
  ),
  m(
    17,
    "Robot farmer",
    "Help a farmer find out which plants need water.",
    "Farmers water everything the same, wasting water while some plants still dry out.",
    [
      "It checks the soil or the plants, using a moisture sensor or a camera.",
      "It tells the farmer, or waters only the dry spots itself.",
      "It handles mud, heat and uneven ground.",
      "It is cheap enough for a small farmer.",
    ],
    "How does the farmer get the message?",
  ),
  m(
    18,
    "Pest patrol",
    "Protect crops from birds and insects without harmful chemicals.",
    "Pests eat crops, and the chemicals used against them harm people and soil.",
    [
      "It notices pests, for example birds landing or insects on leaves.",
      "It scares or removes them without poison, using sound, light, movement or a trap.",
      "It covers a big field or moves around it.",
      "It does not harm useful insects like bees, or nearby animals.",
    ],
    "Will the birds get used to it after a week?",
  ),
  m(
    19,
    "Cattle care",
    "Check the health of cows on a small dairy farm.",
    "A sick cow gives less milk, and farmers notice too late.",
    [
      "It checks something about the cow: temperature, walking, eating or milk.",
      "It warns the farmer early about a cow that looks unwell.",
      "It is calm and safe, so it does not scare the animals.",
      "It is simple and cheap enough for a small farmer.",
    ],
    "How does it tell one cow from another?",
  ),
  m(
    20,
    "Solar panel cleaner",
    "Keep dusty solar panels clean in a desert.",
    "Dust on solar panels cuts the power they make, and water is scarce in deserts.",
    [
      "It moves across rows of panels, like a rail, wheels or a drone.",
      "It cleans with little or no water, such as a brush or air.",
      "It runs by itself, for example every night, and charges from the panels.",
      "It does not scratch or crack the panels.",
    ],
    "How does it move from one row to the next?",
  ),
  m(
    21,
    "Mine safety",
    "Check a mine for dangerous gas before workers go in.",
    "Mines can fill with gas that poisons workers or explodes.",
    [
      "It goes into the mine first, on wheels, tracks or as a drone.",
      "It measures gas with a gas sensor.",
      "It warns workers outside, with an alarm or a message, before anyone enters.",
      "The robot itself cannot cause a spark that sets the gas on fire.",
    ],
    "How does the signal get out from deep underground?",
  ),
  m(
    22,
    "Hill delivery",
    "Deliver medicines to a village in the hills with very bad roads.",
    "Roads wash away in the rain and patients wait days for medicines.",
    [
      "It travels without a good road, for example a drone or a climbing robot.",
      "It finds the right place, using GPS or a fixed route.",
      "It keeps medicines safe, cool and dry on the way.",
      "They think about rain, wind or battery running out.",
    ],
    "Who receives the medicine at the village?",
  ),
  m(
    23,
    "Lost child finder",
    "Help find a lost child at a big, crowded festival.",
    "In big crowds, a small child gets separated and parents panic.",
    [
      "It has a simple way to know the child, like a wristband or tag given at the entry.",
      "It finds the child's location quickly in the crowd.",
      "It tells parents or police, and keeps the child safe until they arrive.",
      "It respects privacy and does not track every person at the festival.",
    ],
    "What if the child takes off the band?",
  ),
  m(
    24,
    "Wheelchair stairs",
    "Help a wheelchair user go up and down stairs.",
    "Many buildings have only stairs, so wheelchair users cannot get in.",
    [
      "It climbs steps, for example with tracks, legs or a lifting arm.",
      "It keeps the person level and steady the whole time.",
      "The person can control it alone, without a helper.",
      "It has a way to stop safely if it slips or the power fails.",
    ],
    "How does it handle narrow or curved stairs?",
  ),
  m(
    25,
    "Pet sitter",
    "Feed and play with a pet while the owner is away all day.",
    "Pets left alone get hungry, bored and stressed.",
    [
      "It gives food and water at the right times.",
      "It keeps the pet busy, like a ball launcher, laser or a moving toy.",
      "The owner can check on the pet, for example by camera.",
      "It is safe for the pet: no small parts to swallow, nothing that can hurt it.",
    ],
    "What does it do if the pet gets sick?",
  ),
  m(
    26,
    "Plant nursery",
    "Water and care for 1,000 small plants in a nursery.",
    "Each plant needs a different amount of water and light. Doing it by hand takes all day.",
    [
      "It checks each plant or tray, for example soil moisture or leaf colour.",
      "It gives the right amount of water to each one.",
      "It moves along rows by itself, like rails or a set path.",
      "It does not crush or knock over small plants.",
    ],
    "How does it know which plant it already watered?",
  ),
  m(
    27,
    "Classroom cleaner",
    "Clean classrooms and labs every evening.",
    "Classrooms get dusty and dirty, and cleaning takes staff a lot of time.",
    [
      "It moves around benches, chairs and legs without hitting them.",
      "It cleans the floor or benches, by sweeping, mopping or vacuuming.",
      "It works by itself and goes back to charge.",
      "It stays away from lab chemicals, wires and equipment.",
    ],
    "How does it clean stairs or under desks?",
  ),
  m(
    28,
    "Ocean explorer",
    "Study fish and coral deep in the ocean.",
    "The deep ocean is dark, cold and has crushing pressure. Divers cannot go there.",
    [
      "It works underwater and stays sealed against water and pressure.",
      "It sees in the dark, with lights and a camera, or by sound.",
      "It sends or stores what it finds and comes back up.",
      "It does not damage coral or scare fish away.",
    ],
    "How does it talk to people on the ship?",
  ),
  m(
    29,
    "Mars explorer",
    "Explore Mars and send back useful information.",
    "Mars is far, cold and dusty, and a message takes minutes to arrive.",
    [
      "It moves on rocks and sand, with wheels, legs or a small helicopter.",
      "It collects useful information, like photos, rocks, soil, or signs of water.",
      "It makes simple decisions by itself, because orders from Earth arrive late.",
      "They plan for dust storms and power, for example solar panels and dust cleaning.",
    ],
    "What does it do if it gets stuck?",
  ),
  m(
    30,
    "Warehouse picker",
    "Pick and pack orders in a big online shopping warehouse.",
    "Workers walk many kilometres a day finding items on shelves.",
    [
      "It finds the right item, by barcode, tag or camera.",
      "It picks items of different shapes without breaking them.",
      "It brings items to packing or packs them itself.",
      "It is safe around human workers in the warehouse.",
    ],
    "How does it pick up an egg tray versus a heavy box?",
  ),
  m(
    31,
    "Construction helper",
    "Lift and place bricks safely on a building site.",
    "Carrying bricks up and down is heavy, slow work that injures backs.",
    [
      "It lifts and carries heavy loads, with an arm, a lift or tracks.",
      "It places bricks in the right spot, for example by following lines or a plan.",
      "It works on rough, dusty ground.",
      "It is safe for workers nearby, for example it stops when someone comes close.",
    ],
    "Who tells the robot where each brick goes?",
  ),
  m(
    32,
    "Pothole fixer",
    "Find and fill potholes on city roads.",
    "Potholes cause accidents and damage vehicles, and repairs take months.",
    [
      "It finds potholes, with a camera, bumps felt while driving, or a distance sensor.",
      "It fills them, or marks them and reports them to the city.",
      "It works quickly so traffic is not blocked for long.",
      "It stays safe from moving traffic, for example working at night or with warning lights.",
    ],
    "How does it carry the filling material?",
  ),
  m(
    33,
    "Wildlife crossing",
    "Stop wild animals from being hit on a highway through a forest.",
    "Deer, elephants and other animals cross roads and get hit by fast vehicles.",
    [
      "It detects animals near the road, with heat, a camera or movement.",
      "It warns drivers in time, using lights or signs ahead.",
      "It guides or gently stops animals, without hurting them.",
      "It does not scare the animals into the traffic.",
    ],
    "How does it work in fog?",
  ),
  m(
    34,
    "Medicine reminder",
    "Help a patient take the right medicine at the right time.",
    "Patients with many tablets forget doses or take the wrong one.",
    [
      "It reminds at the right time, with sound, light or vibration.",
      "It gives out only the right tablets for that time.",
      "It tells family or a doctor if a dose is missed.",
      "It is simple enough for an old or sick person to use.",
    ],
    "How does someone refill it?",
  ),
  m(
    35,
    "Rehab coach",
    "Help a patient do recovery exercises correctly at home after an injury.",
    "After an injury, patients do exercises wrong at home and heal slowly.",
    [
      "It watches the movement, with a camera or a sensor worn on the body.",
      "It says when the exercise is wrong and how to fix it.",
      "It counts reps and shares progress with the doctor.",
      "It never pushes the patient further than is safe.",
    ],
    "What does it do if the patient is in pain?",
  ),
  m(
    36,
    "Robot hand",
    "Help a person who lost a hand pick up everyday objects.",
    "Without a hand, simple tasks like holding a cup are very hard.",
    [
      "It grips objects of different sizes, like a cup, a pen or a key.",
      "The person controls it simply, for example with arm muscles, a button or a foot switch.",
      "It controls grip strength so it does not crush an egg or drop a bottle.",
      "It is light and comfortable to wear all day.",
    ],
    "How does the person know how hard it is gripping?",
  ),
  m(
    37,
    "Room disinfector",
    "Clean and disinfect a hospital room between patients.",
    "Germs stay on surfaces and spread infections to the next patient.",
    [
      "It reaches all surfaces: bed, handles, floor, switches.",
      "It disinfects, for example with UV light or a spray.",
      "It works by itself and reports when the room is done.",
      "It works only when no person is in the room, since UV and sprays can harm people.",
    ],
    "How does it know the room is empty?",
  ),
  m(
    38,
    "First aid drone",
    "Get first aid to a road accident before the ambulance arrives.",
    "The first minutes after an accident matter most, and ambulances get stuck in traffic.",
    [
      "It reaches the place fast, by flying or using a clear path.",
      "It carries useful first aid, like a kit, bandages or an oxygen mask.",
      "It lets a doctor guide people at the spot, by video or voice.",
      "It does not land on or hurt injured people, and it works with the ambulance.",
    ],
    "How does it know where the accident is?",
  ),
  m(
    39,
    "Night safety",
    "Help students walk safely across campus at night.",
    "Dark paths on campus feel unsafe, especially when walking alone.",
    [
      "It lights the path, or walks along with the student.",
      "It has a quick way to call for help, like a button or a voice.",
      "It alerts security with the student's location.",
      "It respects privacy and does not film everyone all the time.",
    ],
    "How does a student call it?",
  ),
  m(
    40,
    "Window cleaner",
    "Clean the outside windows of a 30-floor building.",
    "Workers hang on ropes high up to clean glass, which is dangerous.",
    [
      "It holds onto the glass or wall, with suction, a rope system or magnets.",
      "It cleans glass without scratching it.",
      "It moves from window to window and floor to floor.",
      "It cannot fall on people below, for example it has a safety rope.",
    ],
    "What happens in strong wind?",
  ),
  m(
    41,
    "Tree planter",
    "Plant a thousand saplings on bare, dry land.",
    "Planting by hand is slow, and many saplings die in the first weeks.",
    [
      "It digs and plants, for example a ground robot, or a drone dropping seed balls.",
      "It spaces plants properly and covers the roots.",
      "It helps the saplings survive, by watering or checking on them later.",
      "It works on rough, rocky ground and in heat.",
    ],
    "How many trees can it plant in a day?",
  ),
  m(
    42,
    "Beach cleaner",
    "Clean plastic and broken glass from a beach.",
    "Rubbish on beaches hurts people's feet and washes into the sea.",
    [
      "It moves on soft sand, with wide wheels or tracks.",
      "It separates rubbish from sand, with a sieve, a rake or a camera.",
      "It handles sharp glass safely and stores it.",
      "It does not harm crabs, turtle eggs or birds on the beach.",
    ],
    "Where does the collected rubbish go?",
  ),
  m(
    43,
    "Pipe leak finder",
    "Find leaks in water pipes under the city.",
    "Cities lose a lot of clean water through hidden leaks underground.",
    [
      "It moves inside the pipe, or listens from above the ground.",
      "It detects leaks, for example by sound, pressure or wet soil.",
      "It reports the exact place so workers dig in one spot only.",
      "Water supply does not need to be shut off for days.",
    ],
    "How does it get into the pipe?",
  ),
  m(
    44,
    "Railway track check",
    "Check railway tracks for damage before trains run.",
    "One broken rail can derail a train, and tracks are thousands of kilometres long.",
    [
      "It moves along the track, on wheels on the rail or as a drone.",
      "It finds cracks, loose bolts or objects on the track.",
      "It sends the location quickly to railway staff.",
      "It gets off the track or is timed so it never meets a train.",
    ],
    "How does it work at night?",
  ),
  m(
    45,
    "Mess hall helper",
    "Serve lunch quickly to 500 students in the hostel mess.",
    "Long queues waste students' lunch breaks and food gets cold.",
    [
      "It serves the right amount of food quickly.",
      "It keeps food clean and at the right temperature.",
      "It keeps the queue moving, for example several serving points or a token system.",
      "It cares about food waste and allergies, for example by asking about portion size.",
    ],
    "How does it serve rice and also chapati?",
  ),
  m(
    46,
    "Parking finder",
    "Help drivers find a free parking spot on campus.",
    "Drivers circle around for a long time looking for space and block the roads.",
    [
      "It knows which spots are free, with sensors or a camera.",
      "It shows drivers where to go, with a display, lights or an app.",
      "It keeps paths and emergency lanes clear.",
      "It is cheap and simple to set up across the campus.",
    ],
    "What happens when the parking is full?",
  ),
  m(
    47,
    "Sign language buddy",
    "Help a deaf person talk with someone who does not know sign language.",
    "Most people do not know sign language, so deaf people struggle in shops, offices and hospitals.",
    [
      "It understands signs, with a camera or a glove with sensors.",
      "It turns signs into speech or text for the other person.",
      "It turns the other person's speech into text or signs, so talk goes both ways.",
      "It is small and easy to carry, and works without internet.",
    ],
    "How does it handle a word it has not learnt?",
  ),
  m(
    48,
    "Firefighter helper",
    "Help firefighters see inside a smoky building.",
    "Thick smoke hides people and danger, so firefighters search blind.",
    [
      "It sees through smoke, for example using a heat camera.",
      "It finds people and shows firefighters the way.",
      "It survives heat, water and falling objects.",
      "It helps firefighters. It does not send them into more danger.",
    ],
    "How does the firefighter see what the robot sees?",
  ),
  m(
    49,
    "Power line fixer",
    "Fix power lines after a storm without anyone climbing the pole.",
    "Linemen climb poles in rain and wind, risking falls and electric shock.",
    [
      "It reaches the wire, by climbing the pole, rolling on the wire or flying.",
      "It finds the broken point, with a camera or by sensing current.",
      "It repairs or clears it, for example removing a branch or joining a wire.",
      "They make sure the power is off, or the robot is fully insulated.",
    ],
    "What happens in the rain?",
  ),
  m(
    50,
    "Robot for you",
    "Pick one daily problem that first-year students have and solve it with a robot.",
    "This is the open mission. The team chooses its own problem, like late buses, lost ID cards or heavy bags.",
    [
      "The problem is real and specific, one that many students face.",
      "The robot solves that problem directly, not a different one.",
      "It could be built cheaply on our campus.",
      "They chose a problem a robot helps with, not one that only needs a rule or an app.",
    ],
    "Would you use it yourself every day?",
  ),
  m(
    51,
    "Newborn watch",
    "Keep watch on newborn babies at night in a small village clinic.",
    "One nurse may look after many babies at night, and a baby who stops breathing well needs help within minutes.",
    [
      "It checks the baby's breathing, heartbeat or temperature, for example with a soft pad under the mattress or a clip on the foot.",
      "It alerts the nurse straight away, with a light, a buzzer at the nurses' desk or a phone.",
      "It works on its own all night, with a battery in case the power goes.",
      "Nothing covers the baby's face, nothing is tight, and it makes no loud noise next to the baby.",
    ],
    "How does it know the difference between a sleeping baby and one in trouble?",
  ),
  m(
    52,
    "Lifting helper",
    "Help a factory worker lift heavy parts all day without hurting their back.",
    "Lifting heavy parts hundreds of times a day slowly damages workers' backs and shoulders.",
    [
      "It is worn on the body or stands beside the worker, like a back support suit or a lifting arm.",
      "It senses when the worker starts to lift, for example with a motion or muscle sensor, and adds strength at that moment.",
      "It is light and quick to put on and take off.",
      "It never bends or pulls the body further than is safe, and the worker can stop it at once.",
    ],
    "What happens if the power runs out while the worker is holding a part?",
  ),
  m(
    53,
    "Air pollution map",
    "Measure air pollution street by street in a busy city and warn people.",
    "Dirty air causes asthma and lung disease, but people cannot see which streets are worst.",
    [
      "It senses smoke, dust or gas with an air sensor.",
      "It covers many streets, for example many small stations or a sensor on buses.",
      "It warns people in a way they will see, like a display, lights or a message.",
      "One passing bus does not fool it: it takes readings over time before it warns.",
    ],
    "Who will act on what your robot finds?",
  ),
  m(
    54,
    "Tomato picker",
    "Help a farmer harvest ripe tomatoes without squashing them.",
    "Picking by hand is slow, workers are hard to find, and squashed tomatoes cannot be sold.",
    [
      "It tells ripe tomatoes from unripe ones, for example by colour with a camera.",
      "It picks gently, with a soft gripper or by cutting the stem.",
      "It moves along the rows and carries a basket or crate.",
      "It does not damage the plant or pick the green tomatoes.",
    ],
    "How does it find a tomato hidden behind leaves?",
  ),
  m(
    55,
    "Village doctor link",
    "Help a doctor in the city check a patient in a far village.",
    "Villages may have no doctor nearby, so patients travel hours for a simple check-up.",
    [
      "The doctor can see and talk to the patient, with a camera, screen and speaker.",
      "It measures health signs, like temperature, pulse, blood pressure or oxygen.",
      "A village health worker can use it easily, and it works on a weak network.",
      "The doctor decides, not the robot, and the patient's details stay private.",
    ],
    "What does it do if the network drops in the middle of a check-up?",
  ),
  m(
    56,
    "Snake rescue",
    "Catch a snake that has entered a house and release it safely in the forest.",
    "People panic and often kill snakes, or get bitten trying to catch them.",
    [
      "It finds the snake, for example with a heat camera or a motion sensor.",
      "It catches it gently, with a tube, a box or a soft grabber.",
      "People stay at a safe distance and control it from afar.",
      "It does not hurt the snake, and it releases it far from homes, in the forest.",
    ],
    "How does it get a snake out from under a cupboard?",
  ),
  m(
    57,
    "Luggage buddy",
    "Carry heavy luggage for travellers at a busy railway station.",
    "Old people, parents with children and tired travellers struggle with heavy bags on stairs and platforms.",
    [
      "It carries heavy bags, on wheels or with a lift.",
      "It follows its owner through the crowd, for example with a tag or a camera.",
      "It handles stairs, ramps or the gap between platform and train.",
      "It is safe in a crowd and only its owner can unlock the bags.",
    ],
    "What does it do if it loses its owner in the crowd?",
  ),
  m(
    58,
    "Steady spoon",
    "Help a person with shaking hands eat without spilling food.",
    "Some illnesses, like Parkinson's disease, make hands shake, so eating alone becomes very hard.",
    [
      "It senses the shaking, for example with a motion sensor in the handle.",
      "It moves the spoon against the shake to keep it steady.",
      "It is light, easy to hold and easy to wash.",
      "It is safe in the mouth: food-safe, no sharp parts, no electric parts that touch water.",
    ],
    "How long does the battery last, and how is it charged?",
  ),
  m(
    59,
    "Space farm",
    "Grow fresh food for astronauts on a long trip to the Moon.",
    "Packed food runs out and loses its goodness, and there is little room, water or light in a spaceship.",
    [
      "It checks and controls water, light and temperature for the plants, with sensors.",
      "It works in a small sealed space and reuses its water.",
      "It runs by itself and tells the astronauts when food is ready or something is wrong.",
      "They remember there is no gravity, so water floats and cannot simply be poured.",
    ],
    "What does it do if a plant gets sick?",
  ),
  m(
    60,
    "Exit guide",
    "Help 300 students leave an auditorium safely in an emergency.",
    "In a fire or power cut, people panic, rush to one door and get hurt.",
    [
      "It knows there is an emergency, for example from smoke, a fire alarm or a button.",
      "It guides people to the nearest safe exit, with lights, arrows or sound.",
      "It tells security how many people are out, or who is still inside.",
      "It does not block the exits or cause a rush to one door.",
    ],
    "What does it do if the nearest exit is blocked?",
  ),
];

export const missionByNumber = (n: number) => missions.find((x) => x.n === n);

/** Missions in blocks of ten, for the missions page. */
export const missionBlocks = Array.from({ length: Math.ceil(missions.length / 10) }, (_, i) =>
  missions.slice(i * 10, i * 10 + 10),
);
