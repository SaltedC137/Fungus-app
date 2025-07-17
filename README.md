# 微信小程序通知系统

这是一个微信小程序通知系统，支持系统通知和待办通知。通知数据存储在PHP后端，使用txt文件而非数据库。

## 功能特点

- 系统通知：接收系统级别的通知
- 待办通知：接收待办事项通知
- 实时更新：登录后自动获取最新通知
- 通知管理：标记已读、查看详情等功能

## 文件结构

### 前端（微信小程序）

- `utils/notification-service.js` - 通知服务，管理通知数据和实现实时更新
- `utils/notification-backend.js` - 通知后端服务，与PHP后端通信
- `pages/notification/notification.js` - 通知列表页面
- `pages/notification/detail.js` - 通知详情页面

### 后端（PHP）

- `php_backend/notification_manager.php` - 通知管理类，处理通知的存储和检索
- `php_backend/notification_api.php` - 通知API接口，供微信小程序调用
- `php_backend/notification_admin.php` - 通知管理后台界面
- `php_backend/data/notifications.txt` - 通知数据存储文件

## 使用方法

### 前端开发

1. 初始化通知服务

```javascript
// app.js
const notificationService = require('./utils/notification-service');

// 在 App 的 onLaunch 中初始化
onLaunch() {
  // 初始化通知服务
  notificationService.init();
}
```

2. 监听通知更新

```javascript
// 添加通知监听器
notificationService.addListener(function(data) {
  console.log('收到通知更新:', data.notifications);
  console.log('未读数量:', data.unreadCount);
});
```

3. 标记通知已读

```javascript
// 标记单个通知为已读
notificationService.markAsRead(notificationId);

// 标记所有通知为已读
notificationService.markAllAsRead();
```

### 后端管理

1. 访问后端管理页面：`http://your-domain.com/php_backend/`
2. 点击"通知管理"进入通知发送界面
3. 选择通知类型（系统/待办）
4. 填写通知标题和内容
5. 可选填写目标用户ID（多个ID用逗号分隔），留空则发送给所有用户
6. 点击"发送通知"按钮

## 注意事项

- 确保 `utils/notification-backend.js` 中的 `BASE_URL` 指向正确的后端地址
- 通知系统依赖于用户登录状态，未登录用户无法接收通知
- 在生产环境中，建议添加更多的安全措施 