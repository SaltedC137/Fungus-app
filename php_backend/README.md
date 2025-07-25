# 微信小程序登录后端系统

这是一个简单的微信小程序登录后端系统，使用PHP实现，数据存储在txt文件中。

## 功能特点

- 微信小程序登录
- 登录状态检查
- 手机号绑定
- 数据存储在txt文件中，无需数据库

## 文件结构

- `config.php` - 配置文件
- `user_manager.php` - 用户管理类
- `session_manager.php` - 会话管理类
- `wechat_manager.php` - 微信API管理类
- `login_api.php` - API接口入口
- `data/` - 数据存储目录
  - `users.txt` - 用户数据
  - `sessions.txt` - 会话数据

## 安装步骤

1. 将所有文件上传到您的PHP服务器
2. 在`config.php`中配置您的微信小程序AppID和AppSecret
3. 确保`data`目录可写

## API接口说明

### 1. 微信登录

**请求URL:** `/login_api.php?action=wx_login`

**请求方式:** POST

**请求参数:**

```json
{
  "code": "微信登录code"
}
```

**响应示例:**

```json
{
  "code": 0,
  "msg": "登录成功",
  "data": {
    "token": "生成的会话token",
    "needPhoneBind": true,
    "userInfo": null
  }
}
```

### 2. 检查登录状态

**请求URL:** `/login_api.php?action=check_status`

**请求方式:** GET

**请求头:**

```
token: 会话token
```

**响应示例:**

```json
{
  "code": 0,
  "msg": "已登录",
  "data": {
    "needPhoneBind": false,
    "userInfo": {
      "nickName": "用户昵称",
      "avatarUrl": "头像URL"
    }
  }
}
```

### 3. 绑定手机号

**请求URL:** `/login_api.php?action=bind_phone`

**请求方式:** POST

**请求头:**

```
token: 会话token
```

**请求参数:**

```json
{
  "encryptedData": "加密数据",
  "iv": "加密初始向量"
}
```

**响应示例:**

```json
{
  "code": 0,
  "msg": "绑定成功",
  "data": {
    "phoneNumber": "13800138000",
    "userInfo": {
      "nickName": "用户昵称",
      "avatarUrl": "头像URL"
    }
  }
}
```

## 前端调用示例

### 微信登录

```javascript
wx.login({
  success: (res) => {
    if (res.code) {
      // 发送code到后端
      wx.request({
        url: 'https://your-server.com/login_api.php?action=wx_login',
        method: 'POST',
        data: {
          code: res.code
        },
        success: (result) => {
          if (result.data.code === 0) {
            // 登录成功，保存token
            wx.setStorageSync('token', result.data.data.token);
            
            // 检查是否需要绑定手机号
            if (result.data.data.needPhoneBind) {
              // 提示用户绑定手机号
            }
          } else {
            wx.showToast({
              title: result.data.msg,
              icon: 'none'
            });
          }
        }
      });
    }
  }
});
```

### 检查登录状态

```javascript
wx.request({
  url: 'https://your-server.com/login_api.php?action=check_status',
  method: 'GET',
  header: {
    'token': wx.getStorageSync('token')
  },
  success: (result) => {
    if (result.data.code === 0) {
      // 已登录
      const userInfo = result.data.data.userInfo;
      const needPhoneBind = result.data.data.needPhoneBind;
      
      // 更新用户信息
    } else {
      // 未登录或会话过期
      wx.removeStorageSync('token');
    }
  }
});
```

### 绑定手机号

```javascript
wx.getPhoneNumber({
  success: (res) => {
    if (res.errMsg === 'getPhoneNumber:ok') {
      // 发送加密数据到后端
      wx.request({
        url: 'https://your-server.com/login_api.php?action=bind_phone',
        method: 'POST',
        header: {
          'token': wx.getStorageSync('token')
        },
        data: {
          encryptedData: res.encryptedData,
          iv: res.iv
        },
        success: (result) => {
          if (result.data.code === 0) {
            // 绑定成功
            wx.showToast({
              title: '手机号绑定成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: result.data.msg,
              icon: 'none'
            });
          }
        }
      });
    }
  }
});
```
