# 微信小程序后端API

这是一个为微信小程序提供后端服务的PHP API系统。该系统使用SQLite3数据库，提供用户登录、获取手机号等功能。

## 系统架构

系统采用面向对象的设计，将各个功能模块分离为独立的类：

### 核心管理类

1. **APIManager** (`api_manager.php`)
   - 统一处理API请求和响应
   - 提供请求参数验证、错误处理、日志记录等功能
   - 标准化API响应格式

2. **DBManager** (`db_manager.php`)
   - 数据库连接和管理
   - 数据库初始化、修复和诊断
   - 数据库备份功能

3. **UserManager** (`user_manager.php`)
   - 用户数据管理
   - 创建、更新、查询用户信息
   - 用户资料格式化

4. **WechatManager** (`wechat_manager.php`)
   - 微信API交互
   - 处理登录、获取手机号等微信相关功能
   - 错误处理和模拟数据支持

### API端点

1. **登录API** 
   - `login_api_new.php`: 标准版登录API
   - `login_api_v2.php`: 使用APIManager的优化版登录API

2. **获取手机号API**
   - `phone_api_new.php`: 获取用户手机号

### 配置文件

- `config.php`: 系统配置，包含数据库路径、微信AppID和AppSecret等

## 数据库结构

系统使用SQLite3数据库，主要表结构：

### users表

| 字段名 | 类型 | 说明 |
|-------|------|------|
| id | INTEGER | 主键，自增 |
| openid | TEXT | 微信openid，唯一 |
| unionid | TEXT | 微信unionid |
| nickname | TEXT | 用户昵称 |
| avatar_url | TEXT | 头像URL |
| gender | INTEGER | 性别 |
| country | TEXT | 国家 |
| province | TEXT | 省份 |
| city | TEXT | 城市 |
| language | TEXT | 语言 |
| phone_number | TEXT | 手机号 |
| department | TEXT | 部门 |
| role | TEXT | 角色 |
| group_name | TEXT | 组名 |
| is_verified | INTEGER | 是否验证 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

## 使用方法

### 1. 配置系统

编辑 `config.php` 文件，设置：
- 数据库路径
- 微信小程序的AppID和AppSecret

```php
return [
    'database' => [
        'sqlite_path' => __DIR__ . '/database/wechat_app.db',
    ],
    'wechat' => [
        'app_id' => '您的微信小程序AppID',
        'app_secret' => '您的微信小程序AppSecret',
    ]
];
```

### 2. 初始化数据库

系统会自动初始化数据库，但也可以通过API手动初始化：

```
POST /php_backend/login_api_v2.php
Content-Type: application/json

{
    "code": "任意值",
    "userInfo": {},
    "action": "init_db"
}
```

### 3. 登录API调用

```
POST /php_backend/login_api_v2.php
Content-Type: application/json

{
    "code": "微信登录返回的code",
    "userInfo": {
        "nickName": "用户昵称",
        "avatarUrl": "头像URL",
        "gender": 1,
        "country": "国家",
        "province": "省份",
        "city": "城市",
        "language": "zh_CN"
    }
}
```

成功响应：

```json
{
    "code": 0,
    "msg": "登录成功",
    "data": {
        "token": "session_key值",
        "openid": "用户openid",
        "userInfo": {
            "id": 1,
            "nickName": "用户昵称",
            "avatarUrl": "头像URL",
            "gender": 1,
            "phoneNumber": "",
            "department": "***",
            "role": "学生",
            "groupName": "***",
            "isVerified": true
        }
    },
    "request_id": "api_64a5e8b3e4f6a",
    "duration": "156ms"
}
```

### 4. 获取手机号API调用

```
POST /php_backend/phone_api_new.php
Content-Type: application/json

{
    "code": "获取手机号时微信返回的code",
    "openid": "用户openid",
    "session_key": "登录时获取的session_key"
}
```

成功响应：

```json
{
    "code": 0,
    "msg": "获取手机号成功",
    "data": {
        "phoneNumber": "13800138000",
        "countryCode": "86",
        "purePhoneNumber": "13800138000",
        "userInfo": {
            "id": 1,
            "nickName": "用户昵称",
            "avatarUrl": "头像URL",
            "gender": 1,
            "phoneNumber": "13800138000",
            "department": "***",
            "role": "学生",
            "groupName": "***",
            "isVerified": true
        }
    }
}
```

## 错误处理

所有API返回统一的错误格式：

```json
{
    "code": -1,  // 错误码，非0表示错误
    "msg": "错误信息",  // 错误描述
    "request_id": "api_64a5e8b3e4f6a",  // 请求ID，用于日志追踪
    "duration": "10ms"  // 请求处理时间
}
```

常见错误码：
- 0: 成功
- -1: 一般错误
- -2: 数据库错误
- -3: 认证错误
- -4: 参数错误
- -99: 服务器内部错误

## 开发模式

系统支持开发模式，当微信配置不正确时，会自动生成模拟数据用于测试：

1. 使用示例AppSecret时，会生成模拟的openid和session_key
2. 在本地开发环境中，即使没有有效的code也能进行测试

## 日志

系统会记录详细的日志，包括：
- 请求信息
- 处理过程
- 错误信息
- 响应数据

每个请求都有唯一的请求ID，方便追踪问题。 