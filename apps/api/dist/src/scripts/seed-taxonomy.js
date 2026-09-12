"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function leaves(prefix, items) {
    return items.map(([code, name, keywords]) => ({
        code: `${prefix}_${code}`,
        name,
        keywords,
    }));
}
function buildTaxonomy() {
    const spec = [
        ['HOME', 'Home & Housing', [
                ['ROOMS', 'Rooms', [['BED', 'Bedroom', ['bedroom', 'bed']], ['KIT', 'Kitchen', ['kitchen', 'cooker', 'oven']], ['BATH', 'Bathroom', ['bathroom', 'shower', 'toilet']], ['LIV', 'Living room', ['living room', 'sofa', 'couch']]]],
                ['FURN', 'Furniture', [['TAB', 'Tables', ['table', 'desk']], ['CHA', 'Chairs', ['chair', 'armchair']], ['CAB', 'Cabinets', ['cabinet', 'wardrobe', 'cupboard']]]],
                ['APP', 'Appliances', [['WASH', 'Washing', ['washing machine', 'dryer']], ['FRID', 'Fridge', ['fridge', 'freezer', 'refrigerator']], ['VAC', 'Cleaning machines', ['vacuum', 'hoover']]]],
                ['MAIN', 'Maintenance', [['REPAIR', 'Repairs', ['repair', 'fix', 'plumber']], ['PAINT', 'Painting', ['paint', 'brush']]]],
                ['BUILD', 'Building materials', [['WOOD', 'Wood', ['wood', 'timber']], ['BRICK', 'Brick', ['brick', 'concrete']]]],
                ['RENT', 'Renting', [['LEASE', 'Lease', ['rent', 'lease', 'landlord', 'tenant']]]],
                ['PROP', 'Property', [['HOUSE', 'Houses', ['house', 'cottage']], ['FLAT', 'Flats', ['flat', 'apartment']]]],
                ['UTIL', 'Utilities', [['ELEC', 'Electricity', ['electricity', 'power']], ['WAT', 'Water', ['tap', 'pipe']], ['GAS', 'Gas', ['gas', 'boiler']]]],
                ['GARD', 'Gardening', [['PLANT', 'Plants', ['garden', 'plant', 'flower']], ['TOOL', 'Garden tools', ['spade', 'lawn']]]],
            ]],
        ['TRAVEL', 'Travel', [
                ['AIR', 'Airports', [['TERM', 'Terminals', ['airport', 'terminal', 'gate']], ['SEC', 'Security', ['passport control', 'security check']]]],
                ['FLY', 'Flights', [['BOARD', 'Boarding', ['flight', 'boarding', 'take-off', 'landing']], ['DELAY', 'Delays', ['delay', 'cancel']]]],
                ['HOTEL', 'Hotels', [['ROOM', 'Hotel rooms', ['hotel', 'reception', 'check-in']], ['BOOK', 'Reservations', ['reservation', 'booking']]]],
                ['TOUR', 'Tourism', [['SIGHT', 'Sightseeing', ['sightseeing', 'tourist', 'monument']], ['GUIDE', 'Guides', ['tour guide', 'itinerary']]]],
                ['DOCS', 'Travel documents', [['VISA', 'Visas', ['visa', 'passport']]]],
                ['PROB', 'Travel problems', [['LOST', 'Lost luggage', ['lost luggage', 'stolen']], ['MISS', 'Missed connections', ['missed', 'connection']]]],
                ['PUB', 'Public transportation', [['BUS', 'Buses', ['bus', 'coach']], ['TRAIN', 'Trains', ['train', 'platform']], ['METRO', 'Metro', ['metro', 'subway', 'underground']]]],
            ]],
        ['FOOD', 'Food & Drink', [
                ['MEAL', 'Meals', [['BF', 'Breakfast', ['breakfast']], ['LN', 'Lunch', ['lunch']], ['DN', 'Dinner', ['dinner', 'supper']]]],
                ['ING', 'Ingredients', [['VEG', 'Vegetables', ['vegetable', 'carrot', 'potato', 'onion']], ['FRUIT', 'Fruit', ['fruit', 'apple', 'banana', 'orange']], ['MEAT', 'Meat', ['meat', 'chicken', 'beef', 'pork']]]],
                ['COOK', 'Cooking', [['BOIL', 'Boiling', ['boil', 'simmer']], ['FRY', 'Frying', ['fry', 'roast', 'bake']]]],
                ['REST', 'Restaurants', [['MENU', 'Menus', ['menu', 'waiter', 'bill']], ['ORDER', 'Ordering', ['order', 'starter', 'dessert']]]],
                ['DRINK', 'Drinks', [['HOT', 'Hot drinks', ['coffee', 'tea']], ['ALC', 'Alcohol', ['beer', 'wine', 'alcohol']]]],
            ]],
        ['WORK', 'Work & Business', [
                ['JOB', 'Jobs', [['TITLE', 'Job titles', ['teacher', 'doctor', 'engineer', 'nurse', 'manager']], ['HUNT', 'Job search', ['cv', 'resume', 'interview', 'apply']]]],
                ['OFF', 'Office', [['MEET', 'Meetings', ['meeting', 'agenda']], ['MAIL', 'Email', ['email', 'inbox']]]],
                ['BIZ', 'Business English', [['DEAL', 'Deals', ['contract', 'negotiate', 'client']], ['FIN', 'Finance words', ['profit', 'budget', 'invoice']]]],
            ]],
        ['EDU', 'Education', [
                ['SCH', 'School', [['SUBJ', 'Subjects', ['maths', 'history', 'science', 'lesson']], ['EXAM', 'Exams', ['exam', 'test', 'grade']]]],
                ['UNI', 'University', [['DEG', 'Degrees', ['university', 'degree', 'lecture']], ['CAMP', 'Campus', ['campus', 'tuition']]]],
                ['LANG', 'Language learning', [['VOC', 'Vocabulary study', ['vocabulary', 'grammar', 'pronounce']]]],
            ]],
        ['HEALTH', 'Health', [
                ['BODY', 'Body', [['HEAD', 'Head', ['head', 'eye', 'ear', 'nose']], ['LIMB', 'Limbs', ['arm', 'leg', 'hand', 'foot']]]],
                ['ILL', 'Illness', [['COLD', 'Colds', ['cold', 'cough', 'fever']], ['PAIN', 'Pain', ['pain', 'ache', 'hurt']]]],
                ['CARE', 'Healthcare', [['HOSP', 'Hospital', ['hospital', 'clinic', 'doctor']], ['MED', 'Medicine', ['medicine', 'pill', 'prescription']]]],
            ]],
        ['MONEY', 'Money & Banking', [
                ['BANK', 'Banking', [['ACC', 'Accounts', ['bank', 'account', 'deposit']], ['CARD', 'Cards', ['credit card', 'debit']]]],
                ['PAY', 'Payments', [['CASH', 'Cash', ['cash', 'coin', 'note']], ['ONL', 'Online pay', ['transfer', 'payment']]]],
                ['SHOP', 'Shopping', [['PRICE', 'Prices', ['price', 'cheap', 'expensive', 'discount']]]],
            ]],
        ['GEO', 'Geography', [
                ['LAND', 'Landforms', [['RIV', 'Rivers', ['river', 'bank', 'stream']], ['MT', 'Mountains', ['mountain', 'hill', 'valley']]]],
                ['CITY', 'Cities', [['STREET', 'Streets', ['street', 'city', 'town']], ['MAP', 'Maps', ['map', 'north', 'south']]]],
                ['WEATH', 'Weather', [['RAIN', 'Rain', ['rain', 'storm']], ['SUN', 'Sun', ['sunny', 'hot', 'cold', 'snow']]]],
            ]],
        ['ANIM', 'Animals', [
                ['PET', 'Pets', [['DOG', 'Dogs', ['dog', 'puppy']], ['CAT', 'Cats', ['cat', 'kitten']]]],
                ['WILD', 'Wild animals', [['MAM', 'Mammals', ['lion', 'bear', 'wolf']], ['BIRD', 'Birds', ['bird', 'eagle']]]],
                ['FISH', 'Fish & sea', [['SEA', 'Sea life', ['fish', 'shark', 'whale', 'ławica']]]],
            ]],
        ['PEOPLE', 'People & Relationships', [
                ['FAM', 'Family', [['PAR', 'Parents', ['mother', 'father', 'parent']], ['SIB', 'Siblings', ['brother', 'sister', 'family']]]],
                ['SOC', 'Social life', [['FRI', 'Friends', ['friend', 'neighbour']], ['DATE', 'Dating', ['boyfriend', 'girlfriend', 'wedding']]]],
            ]],
        ['TIME', 'Time & Calendar', [
                ['DAY', 'Days', [['WK', 'Weekdays', ['monday', 'tuesday', 'weekend']]]],
                ['CLK', 'Clock', [['HOUR', 'Hours', ['hour', 'minute', 'o\'clock', 'clock']]]],
            ]],
        ['TECH', 'Technology', [
                ['COMP', 'Computers', [['PC', 'PCs', ['computer', 'laptop', 'keyboard']], ['NET', 'Internet', ['internet', 'website', 'email']]]],
                ['PHONE', 'Phones', [['MOB', 'Mobiles', ['phone', 'smartphone', 'app']]]],
            ]],
        ['SPORT', 'Sport', [
                ['TEAM', 'Team sports', [['FB', 'Football', ['football', 'soccer', 'goal']], ['BB', 'Basketball', ['basketball']]]],
                ['IND', 'Individual sports', [['RUN', 'Running', ['run', 'marathon']], ['SWIM', 'Swimming', ['swim']]]],
            ]],
        ['ART', 'Arts & Culture', [
                ['MUS', 'Music', [['SONG', 'Songs', ['music', 'song', 'concert']]]],
                ['FILM', 'Film', [['MOV', 'Movies', ['film', 'movie', 'cinema']]]],
                ['BOOK', 'Books', [['READ', 'Reading', ['book', 'novel', 'author']]]],
            ]],
        ['LAW', 'Law & Society', [
                ['CRIME', 'Crime', [['THEFT', 'Theft', ['steal', 'theft', 'police']]]],
                ['GOV', 'Government', [['VOTE', 'Voting', ['vote', 'election', 'government']]]],
            ]],
        ['ENV', 'Environment', [
                ['NAT', 'Nature', [['TREE', 'Trees', ['tree', 'forest']], ['CLI', 'Climate', ['climate', 'pollution', 'recycle']]]],
            ]],
        ['TRANS', 'Transport', [
                ['CAR', 'Cars', [['DRIVE', 'Driving', ['car', 'drive', 'traffic']]]],
                ['ROAD', 'Roads', [['HWY', 'Highways', ['road', 'motorway', 'bridge']]]],
            ]],
        ['CLOTH', 'Clothes', [
                ['WEAR', 'Everyday clothes', [['TOP', 'Tops', ['shirt', 'jacket', 'coat']], ['BOT', 'Bottoms', ['trousers', 'jeans', 'skirt']]]],
                ['SHOE', 'Shoes', [['FT', 'Footwear', ['shoe', 'boot', 'trainer']]]],
            ]],
        ['FEEL', 'Feelings', [
                ['EMO', 'Emotions', [['HAP', 'Happiness', ['happy', 'glad', 'joy']], ['SAD', 'Sadness', ['sad', 'angry', 'afraid', 'worry']]]],
            ]],
        ['COMM', 'Communication', [
                ['TALK', 'Speaking', [['SAY', 'Saying', ['say', 'tell', 'speak', 'ask']]]],
                ['WRITE', 'Writing', [['LET', 'Letters', ['write', 'letter', 'message']]]],
            ]],
    ];
    const domains = spec.map(([code, name, subs]) => ({
        code,
        name,
        subs: subs.map(([subCode, subName, leafItems]) => ({
            code: `${code}_${subCode}`,
            name: subName,
            leaves: leaves(`${code}_${subCode}`, leafItems),
        })),
    }));
    const extras = [
        'SCIENCE', 'MATH', 'HISTORY', 'MEDIA', 'HOBBIES', 'HOLIDAYS', 'SAFETY',
        'WEATHER2', 'CITYLIFE', 'COUNTRY', 'FARM', 'SEA', 'SPACE', 'RELIGION',
        'PHILOSOPHY', 'PSYCHOLOGY', 'MEDICINE2', 'LAW2', 'POLITICS', 'WAR',
        'PEACE', 'CHARITY', 'VOLUNTEER', 'TOOLS', 'MATERIALS', 'COLORS',
        'SHAPES', 'NUMBERS', 'MEASURE', 'DIRECTION',
    ];
    const extraSubs = ['BASICS', 'PEOPLE', 'PLACES', 'ACTIONS', 'THINGS', 'PROBLEMS', 'SKILLS', 'EVENTS'];
    extras.forEach((domain, di) => {
        const d = {
            code: domain,
            name: domain.replace(/\d+$/, '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
            subs: extraSubs.map((sub, si) => ({
                code: `${domain}_${sub}`,
                name: sub.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
                leaves: [1, 2, 3, 4].map((n) => ({
                    code: `${domain}_${sub}_${n}`,
                    name: `${sub.toLowerCase()} ${n}`,
                    keywords: [`${domain.toLowerCase()}${si}${n}`],
                })),
            })),
        };
        const seeds = [
            ['atom', 'experiment'], ['number', 'calculate'], ['war', 'king'],
            ['news', 'newspaper'], ['hobby', 'chess'], ['christmas', 'birthday'],
            ['danger', 'warning'], ['forecast', 'wind'], ['crowd', 'downtown'],
            ['village', 'farm'], ['crop', 'tractor'], ['ocean', 'beach'],
            ['planet', 'star'], ['church', 'pray'], ['idea', 'thought'],
            ['mind', 'memory'], ['surgery', 'patient'], ['court', 'judge'],
            ['party', 'minister'], ['soldier', 'battle'], ['treaty', 'peace'],
            ['donate', 'help'], ['volunteer', 'charity'], ['hammer', 'tool'],
            ['metal', 'plastic'], ['red', 'blue'], ['circle', 'square'],
            ['thousand', 'million'], ['kilogram', 'metre'], ['left', 'right'],
        ];
        const pair = seeds[di] ?? ['item', 'thing'];
        d.subs[0].leaves[0].keywords = pair;
        domains.push(d);
    });
    return domains;
}
async function upsertCategory(code, name, parentId) {
    const existing = await prisma.categories.findUnique({ where: { code } });
    if (existing) {
        await prisma.categories.update({
            where: { id: existing.id },
            data: { name, parent_id: parentId },
        });
        return existing.id;
    }
    const created = await prisma.categories.create({
        data: { code, name, parent_id: parentId },
    });
    return created.id;
}
async function assignLeaf(categoryId, keywords) {
    const useful = keywords.filter((k) => k.length >= 3);
    if (useful.length === 0)
        return 0;
    const patterns = useful.map((k) => `%${k.toLowerCase()}%`);
    const ors = patterns
        .map((_, i) => `(LOWER(s.lemma) LIKE $${i + 2} OR LOWER(s.definition) LIKE $${i + 2})`)
        .join(' OR ');
    const sql = `
    INSERT INTO vocabulary_category_assignments (vocabulary_sense_id, category_id, confidence)
    SELECT s.id, $1::bigint, 'keyword'
    FROM vocabulary_senses s
    WHERE ${ors}
    ON CONFLICT (vocabulary_sense_id, category_id) DO NOTHING
  `;
    const result = await prisma.$executeRawUnsafe(sql, categoryId, ...patterns);
    return Number(result);
}
async function main() {
    const tree = buildTaxonomy();
    let nodes = 0;
    let assigned = 0;
    for (const domain of tree) {
        const domainId = await upsertCategory(domain.code, domain.name, null);
        nodes += 1;
        for (const sub of domain.subs) {
            const subId = await upsertCategory(sub.code, sub.name, domainId);
            nodes += 1;
            for (const leaf of sub.leaves) {
                const leafId = await upsertCategory(leaf.code, leaf.name, subId);
                nodes += 1;
                assigned += await assignLeaf(leafId, leaf.keywords);
            }
        }
    }
    const count = await prisma.categories.count();
    const links = await prisma.vocabulary_category_assignments.count();
    console.log(`Taxonomy nodes upserted this run: ${nodes}`);
    console.log(`Categories in database: ${count}`);
    console.log(`Sense assignments written this run: ${assigned}`);
    console.log(`Sense assignments total: ${links}`);
}
main()
    .catch((err) => {
    console.error(err);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed-taxonomy.js.map