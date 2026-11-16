import { IsString } from 'class-validator';

export class CreateDirectMessageDto {
  @IsString()
  targetUserId!: string;

  @IsString()
  content!: string;

  listingId?: string;

  forumPostId?: string;
}

export class SendMessageDto {
  @IsString()
  content!: string;

  listingId?: string;

  forumPostId?: string;
}

export class MessageListingDto {
  id!: string;
  title!: string;
  listingType!: string;
  saleType!: string;
  size?: number | string | null;
  monthlyRent?: number | string | null;
  salePrice?: number | string | null;
  imageUrl?: string | null;
  address?: string | null;
}

export class MessageForumPostDto {
  id!: string;
  title!: string;
  detail!: string;
  needType?: string | null;
  needSaleType?: string | null;
  address?: string | null;
  authorName?: string | null;
}

export class ConversationResponseDto {
  id!: string;

  type!: string;

  contractId?: string | null;

  contract?: {
    id: string;
    name: string;
    status: string;
    landlordId: string;
  } | null;

  participants!: ParticipantResponseDto[];

  lastMessage?: MessageResponseDto | null;

  isArchived?: boolean;

  createdAt!: string;
}

export class ParticipantResponseDto {
  id!: string;

  userId!: string;

  fullName!: string;

  email!: string | null;

  phone?: string | null;

  avatarUrl?: string | null;

  lastReadAt?: string | null;

  isArchived?: boolean;
}

export class MessageResponseDto {
  id!: string;

  conversationId!: string;

  senderId!: string;

  content!: string;

  listingId?: string | null;

  listing?: MessageListingDto | null;

  forumPostId?: string | null;

  forumPost?: MessageForumPostDto | null;

  attachments?: string[];

  sentAt!: string;

  sender?: {
    id: string;
    fullName: string;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export class DirectMessageResponseDto {
  conversationId!: string;

  message?: MessageResponseDto | null;
}
