import { ApiProperty } from '@nestjs/swagger';

export class PolishTranslation {
  @ApiProperty() id: number;
  @ApiProperty() text: string;
  @ApiProperty({ required: false }) senseLabel: string | null;
  @ApiProperty({ required: false }) matchMethod: string | null;
  @ApiProperty({ required: false }) matchConfidence: string | null;
}

export class VocabularyListItem {
  @ApiProperty() id: number;
  @ApiProperty() entryId: number;
  @ApiProperty() lemma: string;
  @ApiProperty() normalizedLemma: string;
  @ApiProperty() partOfSpeech: string;
  @ApiProperty({ required: false }) displayForm: string | null;
  @ApiProperty({
    description: 'Sense position within the entry (0-based, stable ID)',
  })
  position: number;
  @ApiProperty() definition: string;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ required: false }) senseIdHint: string | null;
  @ApiProperty({ type: [PolishTranslation] }) translations: PolishTranslation[];
  @ApiProperty({
    type: [String],
    description: 'Distinct CEFR levels for the sense',
  })
  cefrLevels: string[];
  @ApiProperty({
    type: Number,
    required: false,
    description: 'NGSL frequency rank (lower is more frequent)',
  })
  frequencyRank: number | null;
}

export class VocabularyDetailEntry {
  @ApiProperty() id: number;
  @ApiProperty() lemma: string;
  @ApiProperty() normalizedLemma: string;
  @ApiProperty() partOfSpeech: string;
  @ApiProperty() language: string;
  @ApiProperty({ required: false }) displayForm: string | null;
  @ApiProperty({ required: false }) wikidataQid: string | null;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
  @ApiProperty({ type: [Object], description: 'NGSL/other frequency rows' })
  frequency: Array<{
    rank: number | null;
    sfi: number | null;
    frequencyPerMillion: number | null;
  }>;
  @ApiProperty({ type: [Object] })
  senses: VocabularyDetailSense[];
}

export class VocabularyDetailSense {
  @ApiProperty() id: number;
  @ApiProperty() position: number;
  @ApiProperty() lemma: string;
  @ApiProperty() normalizedLemma: string;
  @ApiProperty() partOfSpeech: string;
  @ApiProperty() definition: string;
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ required: false }) senseIdHint: string | null;
  @ApiProperty({ required: false }) wikidataQid: string | null;
  @ApiProperty({ type: [PolishTranslation] }) translations: PolishTranslation[];
  @ApiProperty({ type: [Object], description: 'Example sentences' })
  examples: Array<{
    id: number;
    text: string;
    source: string;
    verification: string | null;
  }>;
  @ApiProperty({
    type: [Object],
    description: 'CEFR evidence with source attribution',
  })
  cefr: Array<{
    level: string;
    confidence: string;
    requiresReview: boolean;
    source: string | null;
  }>;
  @ApiProperty({ type: [Object], description: 'WordNet synset matches' })
  wordnet: Array<{
    synsetId: string;
    definition: string;
    members: string[];
    confidence: string;
    score: number | null;
  }>;
  @ApiProperty({ type: [Object], description: 'Assigned categories' })
  categories: Array<{ code: string; name: string }>;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class PaginatedList {
  @ApiProperty({ type: [VocabularyListItem] })
  data: VocabularyListItem[];
  @ApiProperty() meta: PaginatedMeta;
}
