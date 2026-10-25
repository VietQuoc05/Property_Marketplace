export type ModerationDecision = 'APPROVE' | 'REJECT';
export type ModerationIntent = 'RENT' | 'ROOMMATE' | 'BUY_SELL' | 'UNKNOWN';

export interface ModerationResult {
  decision: ModerationDecision;
  confidence: number;
  intent: ModerationIntent;
  titleDescriptionMatch: boolean;
  imagesMatch: boolean;
  communityViolation: boolean;
  reasons: string[];
}

export interface ModerateListingJobData {
  listingId: string;
}
