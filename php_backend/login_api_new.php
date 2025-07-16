<?php
/**
 * 微信小程序登录接口 (新版)
 * 使用整合后的管理类处理登录逻辑
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
error_log('====== 登录请求开始 ======');
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

// 检查是否是手动初始化数据库请求
if ($post && isset($post['action']) && $post['action'] === 'init_db') {
    error_log('收到手动初始化数据库请求');
    
    try {
        $dbManager = new DBManager();
        $result = $dbManager->fixDatabase();
        
        if ($result['success']) {
            echo json_encode([
                'code' => 0,
                'msg' => '数据库初始化成功',
                'data' => $result
            ]);
        } else {
            echo json_encode([
                'code' => -1,
                'msg' => '数据库初始化失败',
                'data' => $result
            ]);
        }
        exit;
    } catch (Exception $e) {
        error_log('手动初始化数据库失败: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'code' => -1,
            'msg' => '数据库初始化失败: ' . $e->getMessage()
        ]);
        exit;
    }
}

// 检查必要参数
if (!$post || !isset($post['code']) || !isset($post['userInfo'])) {
    http_response_code(400);
    error_log('参数不完整: ' . print_r($post, true));
    echo json_encode(['code' => -1, 'msg' => '参数不完整']);
    exit;
}

// 获取用户信息
$code = $post['code'];
$userInfo = $post['userInfo'];
error_log('处理登录请求: code=' . $code . ', userInfo=' . json_encode($userInfo));

// 初始化数据库管理器
$dbManager = new DBManager();
$db = $dbManager->getConnection();

// 如果数据库连接失败，尝试修复
if (!$db) {
    error_log('数据库连接失败，尝试修复...');
    $fixResult = $dbManager->fixDatabase();
    
    if ($fixResult['success']) {
        $db = $dbManager->getConnection();
        error_log('数据库修复成功，重新连接成功');
    }
    
    // 如果仍然失败
    if (!$db) {
        http_response_code(500);
        error_log('数据库连接失败，修复未成功');
        echo json_encode(['code' => -1, 'msg' => '服务器内部错误：数据库连接失败']);
        exit;
    }
}

error_log('数据库连接成功');

// 初始化微信API管理器
$wechatManager = new WechatManager();

// 通过code获取openid和session_key
try {
    $session = $wechatManager->code2Session($code);
    error_log('微信API返回: ' . print_r($session, true));
    
    if (!$session) {
        // 微信API调用失败时，检查可能的原因
        http_response_code(400);
        error_log('微信登录API调用失败');
        
        // 检查微信配置
        $wechatConfig = $wechatManager->getConfig();
        
        if (!$wechatConfig['isConfigValid']) {
            error_log('服务器配置错误：微信配置不正确');
            echo json_encode(['code' => -1, 'msg' => '服务端配置错误：微信配置不正确']);
        } else if (empty($code)) {
            error_log('请求参数错误：code为空');
            echo json_encode(['code' => -1, 'msg' => '请求参数错误：登录code为空']);
        } else {
            // 检查是否能访问微信API
            $testConnection = $wechatManager->testWeixinConnection();
            if (!$testConnection) {
                error_log('服务器无法连接到微信API');
                echo json_encode(['code' => -1, 'msg' => '服务器无法连接到微信API，请检查网络']);
            } else {
                error_log('code可能已过期或无效');
                echo json_encode(['code' => -1, 'msg' => '登录失败，code可能已过期，请重试']);
            }
        }
        exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    error_log('微信API异常: ' . $e->getMessage());
    echo json_encode(['code' => -1, 'msg' => '登录时发生错误: ' . $e->getMessage()]);
    exit;
}

// 获取openid和session_key
$openid = $session['openid'];
$session_key = $session['session_key'];
$unionid = $session['unionid'] ?? '';

// 初始化用户管理器
$userManager = new UserManager($db);

// 准备要保存的用户数据
$userData = [
    'openid' => $openid,
    'unionid' => $unionid,
    'nickname' => $userInfo['nickName'] ?? '',
    'avatar_url' => $userInfo['avatarUrl'] ?? '',
    'gender' => $userInfo['gender'] ?? 0,
    'country' => $userInfo['country'] ?? '',
    'province' => $userInfo['province'] ?? '',
    'city' => $userInfo['city'] ?? '',
    'language' => $userInfo['language'] ?? ''
];

// 查询用户是否存在
$existingUser = $userManager->findByOpenid($openid);

// 创建或更新用户
if (!$existingUser) {
    error_log("用户不存在，创建新用户: " . $openid);
    
    if (!$userManager->create($userData)) {
        http_response_code(500);
        error_log("创建用户失败");
        echo json_encode(['code' => -1, 'msg' => '创建用户失败']);
        exit;
    }
    
    error_log("用户创建成功: " . $openid);
} else {
    error_log("用户已存在，更新用户信息: " . $openid);
    
    if (!$userManager->update($userData)) {
        error_log("更新用户失败，但继续处理");
    } else {
        error_log("用户更新成功: " . $openid);
    }
}

// 获取用户资料
$profile = $userManager->getProfile($openid);
if (!$profile) {
    http_response_code(500);
    error_log("获取用户资料失败: " . $openid);
    echo json_encode(['code' => -1, 'msg' => '获取用户资料失败']);
    exit;
}

error_log("获取用户资料成功: " . json_encode($profile));

// 返回用户信息和session_key
$response = [
    'code' => 0,
    'msg' => '登录成功',
    'data' => [
        'token' => $session_key,  // 使用session_key作为token
        'openid' => $openid,
        'userInfo' => $profile
    ]
];

echo json_encode($response);
error_log('====== 登录请求结束 ======');
exit; 