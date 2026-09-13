import {
  APPROVED_TREE,
  CURATED_RULES,
  HANDWRITTEN_CODES,
  PLACEHOLDER_NAME_RE,
  WORDNET_MEMBER_TO_CODE,
  classifyGeneratedLink,
  flattenTree,
  matchesRule,
  topLevelCodes,
} from './taxonomy-spec';

describe('approved taxonomy spec', () => {
  const flat = flattenTree(APPROVED_TREE);
  const codes = flat.map((node) => node.code);

  it('has 34 top-level domains', () => {
    expect(topLevelCodes()).toHaveLength(34);
  });

  it('preserves all 190 handwritten codes', () => {
    const missing = HANDWRITTEN_CODES.filter((code) => !codes.includes(code));
    expect(missing).toEqual([]);
    expect(HANDWRITTEN_CODES).toHaveLength(190);
  });

  it('does not recreate numbered placeholder names', () => {
    const placeholders = flat.filter((node) => PLACEHOLDER_NAME_RE.test(node.name));
    expect(placeholders).toEqual([]);
  });

  it('uses unique category codes', () => {
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('maps WordNet law and chemistry members', () => {
    expect(WORDNET_MEMBER_TO_CODE.law).toBe('LAW');
    expect(WORDNET_MEMBER_TO_CODE.chemistry).toBe('SCIENCE_CHEM');
    expect(WORDNET_MEMBER_TO_CODE.biology).toBe('SCIENCE_BIO');
  });

  it('does not map over-broad WordNet members', () => {
    expect(WORDNET_MEMBER_TO_CODE.sex).toBeUndefined();
    expect(WORDNET_MEMBER_TO_CODE.ball).toBeUndefined();
  });

  it('classifies dummy, seed-pair, and accidental generated links', () => {
    expect(
      classifyGeneratedLink({
        categoryCode: 'SCIENCE_ACTIONS_1',
        lemma: 'science01',
        definition: 'dummy',
      }),
    ).toBe('dummy');
    expect(
      classifyGeneratedLink({
        categoryCode: 'SCIENCE_BASICS_1',
        lemma: 'atom',
        definition: 'A chemical element particle',
      }),
    ).toBe('seed-pair');
    expect(
      classifyGeneratedLink({
        categoryCode: 'SCIENCE_ACTIONS_2',
        lemma: 'experimenter',
        definition: 'someone who tries things',
      }),
    ).toBe('accidental');
  });

  it('passes golden mapping rules', () => {
    expect(
      matchesRule(
        {
          lemma: 'bank',
          pos: 'noun',
          definition:
            'An institution where one can place and borrow money and take care of financial affairs.',
        },
        CURATED_RULES.find((rule) => rule.categoryCode === 'MONEY_BANK_ACC')!,
      ),
    ).toBe(true);
    expect(
      matchesRule(
        {
          lemma: 'bank',
          pos: 'noun',
          definition: 'An edge of river, lake, or other watercourse.',
        },
        CURATED_RULES.find(
          (rule) =>
            rule.kind === 'gloss' &&
            rule.categoryCode === 'GEO_LAND_RIV' &&
            rule.tokens.includes('watercourse'),
        )!,
      ),
    ).toBe(true);
    expect(
      matchesRule(
        {
          lemma: 'bank',
          pos: 'noun',
          definition: 'An edge of river, lake, or other watercourse.',
        },
        CURATED_RULES.find((rule) => rule.categoryCode === 'MONEY_BANK_ACC')!,
      ),
    ).toBe(false);
    expect(
      matchesRule(
        {
          lemma: 'boiling',
          pos: 'noun',
          definition:
            'The cooking of food by immersing it in liquid (usually water).',
        },
        CURATED_RULES.find((rule) => rule.categoryCode === 'FOOD_COOK_BOIL')!,
      ),
    ).toBe(true);
    expect(
      matchesRule(
        {
          lemma: 'atom',
          pos: 'noun',
          definition:
            'The smallest possible amount of matter which still retains its identity as a chemical element.',
        },
        CURATED_RULES.find((rule) => rule.categoryCode === 'SCIENCE_CHEM_ELEM')!,
      ),
    ).toBe(true);
    expect(
      CURATED_RULES.filter((rule) => rule.categoryCode === 'POLITICS_SYS_ELEC').some(
        (rule) =>
          matchesRule(
            {
              lemma: 'election',
              pos: 'noun',
              definition:
                'A process of choosing a leader, members of parliament, councillors, or other representatives.',
            },
            rule,
          ),
      ),
    ).toBe(true);
    expect(
      matchesRule(
        {
          lemma: 'volunteer',
          pos: 'noun',
          definition: 'A person who does unpaid work for a charity.',
        },
        CURATED_RULES.find((rule) => rule.categoryCode === 'CHARITY_VOL_VOL')!,
      ),
    ).toBe(true);
  });
});
