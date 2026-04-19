import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { PartnerService } from './partner.service';

@Controller('partner')
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  /**
   * 提交合作申请
   */
  @Post('apply')
  async apply(@Body() body: any) {
    const { companyName, contactName, phone, email, businessType, description } = body;

    // 验证必填字段
    if (!companyName || !contactName || !phone) {
      return {
        code: 400,
        msg: '请填写完整信息',
        data: null,
      };
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return {
        code: 400,
        msg: '请输入正确的手机号',
        data: null,
      };
    }

    // 检查是否已申请
    const exists = await this.partnerService.checkPhoneExists(phone);
    if (exists) {
      return {
        code: 400,
        msg: '该手机号已提交过申请',
        data: null,
      };
    }

    try {
      const application = await this.partnerService.submitApplication({
        companyName,
        contactName,
        phone,
        email,
        businessType,
        description,
      });

      return {
        code: 200,
        msg: '提交成功',
        data: {
          id: application.id,
          status: application.status,
        },
      };
    } catch (error) {
      return {
        code: 500,
        msg: '提交失败，请稍后重试',
        data: null,
      };
    }
  }

  /**
   * 查询申请状态
   */
  @Get('status/:id')
  async getStatus(@Param('id') id: string) {
    const application = await this.partnerService.getApplicationById(id);

    if (!application) {
      return {
        code: 404,
        msg: '申请不存在',
        data: null,
      };
    }

    return {
      code: 200,
      msg: 'success',
      data: {
        id: application.id,
        companyName: application.company_name,
        status: application.status,
        createdAt: application.created_at,
        reviewedAt: application.reviewed_at,
        reviewerNote: application.reviewer_note,
      },
    };
  }

  /**
   * 获取合作申请列表（管理后台）
   */
  @Get('list')
  async getList(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '20',
    @Query('status') status?: string
  ) {
    const result = await this.partnerService.getApplications(
      parseInt(page),
      parseInt(pageSize),
      status
    );

    return {
      code: 200,
      msg: 'success',
      data: result,
    };
  }

  /**
   * 审核合作申请（管理后台）
   */
  @Post('review')
  async review(@Body() body: { id: string; status: 'approved' | 'rejected'; note?: string }) {
    const { id, status, note } = body;

    if (!id || !status) {
      return {
        code: 400,
        msg: '参数错误',
        data: null,
      };
    }

    try {
      const application = await this.partnerService.reviewApplication(id, status, note);

      return {
        code: 200,
        msg: '审核成功',
        data: {
          id: application.id,
          status: application.status,
        },
      };
    } catch (error) {
      return {
        code: 500,
        msg: '审核失败',
        data: null,
      };
    }
  }
}
