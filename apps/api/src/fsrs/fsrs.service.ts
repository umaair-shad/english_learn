import { Injectable } from '@nestjs/common';
import {
  CardInput,
  fsrs,
  generatorParameters,
  Grade,
  Rating,
  State,
} from 'ts-fsrs';

/**
 * Normalized rating accepted by the core scheduler.
 * Future activities must map their answer correctness to this rating.
 */
export type FsrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

/**
 * FSRS card state as understood by this application.
 */
export type FsrsStateName = 'New' | 'Learning' | 'Review' | 'Relearning';

export interface FsrsCardInput {
  /** When the card was last due (null for new cards). */
  due: Date | null;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: FsrsStateName;
  lastReview: Date | null;
}

export interface FsrsReviewOutcome {
  due: Date;
  stability: number;
  difficulty: number;
  state: FsrsStateName;
  reps: number;
  lapses: number;
  lastReview: Date;
  retrievability: number;
  /** Whole days until the next review (for display / ordering). */
  scheduledDays: number;
}

const RATING_TO_FSRS: Record<FsrsRating, Grade> = {
  AGAIN: Rating.Again,
  HARD: Rating.Hard,
  GOOD: Rating.Good,
  EASY: Rating.Easy,
};

const STATE_TO_FSRS: Record<FsrsStateName, State> = {
  New: State.New,
  Learning: State.Learning,
  Review: State.Review,
  Relearning: State.Relearning,
};

export const FSRS_STATE_NAMES: FsrsStateName[] = [
  'New',
  'Learning',
  'Review',
  'Relearning',
];

/**
 * Thin, dependency-isolated wrapper around the maintained `ts-fsrs`
 * implementation (official open-spaced-repetition/task). All scheduling
 * decisions in this milestone flow through here so future activities never
 * reimplement FSRS.
 */
@Injectable()
export class FsrsService {
  private readonly scheduler;

  constructor() {
    const params = generatorParameters({
      request_retention: 0.9,
      maximum_interval: 3650,
      enable_fuzz: true,
      enable_short_term: true,
    });
    this.scheduler = fsrs(params);
  }

  /**
   * Runs one FSRS review and returns the post-review card state.
   * Safe for both first reviews and continuation reviews -- the scheduler
   * derives delta_t internally from `lastReview`.
   */
  review(
    input: FsrsCardInput,
    rating: FsrsRating,
    now: Date,
  ): FsrsReviewOutcome {
    const card: CardInput = {
      due: input.due ?? now,
      stability: input.stability,
      difficulty: input.difficulty,
      elapsed_days: 0,
      scheduled_days: 0,
      learning_steps: 0,
      reps: input.reps,
      lapses: input.lapses,
      state: STATE_TO_FSRS[input.state],
      last_review: input.lastReview ?? null,
    };

    const item = this.scheduler.next(card, now, RATING_TO_FSRS[rating]);
    const next = item.card;
    const log = item.log;

    const retrievability = this.retrievabilityOf(next);

    return {
      due: next.due,
      stability: next.stability,
      difficulty: next.difficulty,
      state: this.toStateName(next.state),
      reps: next.reps,
      lapses: next.lapses,
      lastReview: next.last_review ?? now,
      retrievability,
      scheduledDays: log.scheduled_days,
    };
  }

  /**
   * Current probability of recall for a card, computed from its stored
   * stability and the time elapsed since the last review.
   */
  retrievability(
    stability: number | null,
    lastReview: Date | null,
    now: Date,
    due?: Date | null,
  ): number | null {
    if (stability === null || stability <= 0) return null;
    if (lastReview === null) return null;

    let card: CardInput;
    try {
      card = {
        due: due ?? now,
        stability,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: State.Review,
        last_review: lastReview,
      };
    } catch {
      return null;
    }

    try {
      return this.scheduler.get_retrievability(card, now, false);
    } catch {
      return null;
    }
  }

  /** Retrievability right after a scheduling run. */
  private retrievabilityOf(card: {
    due: Date;
    stability: number;
    difficulty: number;
    state: State;
    last_review?: Date;
  }): number {
    return this.scheduler.get_retrievability(
      {
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: 0,
        scheduled_days: 0,
        learning_steps: 0,
        reps: 0,
        lapses: 0,
        state: card.state,
        last_review: card.last_review ?? undefined,
      },
      undefined,
      false,
    );
  }

  private toStateName(state: State): FsrsStateName {
    switch (state) {
      case State.New:
        return 'New';
      case State.Learning:
        return 'Learning';
      case State.Review:
        return 'Review';
      case State.Relearning:
      default:
        return 'Relearning';
    }
  }
}
