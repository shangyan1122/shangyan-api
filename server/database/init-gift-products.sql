-- 回礼商品数据初始化
-- 执行此脚本将向 gift_products 表插入示例商品数据

-- 清空现有数据（谨慎使用）
-- TRUNCATE TABLE gift_products CASCADE;

-- 插入回礼商品数据
INSERT INTO gift_products (id, name, description, price, original_price, image, images, category, stock, sales, status, created_at) VALUES
-- 喜糖礼盒系列
(
  'gift-001',
  '经典喜糖礼盒（12颗装）',
  '精选进口巧克力，搭配传统喜糖，寓意甜蜜美满',
  3800,
  4800,
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', 'https://images.unsplash.com/photo-1587666e5c27f-7e4e6c6e6e6e?w=400'],
  '喜糖礼盒',
  999,
  1280,
  'active',
  NOW()
),
(
  'gift-002',
  '高端定制喜糖盒（8颗装）',
  '法式手工巧克力，精美礼盒包装，支持定制logo',
  6800,
  8800,
  'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400',
  ARRAY['https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400'],
  '喜糖礼盒',
  500,
  856,
  'active',
  NOW()
),
(
  'gift-003',
  '中式传统喜糖袋（16颗装）',
  '传统红色锦囊包装，内含花生、糖果、红枣，寓意早生贵子',
  2800,
  3500,
  'https://images.unsplash.com/photo-1562440499-64c9a111f713?w=400',
  ARRAY['https://images.unsplash.com/photo-1562440499-64c9a111f713?w=400'],
  '喜糖礼盒',
  1500,
  2340,
  'active',
  NOW()
),

-- 伴手礼系列
(
  'gift-004',
  '精美茶具套装',
  '景德镇白瓷茶具，4杯1壶，礼盒包装',
  15800,
  19800,
  'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
  ARRAY['https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'],
  '伴手礼',
  200,
  456,
  'active',
  NOW()
),
(
  'gift-005',
  '定制马克杯套装（2个装）',
  '高品质陶瓷，可定制照片或祝福语',
  8800,
  12000,
  'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400',
  ARRAY['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400'],
  '伴手礼',
  300,
  678,
  'active',
  NOW()
),
(
  'gift-006',
  '香薰蜡烛礼盒',
  '天然植物精油，淡雅花香，营造浪漫氛围',
  9900,
  13800,
  'https://images.unsplash.com/photo-1602607650461-19e2a4a6e7a0?w=400',
  ARRAY['https://images.unsplash.com/photo-1602607650461-19e2a4a6e7a0?w=400'],
  '伴手礼',
  180,
  234,
  'active',
  NOW()
),

-- 创意礼品系列
(
  'gift-007',
  '定制日历笔记本',
  '精美印刷，可定制照片和重要日期，记录美好时光',
  4800,
  6800,
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
  ARRAY['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'],
  '创意礼品',
  500,
  890,
  'active',
  NOW()
),
(
  'gift-008',
  '迷你加湿器',
  '便携式设计，静音运行，LED氛围灯',
  7800,
  9900,
  'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400',
  ARRAY['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400'],
  '创意礼品',
  250,
  345,
  'active',
  NOW()
),
(
  'gift-009',
  '定制钥匙扣套装',
  '金属材质，可刻字，精美礼盒包装',
  3800,
  5000,
  'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400',
  ARRAY['https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400'],
  '创意礼品',
  800,
  1230,
  'active',
  NOW()
),

-- 生活家居系列
(
  'gift-010',
  '精品毛巾礼盒（2条装）',
  '纯棉材质，柔软亲肤，刺绣工艺',
  5800,
  7800,
  'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400',
  ARRAY['https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400'],
  '生活家居',
  400,
  567,
  'active',
  NOW()
),
(
  'gift-011',
  '玻璃花瓶套装',
  '北欧简约风格，三件套，搭配仿真花',
  6600,
  8800,
  'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400',
  ARRAY['https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=400'],
  '生活家居',
  150,
  189,
  'active',
  NOW()
),
(
  'gift-012',
  '便携餐具套装',
  '304不锈钢，收纳盒设计，环保卫生',
  4800,
  6500,
  'https://images.unsplash.com/photo-1584990347449-a2d4c2c044a8?w=400',
  ARRAY['https://images.unsplash.com/photo-1584990347449-a2d4c2c044a8?w=400'],
  '生活家居',
  600,
  789,
  'active',
  NOW()
);

-- 更新统计
-- 可以根据实际销售情况调整库存和销量
