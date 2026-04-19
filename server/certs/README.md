# 微信支付商户证书配置说明

## 证书文件说明

微信支付需要以下证书文件（从微信商户平台下载）：

| 文件名 | 说明 | 用途 |
|--------|------|------|
| `apiclient_cert.pem` | 商户证书公钥 | 支付、退款等接口 |
| `apiclient_key.pem` | 商户证书私钥 | 支付、退款等接口 |
| `apiclient_cert.p12` | 商户证书(PKCS12格式) | 企业转账、红包等需要双向证书的接口 |

## 获取方式

### 1. 登录微信商户平台
访问：https://pay.weixin.qq.com/

### 2. 下载证书
路径：账户中心 → API安全 → API证书 → 申请或管理证书

### 3. 解压并放置文件
将下载的证书文件解压后，放置到本目录：

```
server/certs/
├── apiclient_cert.pem    # 商户证书公钥
├── apiclient_key.pem     # 商户证书私钥
├── apiclient_cert.p12    # PKCS12格式证书
└── README.md             # 本说明文件
```

## 环境变量配置

在 `server/.env` 文件中配置：

```bash
# 微信支付证书路径
WECHAT_CERT_PATH=./certs/apiclient_cert.pem
WECHAT_KEY_PATH=./certs/apiclient_key.pem
WECHAT_PFX_PATH=./certs/apiclient_cert.p12

# PFX证书密码（通常是商户号）
WECHAT_PFX_PASSPHRASE=你的商户号
```

## 证书安全

⚠️ **重要提示**：

1. **证书文件包含敏感信息，严禁泄露**
2. **不要将证书文件提交到Git仓库**
3. `.gitignore` 已配置忽略证书文件
4. 生产环境建议使用环境变量存储证书内容

## 使用环境变量存储证书

如果不想使用文件，可以将证书内容配置到环境变量：

```bash
# 商户私钥（将证书内容转为单行，换行符用\n表示）
WECHAT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----
```

## 验证证书配置

启动服务后，查看日志：

```
[Nest] LOG [PaymentService] 商户证书加载成功
```

如果看到警告：

```
[Nest] WARN [PaymentService] 商户证书文件不存在，转账功能将使用模拟模式
```

说明证书未正确配置。

## 常见问题

### Q: 证书过期怎么办？
A: 登录商户平台重新下载最新证书

### Q: 证书密码是什么？
A: PFX证书密码通常是商户号

### Q: 测试环境没有证书怎么办？
A: 系统会自动降级为模拟模式，不影响其他功能测试
