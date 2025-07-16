<?php
/**
 * 微信小程序获取手机号接口 (新版)
 * 使用整合后的管理类处理获取手机号逻辑
 */

// 关闭PHP错误显示，避免HTML错误信息
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// 设置自定义错误处理函数，确保所有错误都以JSON格式返回
function customErrorHandler($errno, $errstr, $errfile, $errline) {
    error_log("PHP错误: [$errno] $errstr in $errfile on line $errline");
    
    // 如果已经发送了内容，则不再发送错误信息
    if (headers_sent()) {
        return true;
    }
    
    // 设置HTTP状态码
    http_response_code(500);
    
    // 输出JSON格式的错误信息
    echo json_encode([
        'code' => -99,
        'msg' => '服务器内部错误',
        'debug' => [
            'error' => $errstr,
            'file' => basename($errfile),
            'line' => $errline
        ]
    ]);
    
    // 终止脚本执行
    exit;
}

// 设置自定义异常处理函数
function customExceptionHandler($exception) {
    error_log("未捕获的异常: " . $exception->getMessage() . " in " . $exception->getFile() . " on line " . $exception->getLine());
    
    // 如果已经发送了内容，则不再发送错误信息
    if (headers_sent()) {
        return true;
    }
    
    // 设置HTTP状态码
    http_response_code(500);
    
    // 输出JSON格式的错误信息
    echo json_encode([
        'code' => -98,
        'msg' => '服务器异常',
        'debug' => [
            'message' => $exception->getMessage(),
            'file' => basename($exception->getFile()),
            'line' => $exception->getLine()
        ]
    ]);
    
    // 终止脚本执行
    exit;
}

// 注册错误和异常处理器
set_error_handler("customErrorHandler");
set_exception_handler("customExceptionHandler");

// 开启详细调试日志
error_log('====== 获取手机号请求开始 ======');
error_log('请求时间: ' . date('Y-m-d H:i:s'));
error_log('请求IP: ' . $_SERVER['REMOTE_ADDR']);
error_log('请求方法: ' . $_SERVER['REQUEST_METHOD']);

// 记录请求头信息
$headers = getallheaders();
error_log('请求头: ' . print_r($headers, true));

// 记录原始请求体
$raw_post = file_get_contents('php://input');
error_log('原始请求体: ' . $raw_post);

// 设置响应头
header('Content-Type: application/json; charset=UTF-8');

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 如果是OPTIONS请求，直接返回200
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 仅允许POST请求
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['code' => -1, 'msg' => '请求方法不允许']);
    exit;
}

// 引入必要的类
require_once 'db_manager.php';
require_once 'user_manager.php';
require_once 'wechat_manager.php';

// 获取POST数据
$post_data = file_get_contents('php://input');
$post = json_decode($post_data, true);
error_log('接收到的POST数据: ' . print_r($post, true));

// 检查必要参数
if (!$post || !isset($post['code']) || !isset($post['openid'])) {
    http_response_code(400);
    error_log('参数不完整: ' . print_r($post, true));
    echo json_encode(['code' => -1, 'msg' => '参数不完整']);
    exit;
}

// 获取参数
$code = $post['code'];
$openid = $post['openid'];
$session_key = $post['session_key'] ?? '';

error_log('处理获取手机号请求: code=' . $code . ', openid=' . $openid);

// 初始化数据库管理器
$dbManager = new DBManager();
$db = $dbManager->getConnection();

// 如果数据库连接失败
if (!$db) {
    http_response_code(500);
    error_log('数据库连接失败');
    echo json_encode(['code' => -1, 'msg' => '服务器内部错误：数据库连接失败']);
    exit;
}

// 初始化微信API管理器
$wechatManager = new WechatManager();

// 获取手机号
try {
    $phoneInfo = $wechatManager->getPhoneNumber($code);
    error_log('微信API返回手机号信息: ' . print_r($phoneInfo, true));
    
    if (!$phoneInfo) {
        http_response_code(400);
        error_log('获取手机号失败');
        echo json_encode(['code' => -1, 'msg' => '获取手机号失败']);
        exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    error_log('获取手机号异常: ' . $e->getMessage());
    echo json_encode(['code' => -1, 'msg' => '获取手机号时发生错误: ' . $e->getMessage()]);
    exit;
}

// 获取手机号
$phoneNumber = $phoneInfo['phoneNumber'];

// 初始化用户管理器
$userManager = new UserManager($db);

// 更新用户手机号
if (!$userManager->updatePhoneNumber($openid, $phoneNumber)) {
    error_log('更新手机号失败，但继续处理');
}

// 获取用户资料
$profile = $userManager->getProfile($openid);
if (!$profile) {
    http_response_code(500);
    error_log("获取用户资料失败: " . $openid);
    echo json_encode(['code' => -1, 'msg' => '获取用户资料失败']);
    exit;
}

// 返回手机号和用户信息
$response = [
    'code' => 0,
    'msg' => '获取手机号成功',
    'data' => [
        'phoneNumber' => $phoneNumber,
        'countryCode' => $phoneInfo['countryCode'] ?? '',
        'purePhoneNumber' => $phoneInfo['purePhoneNumber'] ?? '',
        'userInfo' => $profile
    ]
];

echo json_encode($response);
error_log('====== 获取手机号请求结束 ======');
exit; 