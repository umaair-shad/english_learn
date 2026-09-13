export type TaxNode = {
    code: string;
    name: string;
    children?: TaxNode[];
};
export declare const KEEP_GENERATED_ROOTS: readonly ["SCIENCE", "MATH", "HISTORY", "MEDIA", "HOBBIES", "HOLIDAYS", "SAFETY", "RELIGION", "PHILOSOPHY", "PSYCHOLOGY", "POLITICS", "WAR", "CHARITY", "TOOLS"];
export declare const MERGE_AWAY_ROOTS: readonly ["WEATHER2", "LAW2", "MEDICINE2", "VOLUNTEER", "SEA", "NUMBERS", "MEASURE", "DIRECTION", "CITYLIFE", "COUNTRY", "FARM", "SPACE", "PEACE", "MATERIALS", "COLORS", "SHAPES"];
export declare const ALL_GENERATED_ROOTS: readonly ["SCIENCE", "MATH", "HISTORY", "MEDIA", "HOBBIES", "HOLIDAYS", "SAFETY", "RELIGION", "PHILOSOPHY", "PSYCHOLOGY", "POLITICS", "WAR", "CHARITY", "TOOLS", "WEATHER2", "LAW2", "MEDICINE2", "VOLUNTEER", "SEA", "NUMBERS", "MEASURE", "DIRECTION", "CITYLIFE", "COUNTRY", "FARM", "SPACE", "PEACE", "MATERIALS", "COLORS", "SHAPES"];
export declare const GENERATED_CHILD_RE: RegExp;
export declare const PLACEHOLDER_NAME_RE: RegExp;
export declare const DUMMY_KEYWORD_RE: RegExp;
export declare const HANDWRITTEN_CODES: readonly ["ANIM", "ANIM_FISH", "ANIM_FISH_SEA", "ANIM_PET", "ANIM_PET_CAT", "ANIM_PET_DOG", "ANIM_WILD", "ANIM_WILD_BIRD", "ANIM_WILD_MAM", "ART", "ART_BOOK", "ART_BOOK_READ", "ART_FILM", "ART_FILM_MOV", "ART_MUS", "ART_MUS_SONG", "CLOTH", "CLOTH_SHOE", "CLOTH_SHOE_FT", "CLOTH_WEAR", "CLOTH_WEAR_BOT", "CLOTH_WEAR_TOP", "COMM", "COMM_TALK", "COMM_TALK_SAY", "COMM_WRITE", "COMM_WRITE_LET", "EDU", "EDU_LANG", "EDU_LANG_VOC", "EDU_SCH", "EDU_SCH_EXAM", "EDU_SCH_SUBJ", "EDU_UNI", "EDU_UNI_CAMP", "EDU_UNI_DEG", "ENV", "ENV_NAT", "ENV_NAT_CLI", "ENV_NAT_TREE", "FEEL", "FEEL_EMO", "FEEL_EMO_HAP", "FEEL_EMO_SAD", "FOOD", "FOOD_COOK", "FOOD_COOK_BOIL", "FOOD_COOK_FRY", "FOOD_DRINK", "FOOD_DRINK_ALC", "FOOD_DRINK_HOT", "FOOD_ING", "FOOD_ING_FRUIT", "FOOD_ING_MEAT", "FOOD_ING_VEG", "FOOD_MEAL", "FOOD_MEAL_BF", "FOOD_MEAL_DN", "FOOD_MEAL_LN", "FOOD_REST", "FOOD_REST_MENU", "FOOD_REST_ORDER", "GEO", "GEO_CITY", "GEO_CITY_MAP", "GEO_CITY_STREET", "GEO_LAND", "GEO_LAND_MT", "GEO_LAND_RIV", "GEO_WEATH", "GEO_WEATH_RAIN", "GEO_WEATH_SUN", "HEALTH", "HEALTH_BODY", "HEALTH_BODY_HEAD", "HEALTH_BODY_LIMB", "HEALTH_CARE", "HEALTH_CARE_HOSP", "HEALTH_CARE_MED", "HEALTH_ILL", "HEALTH_ILL_COLD", "HEALTH_ILL_PAIN", "HOME", "HOME_APP", "HOME_APP_FRID", "HOME_APP_VAC", "HOME_APP_WASH", "HOME_BUILD", "HOME_BUILD_BRICK", "HOME_BUILD_WOOD", "HOME_FURN", "HOME_FURN_CAB", "HOME_FURN_CHA", "HOME_FURN_TAB", "HOME_GARD", "HOME_GARD_PLANT", "HOME_GARD_TOOL", "HOME_MAIN", "HOME_MAIN_PAINT", "HOME_MAIN_REPAIR", "HOME_PROP", "HOME_PROP_FLAT", "HOME_PROP_HOUSE", "HOME_RENT", "HOME_RENT_LEASE", "HOME_ROOMS", "HOME_ROOMS_BATH", "HOME_ROOMS_BED", "HOME_ROOMS_KIT", "HOME_ROOMS_LIV", "HOME_UTIL", "HOME_UTIL_ELEC", "HOME_UTIL_GAS", "HOME_UTIL_WAT", "LAW", "LAW_CRIME", "LAW_CRIME_THEFT", "LAW_GOV", "LAW_GOV_VOTE", "MONEY", "MONEY_BANK", "MONEY_BANK_ACC", "MONEY_BANK_CARD", "MONEY_PAY", "MONEY_PAY_CASH", "MONEY_PAY_ONL", "MONEY_SHOP", "MONEY_SHOP_PRICE", "PEOPLE", "PEOPLE_FAM", "PEOPLE_FAM_PAR", "PEOPLE_FAM_SIB", "PEOPLE_SOC", "PEOPLE_SOC_DATE", "PEOPLE_SOC_FRI", "SPORT", "SPORT_IND", "SPORT_IND_RUN", "SPORT_IND_SWIM", "SPORT_TEAM", "SPORT_TEAM_BB", "SPORT_TEAM_FB", "TECH", "TECH_COMP", "TECH_COMP_NET", "TECH_COMP_PC", "TECH_PHONE", "TECH_PHONE_MOB", "TIME", "TIME_CLK", "TIME_CLK_HOUR", "TIME_DAY", "TIME_DAY_WK", "TRANS", "TRANS_CAR", "TRANS_CAR_DRIVE", "TRANS_ROAD", "TRANS_ROAD_HWY", "TRAVEL", "TRAVEL_AIR", "TRAVEL_AIR_SEC", "TRAVEL_AIR_TERM", "TRAVEL_DOCS", "TRAVEL_DOCS_VISA", "TRAVEL_FLY", "TRAVEL_FLY_BOARD", "TRAVEL_FLY_DELAY", "TRAVEL_HOTEL", "TRAVEL_HOTEL_BOOK", "TRAVEL_HOTEL_ROOM", "TRAVEL_PROB", "TRAVEL_PROB_LOST", "TRAVEL_PROB_MISS", "TRAVEL_PUB", "TRAVEL_PUB_BUS", "TRAVEL_PUB_METRO", "TRAVEL_PUB_TRAIN", "TRAVEL_TOUR", "TRAVEL_TOUR_GUIDE", "TRAVEL_TOUR_SIGHT", "WORK", "WORK_BIZ", "WORK_BIZ_DEAL", "WORK_BIZ_FIN", "WORK_JOB", "WORK_JOB_HUNT", "WORK_JOB_TITLE", "WORK_OFF", "WORK_OFF_MAIL", "WORK_OFF_MEET"];
export declare function isGeneratedCategory(code: string): boolean;
export declare function isPlaceholderName(name: string): boolean;
export declare function n(code: string, name: string, children?: TaxNode[]): TaxNode;
export declare const APPROVED_TREE: TaxNode[];
export declare function flattenTree(nodes: TaxNode[]): TaxNode[];
export declare function treeCodes(nodes?: TaxNode[]): string[];
export declare function topLevelCodes(nodes?: TaxNode[]): string[];
export declare const WORDNET_MEMBER_TO_CODE: Record<string, string>;
export type LemmaRule = {
    kind: 'lemma';
    lemmas: string[];
    categoryCode: string;
    source: 'curated-lemma';
};
export type LemmaPosRule = {
    kind: 'lemma-pos';
    lemmas: string[];
    pos: string;
    categoryCode: string;
    source: 'lemma-pos';
};
export type GlossRule = {
    kind: 'gloss';
    lemmas?: string[];
    tokens: string[];
    categoryCode: string;
    source: 'gloss-token';
};
export type CuratedRule = LemmaRule | LemmaPosRule | GlossRule;
export type SenseLike = {
    lemma: string;
    pos: string;
    definition: string;
};
export declare function normalizeGloss(text: string): string;
export declare function hasWholeTokens(text: string, tokens: string[]): boolean;
export declare function matchesRule(sense: SenseLike, rule: CuratedRule): boolean;
export declare function classifyGeneratedLink(input: {
    categoryCode: string;
    lemma: string;
    definition: string;
}): 'dummy' | 'seed-pair' | 'accidental';
export type SeedPair = {
    domain: string;
    lemma: string;
    categoryCode: string;
};
export declare const SEED_PAIRS: SeedPair[];
export declare const SEED_PAIR_BY_DOMAIN: Record<string, SeedPair[]>;
export declare const CURATED_RULES: CuratedRule[];
