<?php
/**
 * 数据库配置文件
 */

return [
    'database' => [
        'sqlite_path' => __DIR__ . '/database/wechat_app.db', // SQLite数据库文件路径
    ],
    'wechat' => [
        'app_id' => 'wx5aa114c2ba1723cf',     // 填入您的微信小程序 AppID
        'app_secret' => 'd676c9138c9b3e59bdbd22508166d300', // 填入您实际的微信小程序 AppSecret
    ],
    'jwt' => [
        'secret_key' => 'jlau2025zhaosheng_jwt_secret', // 修改为安全的JWT密钥
        'expire_time' => 7 * 24 * 3600 // token有效期7天
    ]
]; 