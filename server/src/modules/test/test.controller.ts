import { Controller, Post, Get, Logger } from '@nestjs/common';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabase = getSupabaseClient();

@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name);

  /**
   * 初始化测试数据
   * 创建测试用户、宴会、商品等数据
   */
  @Post('init-data')
  async initData() {
    this.logger.log('开始初始化测试数据...');

    try {
      // 1. 创建测试用户
      await this.createTestUsers();

      // 2. 创建测试宴会
      await this.createTestBanquets();

      // 3. 创建商户账户
      await this.createMerchantAccount();

      // 4. 创建回礼设置
      await this.createReturnGiftSettings();

      this.logger.log('测试数据初始化完成');

      return {
        code: 200,
        msg: '初始化成功',
        data: {
          message: '已创建测试用户、宴会、商品等数据',
        },
      };
    } catch (error: any) {
      this.logger.error('初始化测试数据失败:', error);
      return {
        code: 500,
        msg: '初始化失败: ' + error.message,
        data: null,
      };
    }
  }

  /**
   * 创建测试用户
   */
  private async createTestUsers() {
    const users = [
      {
        openid: 'test_host_openid',
        nickname: '张三',
        avatar_url:
          'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUqQZEZcsTibWvLkXgGNMBtBvEYnLcibEJOaL1MvZ5oTnLJxaWnFiaTdjBcibtibA/132',
        phone: '13800138001',
        status: 'active',
      },
      {
        openid: 'test_guest_openid_1',
        nickname: '李四',
        avatar_url:
          'https://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKGEMric1n8LqWQ4n7icF2WcMNpBdDrMshCiciaFibhU7ibHFHzwV0y8bZ3y7rDJvYQElvYMdTGHF2QrP2g/132',
        phone: '13800138002',
        status: 'active',
      },
      {
        openid: 'test_guest_openid_2',
        nickname: '王五',
        avatar_url:
          'https://thirdwx.qlogo.cn/mmopen/vi_32/PiajxSqBRaEJ8yQC1Kibj1u7GxAvuW6c1e0P5a8lWPy7aV8ic1uJT1UFwV3PHVF2VK5LcF9fibFwviaJc1SZkNGicFTw/132',
        phone: '13800138003',
        status: 'active',
      },
    ];

    for (const user of users) {
      const { error } = await supabase.from('users').upsert(user, { onConflict: 'openid' });

      if (error) {
        this.logger.error(`创建用户失败: ${user.nickname}`, error);
      }
    }

    this.logger.log('测试用户创建完成');
  }

  /**
   * 创建测试宴会
   */
  private async createTestBanquets() {
    const banquet1Id = 'test_banquet_001';
    const banquet2Id = 'test_banquet_002';

    const banquets = [
      {
        id: banquet1Id,
        name: '张三&李四婚礼',
        host_openid: 'test_host_openid',
        banquet_type: 'wedding',
        event_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后
        location: '山西省太原市迎泽区迎泽大街189号 迎泽宾馆',
        status: 'active',
        cover_image:
          'https://img.alicdn.com/imgextra/i4/2215305267075/O1CN01FJgkES1h6CgrgYqKF_!!2215305267075.jpg',
        description: '诚邀您参加我们的婚礼，共同见证这一幸福时刻！',
        guest_code: 'TEST001',
      },
      {
        id: banquet2Id,
        name: '王总六十大寿',
        host_openid: 'test_host_openid',
        banquet_type: 'birthday',
        event_time: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14天后
        location: '山西省太原市杏花岭区解放路175号 汾酒大厦',
        status: 'active',
        cover_image:
          'https://img.alicdn.com/imgextra/i3/2215305267075/O1CN01uQjm9r1h6CgjT3QZL_!!2215305267075.jpg',
        description: '恭候您的光临，共庆花甲之喜！',
        guest_code: 'TEST002',
      },
    ];

    for (const banquet of banquets) {
      const { error } = await supabase.from('banquets').upsert(banquet, { onConflict: 'id' });

      if (error) {
        this.logger.error(`创建宴会失败: ${banquet.name}`, error);
      }
    }

    this.logger.log('测试宴会创建完成');
  }

  /**
   * 创建商户账户（用于红包发放）
   */
  private async createMerchantAccount() {
    const merchant = {
      id: 'merchant_001',
      openid: 'test_host_openid',
      merchant_name: '张三商户账户',
      status: 'approved',
      balance: 1000000, // 10000元（分）
    };

    const { error } = await supabase
      .from('merchant_accounts')
      .upsert(merchant, { onConflict: 'id' });

    if (error) {
      this.logger.error('创建商户账户失败:', error);
    } else {
      this.logger.log('商户账户创建完成');
    }
  }

  /**
   * 创建回礼设置
   */
  private async createReturnGiftSettings() {
    const settings = [
      {
        banquet_id: 'test_banquet_001',
        red_packet_enabled: true,
        red_packet_amount: 680, // 6.8元红包
        mall_gift_enabled: true,
        mall_gift_items: [
          {
            product_id: 'prod_001',
            product_name: '喜之郎经典喜糖礼盒',
            product_price: 5800,
            product_image:
              'https://img.alicdn.com/imgextra/i4/2215305267075/O1CN01FJgkES1h6CgrgYqKF_!!2215305267075.jpg',
            total_count: 100,
            remaining_count: 100,
          },
        ],
        onsite_gift_enabled: true,
        onsite_gift_items: [
          {
            id: 'onsite_001',
            name: '精美保温杯',
            image:
              'https://img.alicdn.com/imgextra/i3/2215305267075/O1CN01oUZbDC1h6Cgo4zXhB_!!2215305267075.jpg',
            price: 15800,
            total_count: 50,
            remaining_count: 50,
          },
        ],
        gift_claim_mode: 'choose_one',
        total_budget: 218000,
      },
    ];

    for (const setting of settings) {
      const { error } = await supabase
        .from('return_gift_settings')
        .upsert(setting, { onConflict: 'banquet_id' });

      if (error) {
        this.logger.error('创建回礼设置失败:', error);
      }
    }

    this.logger.log('回礼设置创建完成');
  }

  /**
   * 清理测试数据
   */
  @Post('clear-data')
  async clearData() {
    this.logger.log('开始清理测试数据...');

    try {
      // 删除测试用户创建的数据
      await supabase.from('guest_return_gifts').delete().like('guest_openid', 'test_%');
      await supabase.from('gift_records').delete().like('guest_openid', 'test_%');
      await supabase.from('return_gift_settings').delete().like('banquet_id', 'test_%');
      await supabase.from('banquets').delete().like('id', 'test_%');
      await supabase.from('merchant_accounts').delete().like('openid', 'test_%');
      await supabase.from('users').delete().like('openid', 'test_%');

      this.logger.log('测试数据清理完成');

      return {
        code: 200,
        msg: '清理成功',
        data: null,
      };
    } catch (error: any) {
      this.logger.error('清理测试数据失败:', error);
      return {
        code: 500,
        msg: '清理失败: ' + error.message,
        data: null,
      };
    }
  }

  /**
   * 获取测试数据状态
   */
  @Get('status')
  async getStatus() {
    const { data: users } = await supabase
      .from('users')
      .select('openid, nickname')
      .like('openid', 'test_%');

    const { data: banquets } = await supabase
      .from('banquets')
      .select('id, name, status')
      .like('id', 'test_%');

    const { data: products } = await supabase.from('gift_products').select('id, name').limit(5);

    const { data: merchants } = await supabase
      .from('merchant_accounts')
      .select('id, merchant_name, balance')
      .like('openid', 'test_%');

    return {
      code: 200,
      msg: 'success',
      data: {
        testUsers: users || [],
        testBanquets: banquets || [],
        sampleProducts: products || [],
        testMerchants: merchants || [],
      },
    };
  }
}
