"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FsrsService = exports.FSRS_STATE_NAMES = void 0;
const common_1 = require("@nestjs/common");
const ts_fsrs_1 = require("ts-fsrs");
const RATING_TO_FSRS = {
    AGAIN: ts_fsrs_1.Rating.Again,
    HARD: ts_fsrs_1.Rating.Hard,
    GOOD: ts_fsrs_1.Rating.Good,
    EASY: ts_fsrs_1.Rating.Easy,
};
const STATE_TO_FSRS = {
    New: ts_fsrs_1.State.New,
    Learning: ts_fsrs_1.State.Learning,
    Review: ts_fsrs_1.State.Review,
    Relearning: ts_fsrs_1.State.Relearning,
};
exports.FSRS_STATE_NAMES = [
    'New',
    'Learning',
    'Review',
    'Relearning',
];
let FsrsService = class FsrsService {
    scheduler;
    constructor() {
        const params = (0, ts_fsrs_1.generatorParameters)({
            request_retention: 0.9,
            maximum_interval: 3650,
            enable_fuzz: true,
            enable_short_term: true,
        });
        this.scheduler = (0, ts_fsrs_1.fsrs)(params);
    }
    review(input, rating, now) {
        const card = {
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
    retrievability(stability, lastReview, now, due) {
        if (stability === null || stability <= 0)
            return null;
        if (lastReview === null)
            return null;
        let card;
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
                state: ts_fsrs_1.State.Review,
                last_review: lastReview,
            };
        }
        catch {
            return null;
        }
        try {
            return this.scheduler.get_retrievability(card, now, false);
        }
        catch {
            return null;
        }
    }
    retrievabilityOf(card) {
        return this.scheduler.get_retrievability({
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
        }, undefined, false);
    }
    toStateName(state) {
        switch (state) {
            case ts_fsrs_1.State.New:
                return 'New';
            case ts_fsrs_1.State.Learning:
                return 'Learning';
            case ts_fsrs_1.State.Review:
                return 'Review';
            case ts_fsrs_1.State.Relearning:
            default:
                return 'Relearning';
        }
    }
};
exports.FsrsService = FsrsService;
exports.FsrsService = FsrsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], FsrsService);
//# sourceMappingURL=fsrs.service.js.map