# 校园二手交易平台 - 项目说明

## 📁 项目结构

```
campus-trade/
├── index.html           🏠 首页（导航入口）
├── item.html            📦 商品列表页面
├── user.html            👤 用户列表页面
├── order.html           🧾 订单列表页面
├── app.js               ⚡ 所有JavaScript逻辑
├── style.css            🎨 统一样式表
└── README.md            📝 项目说明文档
```

## 🚀 快速开始

1. **打开首页**
   - 用浏览器打开 `index.html` 即可运行
   - 无需任何构建工具或后端服务

2. **导航菜单**
   - 首页：显示平台统计数据
   - 商品列表：查询和购买商品
   - 用户列表：查看用户信息
   - 订单列表：查看交易记录

## 📊 功能模块

### 首页 (index.html)
- 平台概览和功能介绍
- 实时统计信息：商品总数、出售中、已售出、平均价格

### 商品列表 (item.html)
**基础查询：**
- 查询所有未售出商品 (status=0)
- 查询价格大于30的商品
- 查询生活用品类 (DailyGoods) 商品
- 查询特定用户 (u001) 发布的商品

**聚合统计：**
- 统计商品总数
- 按分类统计商品数量
- 计算所有商品平均价格

**视图展示：**
- 已售商品视图
- 未售商品视图

**业务功能：**
- 点击购买按钮购买商品
- 已售商品自动更新状态
- 插入订单记录

### 用户列表 (user.html)
- 查询发布商品最多的用户 (Top 10)
- 显示所有用户及其发布的商品数

### 订单列表 (order.html)
**连接查询：**
- 查询已售商品及买家姓名
- 查询订单详情（商品名+买家名+卖家名+日期）
- 查询u001的商品购买情况
- 显示所有订单及统计数据

## 🔧 技术架构

### 前端技术
- **HTML5** - 页面结构
- **CSS3** - 响应式设计和动画
- **原生 JavaScript** - 业务逻辑
- **Supabase JS SDK** - 数据库连接

### 后端
- **Supabase PostgreSQL** - 数据库
- **Supabase REST API** - 接口调用

## 🗄️ 数据库表结构

### user (用户表)
```
- user_id (varchar, 主键)
- user_name (varchar)
- phone (varchar)
```

### item (商品表)
```
- item_id (varchar, 主键)
- item_name (varchar)
- category (varchar)
- price (numeric)
- status (int: 0=未售, 1=已售)
- seller_id (varchar, 外键关联user)
```

### orders (订单表)
```
- order_id (varchar, 主键)
- item_id (varchar, 外键关联item)
- buyer_id (varchar, 外键关联user)
- order_date (timestamp)
```

## 🎨 设计特点

### 样式特性
- **现代化UI设计**：梯度背景、卡片布局、平滑动画
- **响应式布局**：支持桌面、平板、手机等多种屏幕
- **交互反馈**：加载动画、成功/错误提示、悬停效果
- **易用性**：清晰的导航、直观的按钮、友好的表格展示

### 颜色方案
- 主色：紫色梯度 (#667eea → #764ba2)
- 成功：绿色 (#27ae60)
- 错误：红色 (#e74c3c)
- 背景：浅灰色 (#f5f5f5)

## 🔐 Supabase 配置

```javascript
const SUPABASE_URL = 'https://bgoasiasxwxbfuermxwm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aieCgH5hguy14TganpPUwQ_VWiMH4K3';
```

**注意：** 公开密钥仅用于演示和学习，生产环境应使用环境变量存储敏感信息。

## 💻 核心函数说明

### app.js 主要函数

**查询函数：**
- `queryAllUnsoldItems()` - 查询未售商品
- `queryItemsAbovePrice()` - 价格查询
- `queryDailyGoodsItems()` - 分类查询
- `querySoldItemsWithBuyer()` - 连接查询
- `queryMostActiveUser()` - 聚合分组

**业务函数：**
- `buyItem(itemId, itemName, price)` - 购买商品
- `renderItemsTable(items, containerId)` - 渲染表格
- `showMessage(text, type)` - 消息提示

**统计函数：**
- `updateHomeStats()` - 更新首页统计
- `queryItemCount()` - 商品总数
- `queryAvgItemPrice()` - 平均价格

## 📱 使用示例

### 购买商品流程
1. 进入"商品列表"页面
2. 点击任意"购买"按钮
3. 输入购买者用户ID (默认 u002)
4. 系统自动：
   - 创建订单记录
   - 更新商品状态为"已售"
   - 显示成功提示

### 查询订单流程
1. 进入"订单列表"页面
2. 点击"订单详情"按钮
3. 系统显示所有订单，包含：
   - 商品名、买家名、卖家名
   - 价格和交易日期
   - 统计信息（总数、总额、平均额）

## 🐛 常见问题

**Q: 如何修改 Supabase 连接？**
A: 编辑 `app.js` 文件中的常量：
```javascript
const SUPABASE_URL = 'your_url';
const SUPABASE_ANON_KEY = 'your_key';
```

**Q: 如何添加新的查询功能？**
A: 
1. 在 `app.js` 中添加新函数
2. 在对应的 HTML 页面中添加按钮
3. 调用 `renderItemsTable()` 或 `renderOrdersTable()` 显示结果

**Q: 页面不显示数据？**
A: 检查：
1. 浏览器控制台是否有错误信息
2. Supabase 连接是否正确
3. 数据库表是否存在且有数据

## 📝 代码注释

所有函数都包含详细的 JSDoc 注释，说明参数、返回值和功能

## 🎯 扩展功能建议

- [ ] 添加用户登录/注册
- [ ] 实现商品搜索框
- [ ] 支持上传商品图片
- [ ] 添加商品评价系统
- [ ] 实现消息通知功能
- [ ] 后台管理系统
- [ ] 支付功能集成

## 📄 许可证

此项目仅供学习和演示使用。

## 👨‍💻 开发说明

- 使用原生 JavaScript，无框架依赖
- 模块化代码结构，易于维护
- 响应式设计，兼容所有设备
- 完整的错误处理和用户反馈

---

**项目完成日期：** 2026年5月3日
**版本：** 1.0
