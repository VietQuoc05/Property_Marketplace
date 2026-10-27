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
   * following strict 4-step sequential moderation pipeline.
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

      // 1. Prepare image parts: process ALL uploaded images (never drop any image!)
      const imagesToProcess = data.imageUrls || [];
      for (const imageUrl of imagesToProcess) {
        try {
          const imagePart = await this.fetchImageInlineData(imageUrl);
          if (imagePart) {
            parts.push(imagePart);
          } else {
            this.logger.warn(`Could not load image data for: ${imageUrl}`);
          }
        } catch (imgErr) {
          this.logger.warn(
            `Failed to download listing image for moderation: ${imageUrl}`,
            imgErr,
          );
        }
      }

      // 2. Prepare structured 4-step prompt
      const prompt = `Bạn là hệ thống AI kiểm duyệt tin đăng bất động sản chuyên nghiệp cho nền tảng "Homers Property".
Nhiệm vụ của bạn là đánh giá tính hợp lệ của bài đăng dựa trên Tiêu đề (Title), Mô tả (Description) và Danh sách Hình ảnh đính kèm theo quy trình 4 BƯỚC TUẦN TỰ sau:

=== BƯỚC 1: KIỂM DUYỆT TIÊU ĐỀ (TITLE) ===
Tiêu đề BẮT BUỘC phải liên quan đến lĩnh vực Bất động sản (mua bán, cho thuê nhà, căn hộ, chung cư, phòng trọ, đất đai, mặt bằng, văn phòng, tìm bạn ở ghép...).
1.1. Nếu Tiêu đề vi phạm tiêu chuẩn cộng đồng (chứa từ ngữ 18+, khiêu dâm, bạo lực, thô tục, lừa đảo):
     -> Đánh dấu: titleValid = false, titleViolationReason = "Tiêu đề vi phạm tiêu chuẩn cộng đồng"
1.2. Nếu Tiêu đề không liên quan đến bất động sản (ví dụ: rao bán xe ô tô, xe máy, Fortuner, xe tải, bán điện thoại, tuyển dụng, cho vay tiền, cờ bạc, đa cấp, mua bán đồ gia dụng linh tinh...):
     -> Đánh dấu: titleValid = false, titleViolationReason = "Tiêu đề không liên quan đến bất động sản"
1.3. Nếu Tiêu đề hợp lệ liên quan đến bất động sản:
     -> Đánh dấu: titleValid = true, titleViolationReason = null

=== BƯỚC 2: KIỂM DUYỆT MÔ TẢ (DESCRIPTION) ===
2.1. Nếu Mô tả vi phạm tiêu chuẩn cộng đồng (chứa từ ngữ 18+, khiêu dâm, bạo lực, xúc phạm, lừa đảo):
     -> Đánh dấu: descriptionValid = false, descriptionViolationReason = "Mô tả vi phạm tiêu chuẩn cộng đồng"
2.2. Nếu Mô tả dùng để quảng cáo dịch vụ cấm hoặc bán sản phẩm phi bất động sản (rao bán xe, điện thoại, sim số, cho vay tiền, cờ bạc...):
     -> Đánh dấu: descriptionValid = false, descriptionViolationReason = "Mô tả không liên quan đến bất động sản"
2.3. LƯU Ý ĐẶC BIỆT: Mô tả ngắn gọn chỉ ghi thông tin liên hệ (như "Zalo: 0903...", "Liên hệ chính chủ", "Xem nhà báo trước 30 phút", "Giá thương lượng", "Miễn trung gian"...) hoặc bỏ trống -> HOÀN TOÀN HỢP LỆ.
     -> Đánh dấu: descriptionValid = true, descriptionViolationReason = null

=== BƯỚC 3: KIỂM DUYỆT HÌNH ẢNH (IMAGES) ===
Phải kiểm tra kỹ TẤT CẢ các ảnh được cung cấp:
3.1. NGUYÊN TẮC BẤT DI BẤT DỊCH VỀ 18+ / NHẠY CẢM:
     Nếu CÓ BẤT KỲ ẢNH NÀO chứa nội dung 18+, khỏa thân, bán khỏa thân, hở hang bộ phận nhạy cảm, gợi dục, bạo lực, vũ khí, máu me:
     -> BẮT BUỘC ĐÁNH DẤU: imagesValid = false, imagesViolationReason = "Hình ảnh vi phạm tiêu chuẩn cộng đồng" (LẬP TỨC TỪ CHỐI BÀI ĐĂNG!)
3.2. Nếu ảnh không phải là bất động sản (ảnh meme, hoạt hình, đồ ăn, xe cộ, động vật, ảnh selfie chân dung người, rác rưởi...):
     -> Đánh dấu: imagesValid = false, imagesViolationReason = "Hình ảnh không liên quan đến bất động sản"
3.3. Nếu tất cả các ảnh đều là hình ảnh bất động sản (nhà, phòng ngủ, phòng khách, nhà vệ sinh, chung cư, nội thất, ban công, view, tòa nhà, đất đai, ngõ hẻm...) và không có ảnh nhạy cảm:
     -> Đánh dấu: imagesValid = true, imagesViolationReason = null

=== BƯỚC 4: XÉT TÍNH TƯƠNG THÍCH (CHỈ XÉT KHI CẢ BƯỚC 1, 2, 3 ĐỀU ĐẠT - VALID) ===
Nếu bất kỳ bước nào trong Bước 1, 2, 3 bị vi phạm, BỎ QUA Bước 4.
Chỉ khi titleValid = true, descriptionValid = true VÀ imagesValid = true, mới xét:

4.1. Tính liên quan giữa Tiêu đề và Mô tả:
     - Description KHÔNG BẮT BUỘC phải nhắc lại Tiêu đề (như đã nêu ở Bước 2.3).
     - Chỉ đánh dấu mâu thuẫn khi có sự ĐỐI NGHỊCH RÕ RÀNG VỀ LOẠI HÌNH BẤT ĐỘNG SẢN:
       Ví dụ: Tiêu đề ghi "Bán đất nền", nhưng Mô tả lại ghi "Cho thuê căn hộ chung cư 2 phòng ngủ full nội thất".
     - Nếu có mâu thuẫn rõ rệt:
       -> Đánh dấu: titleDescriptionConsistent = false, titleDescriptionMismatchReason = "Tiêu đề và mô tả mâu thuẫn nhau"
     - Nếu không mâu thuẫn:
       -> Đánh dấu: titleDescriptionConsistent = true, titleDescriptionMismatchReason = null

4.2. Tính liên quan giữa Hình ảnh và Tiêu đề:
     - QUY TẮC: "Chỉ loại khi mâu thuẫn QUÁ LỘ LIỄU".
     - Ví dụ mâu thuẫn quá lộ liễu: Tiêu đề ghi "Bán căn hộ chung cư cao cấp", nhưng TOÀN BỘ hình ảnh chỉ chụp một bãi đất trống hoang sơ không có nhà cửa/công trình.
     - Còn nếu Tiêu đề là chung cư mà hình ảnh chụp tòa nhà, view ban công, phòng khách, khuôn viên -> HOÀN TOÀN HỢP LỆ.
     - Nếu mâu thuẫn quá lộ liễu:
       -> Đánh dấu: imagesTitleConsistent = false, imagesTitleMismatchReason = "Hình ảnh mâu thuẫn với tiêu đề"
     - Nếu phù hợp hoặc có thể chấp nhận được:
       -> Đánh dấu: imagesTitleConsistent = true, imagesTitleMismatchReason = null

=== QUY TẮC KẾT LUẬN (DECISION & REASONS) ===
- Nếu có bất kỳ lý do vi phạm nào được ghi nhận ở trên:
  * decision = "REJECT"
  * reasons = mảng chứa đúng các chuỗi lý do vi phạm đã xác định (không giải thích dông dài, không mô tả chi tiết ảnh).
- Nếu không có bất kỳ vi phạm nào:
  * decision = "APPROVE"
  * reasons = []

THÔNG TIN BÀI ĐĂNG CẦN DUYỆT:
- Tiêu đề: ${data.title}
- Mô tả: ${data.description || 'Không có mô tả'}
- Loại hình: ${data.listingType || 'Không xác định'}
- Hình thức: ${data.saleType || 'Không xác định'}
- Tổng số lượng ảnh kèm theo: ${parts.length} ảnh

YÊU CẦU ĐẦU RA:
Trả về BẮT BUỘC định dạng JSON chuẩn theo Schema sau:
{
  "titleValid": boolean,
  "titleViolationReason": string | null,
  "descriptionValid": boolean,
  "descriptionViolationReason": string | null,
  "imagesValid": boolean,
  "imagesViolationReason": string | null,
  "titleDescriptionConsistent": boolean,
  "titleDescriptionMismatchReason": string | null,
  "imagesTitleConsistent": boolean,
  "imagesTitleMismatchReason": string | null,
  "decision": "APPROVE" | "REJECT",
  "confidence": number,
  "intent": "RENT" | "ROOMMATE" | "BUY_SELL" | "UNKNOWN",
  "reasons": string[]
}`;

      parts.unshift(prompt);

      const candidateModels = [
        this.modelName,
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
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
   * Safely parses JSON response from Gemini according to standardized criteria.
   */
  private parseModerationResponse(text: string): ModerationResult {
    try {
      const cleanJson = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(cleanJson);
      const reasons: string[] = [];

      // 1. Title violation check
      if (parsed.titleValid === false && parsed.titleViolationReason) {
        reasons.push(parsed.titleViolationReason);
      }

      // 2. Description violation check
      if (parsed.descriptionValid === false && parsed.descriptionViolationReason) {
        reasons.push(parsed.descriptionViolationReason);
      }

      // 3. Images violation check (Nudity/18+ or non-real estate)
      if (parsed.imagesValid === false && parsed.imagesViolationReason) {
        reasons.push(parsed.imagesViolationReason);
      }

      // 4. Consistency checks (Only if Title, Description, and Images are all individually valid)
      const allComponentsValid =
        parsed.titleValid !== false &&
        parsed.descriptionValid !== false &&
        parsed.imagesValid !== false;

      if (allComponentsValid) {
        if (
          parsed.titleDescriptionConsistent === false &&
          parsed.titleDescriptionMismatchReason
        ) {
          reasons.push(parsed.titleDescriptionMismatchReason);
        }

        if (
          parsed.imagesTitleConsistent === false &&
          parsed.imagesTitleMismatchReason
        ) {
          reasons.push(parsed.imagesTitleMismatchReason);
        }
      }

      // Fallback: If AI marked REJECT with parsed.reasons and reasons list is empty
      if (reasons.length === 0 && parsed.decision === 'REJECT') {
        if (Array.isArray(parsed.reasons) && parsed.reasons.length > 0) {
          reasons.push(...parsed.reasons);
        } else {
          reasons.push('Nội dung không phù hợp với tiêu chuẩn kiểm duyệt');
        }
      }

      const uniqueReasons = Array.from(new Set(reasons));
      const decision: ModerationDecision =
        uniqueReasons.length === 0 && parsed.decision === 'APPROVE'
          ? 'APPROVE'
          : 'REJECT';

      const validIntents = ['RENT', 'ROOMMATE', 'BUY_SELL', 'UNKNOWN'];
      const intent = validIntents.includes(parsed.intent)
        ? parsed.intent
        : 'UNKNOWN';

      const hasCommunityViolation = uniqueReasons.some((r) =>
        r.toLowerCase().includes('tiêu chuẩn cộng đồng'),
      );

      return {
        decision,
        confidence:
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
        intent,
        titleDescriptionMatch: parsed.titleDescriptionConsistent !== false,
        imagesMatch:
          parsed.imagesValid !== false &&
          parsed.imagesTitleConsistent !== false,
        communityViolation: hasCommunityViolation,
        reasons: uniqueReasons,
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
}
