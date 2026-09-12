import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
export interface ActivityItemShape {
    senseId: number;
    entryId: number;
    lemma: string;
    normalizedLemma: string;
    partOfSpeech: string;
    displayForm: string | null;
    position: number;
    definition: string;
    cefrLevels: string[];
    frequencyRank: number | null;
    categories: Array<{
        code: string;
        name: string;
    }>;
    translations: Array<{
        id: number;
        text: string;
        senseLabel: string | null;
        matchMethod: string | null;
        matchConfidence: string | null;
    }>;
    examples: string[];
}
export declare function fetchActivitySenses(db: Prisma.TransactionClient | PrismaService, activityId: number): Promise<ActivityItemShape[]>;
export declare function senseIsInActivity(db: Prisma.TransactionClient | PrismaService, activityId: number, senseId: number): Promise<boolean>;
