export class ListingInterestResponseDto {
  id!: string;

  title!: string;
}

export class InterestedUserResponseDto {
  id!: string;

  fullName!: string;

  phone?: string | null;

  avatarUrl?: string | null;

  createdAt?: string;
}

export class ListingInterestOnMyListingResponseDto {
  id!: string;

  listingId!: string;

  listingTitle!: string;

  userId!: string;

  fullName!: string;

  phone?: string | null;

  createdAt!: string;
}
