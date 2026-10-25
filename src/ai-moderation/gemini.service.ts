import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { ModerationDecision, ModerationResult } from './ai-moderation.interface';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly aiClient: GoogleGenAI | null = null;
  private readonly modelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY;

    this.modelName =
      this.configService.get<string>('GEMINI_MODERATION_MODEL') ||
      process.env.GEMINI_MODERATION_MODEL ||
      'gemini-3.5-flash-lite';

    if (apiKey && apiKey.trim().length > 0) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey });
        this.logger.log(
          `GeminiService initialized successfully with model: ${this.modelName}`,
        );
      } catch (err) {
        this.logger.error('Failed to initialize GoogleGenAI client', err);
      }
    } else {
      this.logger.warn(
        'GEMINI_API_KEY is not configured. AI Moderation will REJECT listings until configured.',
      );
    }
  }

  /**
   * Moderates listing content (title, description, images) using Gemini API
   */
  async moderateListing(data: {
    id: string;
    title: string;
    description?: string | null;
    listingType?: string;
    saleType?: string;
    imageUrls?: string[];
  }): Promise<ModerationResult> {
    if (!this.aiClient) {
      this.logger.warn(
        `Listing ${data.id}: No GEMINI_API_KEY available. Setting to REJECT.`,
      );
      return {
        decision: 'REJECT',
        confidence: 0.5,
        intent: 'UNKNOWN',
        titleDescriptionMatch: false,
        imagesMatch: false,
        communityViolation: false,
        reasons: ['Hệ thống AI chưa được cấu hình API Key. Tin đăng bị từ chối.'],
      };
    }

    try {
      const parts: any[] = [];

      // 1. Prepare image parts (take up to 5 images for speed and token limits)
      const imagesToProcess = (data.imageUrls || []).slice(0, 5);
      for (const imageUrl of imagesToProcess) {
        try {
          const imagePart = await this.fetchImageInlineData(imageUrl);
          if (imagePart) {
            parts.push(imagePart);
          }
        } catch (imgErr) {
          this.logger.warn(
            `Failed to download listing image for moderation: ${imageUrl}`,
            imgErr,
          );
        }
      }

      // 2. Prepare text prompt
      const prompt = `Bạn là hệ thống AI kiểm duyệt bài đăng cho ứng dụng "Homers Property" (Nền tảng cho phép user đăng tin bán, cho thuê bất động sản).

Nhiệm vụ của bạn là đánh giá tính hợp lệ của bài đăng dựa trên Tiêu đề, Mô tả và Danh sách Hình ảnh đính kèm.

QUY TẮC ĐÁNH GIÁ:
1. Ý ĐỊNH (INTENT): Bài đăng BẮT BUỘC phải liên quan đến:
- Cho thuê (Phòng trọ, chung cư, nhà nguyên căn, mặt bằng, đất, văn phòng, tìm bạn ở ghép)
- Bán (Bất động sản)
* TỪ CHỐI (REJECT) nếu là: Bán đồ đạc thanh lý không liên quan, tâm sự rác, quảng cáo dịch vụ khác (vay tín dụng, làm bằng cấp, cờ bạc, đa cấp...).

2. SỰ TƯƠNG THÍCH (TITLE - DESC - IMAGES):
- Tiêu đề và Mô tả phải thống nhất về mặt nội dung.
- Các HÌNH ẢNH phải mô tả bất động sản (phòng ngủ, nhà vệ sinh, không gian sống, ban công, lối đi, bản đồ vị trí, toà nhà...).
* TỪ CHỐI nếu ảnh là: Ảnh mạng không liên quan (xe máy, đồ ăn, ảnh động vật, meme, ảnh người nổi tiếng, ảnh nhạy cảm 18+, ảnh bạo lực).

3. TIÊU CHUẨN CỘNG ĐỒNG:
- Không chứa ngôn từ thù ghét, xúc phạm, đồi trụy, lừa đảo rõ ràng.

QUY ĐỊNH VỀ LÝ DO TỪ CHỐI (reasons):
- TUYỆT ĐỐI KHÔNG giải thích chi tiết ảnh vi phạm chứa cụ thể nội dung gì (KHÔNG miêu tả ảnh anime, hoạt hình, Doraemon, xe cộ, đồ ăn, meme, người, v.v.).
- Nếu hình ảnh không phải là bất động sản: BẮT BUỘC chỉ ghi chính xác câu: "Hình ảnh không liên quan đến bất động sản".
- Nếu hình ảnh chứa nội dung 18+, nhạy cảm, đồi trụy, vũ khí, bạo lực hoặc vi phạm tiêu chuẩn cộng đồng: BẮT BUỘC chỉ ghi chính xác câu: "Hình ảnh vi phạm tiêu chuẩn cộng đồng".
- Nếu Tiêu đề hoặc Mô tả vi phạm tiêu chuẩn cộng đồng: Ghi "Nội dung vi phạm tiêu chuẩn cộng đồng".
- Nếu Tiêu đề hoặc Mô tả không liên quan đến bất động sản: Ghi "Nội dung không liên quan đến bất động sản".
- Nếu Tiêu đề và Mô tả mâu thuẫn nhau: Ghi "Tiêu đề và mô tả không khớp nhau".

THÔNG TIN BÀI ĐĂNG CẦN DUYỆT:
- Tiêu đề: ${data.title}
- Mô tả: ${data.description || 'Không có mô tả'}
- Loại hình: ${data.listingType || 'Không xác định'}
- Hình thức: ${data.saleType || 'Không xác định'}
- Số lượng ảnh kèm theo: ${parts.length}

YÊU CẦU ĐẦU RA:
Trả về BẮT BUỘC định dạng JSON chuẩn theo Schema sau:
{
  "decision": "APPROVE" | "REJECT",
  "confidence": number, // từ 0.0 đến 1.0
  "intent": "RENT" | "ROOMMATE" | "BUY_SELL" | "UNKNOWN",
  "titleDescriptionMatch": boolean,
  "imagesMatch": boolean,
  "communityViolation": boolean,
  "reasons": string[] // Danh sách các lý do chuẩn hóa theo quy định trên nếu bị REJECT, nếu APPROVE thì để mảng rỗng []
}`;

      parts.unshift(prompt);

      const candidateModels = [
        this.modelName,
        'gemini-3.8-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
      ].filter((m, i, arr) => m && arr.indexOf(m) === i);

      let response: any = null;
      let lastError: any = null;

      for (const model of candidateModels) {
        try {
          response = await this.aiClient.models.generateContent({
            model,
            contents: parts,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          });
          if (response?.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          this.logger.warn(
            `Gemini model ${model} failed, attempting next fallback model: ${err?.message || err}`,
          );
        }
      }

      if (!response?.text) {
        throw lastError || new Error('No response from any Gemini model');
      }

      const rawText = response.text || '';
      return this.parseModerationResponse(rawText);
    } catch (error: any) {
      this.logger.error(
        `Gemini API moderation error for listing ${data.id}: ${error?.message || error}`,
      );

      return {
        decision: 'REJECT',
        confidence: 0.5,
        intent: 'UNKNOWN',
        titleDescriptionMatch: false,
        imagesMatch: false,
        communityViolation: false,
        reasons: [
          `Lỗi hệ thống khi gọi AI kiểm duyệt: ${error?.message || 'Gemini API Error'}. Vui lòng thử lại.`,
        ],
      };
    }
  }

  /**
   * Helper to fetch an image and format as optimized inlineData for Gemini
   * (Resizes to max 512px WebP to minimize token consumption and payload size)
   */
  private async fetchImageInlineData(
    url: string,
  ): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuffer);

      // Cấp độ 2: Tối ưu chuyên sâu cho AI Worker:
      // Resize về tối đa 512px, nén WebP quality 70.
      // Kích thước này nằm gọn trong 1 single tile (~258 tokens) của Gemini Vision,
      // dung lượng Base64 payload cực nhỏ (~30-50KB) giúp AI Worker xử lý tức thì.
      const aiOptimizedBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({
          width: 512,
          height: 512,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 70 })
        .toBuffer();

      return {
        inlineData: {
          data: aiOptimizedBuffer.toString('base64'),
          mimeType: 'image/webp',
        },
      };
    } catch (error) {
      this.logger.warn(
        `Failed to process image for AI moderation: ${url}`,
        error,
      );
      return null;
    }
  }

  /**
   * Helper to safely parse JSON response from Gemini
   */
  private parseModerationResponse(text: string): ModerationResult {
    try {
      // Strip any markdown codeblock backticks if present
      const cleanJson = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanJson);

      const decision: ModerationDecision =
        parsed.decision === 'APPROVE' ? 'APPROVE' : 'REJECT';

      const validIntents = ['RENT', 'ROOMMATE', 'BUY_SELL', 'UNKNOWN'];
      const intent = validIntents.includes(parsed.intent)
        ? parsed.intent
        : 'UNKNOWN';

      const reasons =
        decision === 'APPROVE'
          ? []
          : this.sanitizeReasons(
              Array.isArray(parsed.reasons) ? parsed.reasons : [],
              parsed,
            );

      return {
        decision,
        confidence:
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        intent,
        titleDescriptionMatch:
          typeof parsed.titleDescriptionMatch === 'boolean'
            ? parsed.titleDescriptionMatch
            : true,
        imagesMatch:
          typeof parsed.imagesMatch === 'boolean' ? parsed.imagesMatch : true,
        communityViolation:
          typeof parsed.communityViolation === 'boolean'
            ? parsed.communityViolation
            : false,
        reasons,
      };
    } catch (parseErr) {
      this.logger.error(
        `Failed to parse Gemini moderation response: "${text}"`,
        parseErr,
      );

      return {
        decision: 'REJECT',
        confidence: 0.5,
        intent: 'UNKNOWN',
        titleDescriptionMatch: false,
        imagesMatch: false,
        communityViolation: false,
        reasons: ['Không thể phân tích phản hồi từ AI kiểm duyệt.'],
      };
    }
  }

  /**
   * Sanitizes and standardizes rejection reasons.
   * Ensures no detailed descriptions of image contents are leaked,
   * strictly mapping them to user-specified standard messages.
   */
  private sanitizeReasons(rawReasons: string[], parsed: any): string[] {
    const sanitized: string[] = [];

    for (const r of rawReasons) {
      const lower = r.toLowerCase();

      // 1. Violations of community standards (18+, nudity, weapons, violence, hate speech)
      const isCommunityViolation =
        lower.includes('18+') ||
        lower.includes('nhạy cảm') ||
        lower.includes('đồi trụy') ||
        lower.includes('vũ khí') ||
        lower.includes('bạo lực') ||
        lower.includes('tiêu chuẩn cộng đồng') ||
        lower.includes('khiêu dâm') ||
        lower.includes('thù ghét');

      const isImageRelated =
        lower.includes('hình ảnh') ||
        lower.includes('ảnh') ||
        lower.includes('image');

      if (isCommunityViolation) {
        if (isImageRelated) {
          sanitized.push('Hình ảnh vi phạm tiêu chuẩn cộng đồng');
        } else {
          sanitized.push('Nội dung vi phạm tiêu chuẩn cộng đồng');
        }
      } else if (isImageRelated) {
        // Any other image rejection (meme, anime, cartoon, car, food, animal, celebrity, etc.)
        sanitized.push('Hình ảnh không liên quan đến bất động sản');
      } else if (
        lower.includes('tiêu đề') &&
        (lower.includes('mô tả') ||
          lower.includes('thống nhất') ||
          lower.includes('khớp'))
      ) {
        sanitized.push('Tiêu đề và mô tả không khớp nhau');
      } else if (
        lower.includes('bất động sản') ||
        lower.includes('cho thuê') ||
        lower.includes('bán') ||
        lower.includes('thanh lý') ||
        lower.includes('vay') ||
        lower.includes('quảng cáo')
      ) {
        sanitized.push('Nội dung không liên quan đến bất động sản');
      } else {
        // For general violations not mentioning image specifics
        sanitized.push(r);
      }
    }

    // Safety checks against parsed flags if rawReasons was empty or incomplete
    if (parsed.communityViolation) {
      if (parsed.imagesMatch === false) {
        sanitized.push('Hình ảnh vi phạm tiêu chuẩn cộng đồng');
      } else {
        sanitized.push('Nội dung vi phạm tiêu chuẩn cộng đồng');
      }
    }

    if (parsed.imagesMatch === false) {
      if (!sanitized.includes('Hình ảnh vi phạm tiêu chuẩn cộng đồng')) {
        sanitized.push('Hình ảnh không liên quan đến bất động sản');
      }
    }

    if (parsed.intent === 'UNKNOWN') {
      if (!sanitized.includes('Hình ảnh không liên quan đến bất động sản')) {
        sanitized.push('Nội dung không liên quan đến bất động sản');
      }
    }

    if (parsed.titleDescriptionMatch === false) {
      sanitized.push('Tiêu đề và mô tả không khớp nhau');
    }

    if (sanitized.length === 0) {
      sanitized.push('Hình ảnh không liên quan đến bất động sản');
    }

    return Array.from(new Set(sanitized));
  }
}
