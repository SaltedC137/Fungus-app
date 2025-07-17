<?php
/**
 * 配置文件
 * 包含微信小程序的AppID和AppSecret等配置信息
 */

// 微信小程序配置
define('WX_APPID', 'wx5aa114c2ba1723cf'); // 替换为您的AppID
define('WX_SECRET', 'd676c9138c9b3e59bdbd22508166d300'); // 替换为您的AppSecret

// 文件存储路径
define('DATA_PATH', __DIR__ . '/data/');
define('USER_FILE', DATA_PATH . 'users.txt');
define('SESSION_FILE', DATA_PATH . 'sessions.txt');
define('NOTIFICATION_FILE', DATA_PATH . 'notifications.txt');

// 确保数据目录存在
if (!file_exists(DATA_PATH)) {
    mkdir(DATA_PATH, 0755, true);
}

// 创建文件（如果不存在）
if (!file_exists(USER_FILE)) {
    file_put_contents(USER_FILE, '');
}
if (!file_exists(SESSION_FILE)) {
    file_put_contents(SESSION_FILE, '');
}
if (!file_exists(NOTIFICATION_FILE)) {
    file_put_contents(NOTIFICATION_FILE, '[]');
}

// 响应状态码
define('STATUS_SUCCESS', 0);
define('STATUS_ERROR', 1);
define('STATUS_NEED_PHONE', 2);

/**
 * 返回JSON格式的响应
 * @param int $code 状态码
 * @param string $msg 消息
 * @param array $data 数据
 * @return string JSON字符串
 */
function response($code, $msg = '', $data = []) {
    header('Content-Type: application/json; charset=utf-8');
    return json_encode([
        'code' => $code,
        'msg' => $msg,
        'data' => $data
    ]);
}

/**
 * 生成随机字符串
 * @param int $length 长度
 * @return string 随机字符串
 */
function generateRandomString($length = 32) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
} 