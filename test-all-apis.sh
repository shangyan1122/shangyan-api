#!/bin/bash

# 尚宴礼记 API 完整测试脚本
# 测试所有主要功能模块

BASE_URL="https://web-production-201e9.up.railway.app"
OPENID="test_openid_12345"

echo "=========================================="
echo "尚宴礼记 API 完整测试"
echo "Base URL: $BASE_URL"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL=0
PASSED=0
FAILED=0

# 测试函数
test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    TOTAL=$((TOTAL + 1))
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 500 ]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $http_code)"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $name (HTTP $http_code)"
        FAILED=$((FAILED + 1))
    fi
}

echo "【1. 认证模块】"
echo "----------------------------------------"
test_api "微信登录" "POST" "/api/wechat-login" "{\"code\":\"test_code\"}"
test_api "获取用户信息" "GET" "/api/user/info?openid=$OPENID"
echo ""

echo "【2. 宴会模块】"
echo "----------------------------------------"
test_api "获取宴会列表" "GET" "/api/banquets?openid=$OPENID"
test_api "获取宴会详情" "GET" "/api/banquets/test_banquet_id"
test_api "创建宴会" "POST" "/api/banquets" "{\"openid\":\"$OPENID\",\"name\":\"测试宴会\",\"date\":\"2026-05-01\"}"
test_api "更新宴会" "PUT" "/api/banquets/test_banquet_id" "{\"name\":\"更新后的宴会\"}"
echo ""

echo "【3. 礼金模块】"
echo "----------------------------------------"
test_api "获取礼金记录" "GET" "/api/gifts?banquet_id=test_banquet_id"
test_api "添加礼金记录" "POST" "/api/gifts" "{\"banquet_id\":\"test_banquet_id\",\"guest_name\":\"张三\",\"amount\":500}"
test_api "获取礼金统计" "GET" "/api/gift-stats?banquet_id=test_banquet_id"
echo ""

echo "【4. 补礼模块】"
echo "----------------------------------------"
test_api "获取补礼列表" "GET" "/api/gift-supplement?openid=$OPENID"
test_api "创建补礼" "POST" "/api/gift-supplement" "{\"banquet_id\":\"test_banquet_id\",\"guest_name\":\"李四\",\"amount\":300}"
echo ""

echo "【5. 回礼模块】"
echo "----------------------------------------"
test_api "获取回礼设置" "GET" "/api/return-gift/settings?banquet_id=test_banquet_id"
test_api "创建回礼设置" "POST" "/api/return-gift/settings" "{\"banquet_id\":\"test_banquet_id\",\"gift_name\":\"喜糖\",\"count\":100}"
test_api "获取回礼列表" "GET" "/api/return-gift/list?banquet_id=test_banquet_id"
echo ""

echo "【6. 商城模块】"
echo "----------------------------------------"
test_api "获取商品列表" "GET" "/api/products"
test_api "获取商品详情" "GET" "/api/products/test_product_id"
test_api "获取分类列表" "GET" "/api/categories"
echo ""

echo "【7. 订单模块】"
echo "----------------------------------------"
test_api "获取订单列表" "GET" "/api/orders?openid=$OPENID"
test_api "创建订单" "POST" "/api/orders" "{\"openid\":\"$OPENID\",\"items\":[{\"product_id\":\"test_product_id\",\"quantity\":1}]}"
echo ""

echo "【8. 支付模块】"
echo "----------------------------------------"
test_api "创建支付" "POST" "/api/wechat-pay/create" "{\"openid\":\"$OPENID\",\"amount\":100,\"description\":\"测试支付\"}"
test_api "支付回调" "POST" "/api/wechat-pay/notify" "{\"transaction_id\":\"test_txn_id\"}"
echo ""

echo "【9. 统计模块】"
echo "----------------------------------------"
test_api "获取仪表盘数据" "GET" "/api/stats/dashboard?openid=$OPENID"
test_api "获取宴会统计" "GET" "/api/stats/banquets?openid=$OPENID"
echo ""

echo "【10. 上传模块】"
echo "----------------------------------------"
test_api "获取上传URL" "GET" "/api/upload/url?openid=$OPENID"
echo ""

echo "=========================================="
echo "测试完成"
echo -e "总计: $TOTAL"
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo "=========================================="

if [ $FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
