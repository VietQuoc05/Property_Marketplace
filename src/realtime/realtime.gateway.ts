import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Socket.IO Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from auth or headers or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        (client.handshake.query?.token as string);

      if (token) {
        const secret = this.configService.get<string>('JWT_SECRET') || 'secret';
        const payload = this.jwtService.verify(token, { secret });
        const userId = payload.sub || payload.id;

        if (userId) {
          client.data.userId = userId;
          await client.join(`user:${userId}`);
          this.logger.log(`Client ${client.id} joined user:${userId}`);
        }
      }

      // Join feed room for everyone (including guests)
      await client.join('room:feed');
    } catch (err) {
      // Guest client or invalid token - still can join feed
      await client.join('room:feed');
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.join(`conversation:${data.conversationId}`);
      this.logger.log(`Client ${client.id} joined conversation:${data.conversationId}`);
    }
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.leave(`conversation:${data.conversationId}`);
    }
  }

  @SubscribeMessage('join:listing')
  handleJoinListing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { listingId: string },
  ) {
    if (data?.listingId) {
      client.join(`listing:${data.listingId}`);
    }
  }

  @SubscribeMessage('leave:listing')
  handleLeaveListing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { listingId: string },
  ) {
    if (data?.listingId) {
      client.leave(`listing:${data.listingId}`);
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId?: string },
  ) {
    const userId = client.data?.userId || data?.userId;
    if (data?.conversationId && userId) {
      client.to(`conversation:${data.conversationId}`).emit('typing:start', {
        conversationId: data.conversationId,
        userId,
      });
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId?: string },
  ) {
    const userId = client.data?.userId || data?.userId;
    if (data?.conversationId && userId) {
      client.to(`conversation:${data.conversationId}`).emit('typing:stop', {
        conversationId: data.conversationId,
        userId,
      });
    }
  }
}
