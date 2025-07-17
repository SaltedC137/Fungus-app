<?php
/**
 * 微信登录API接口
 * 处理微信小程序登录请求
 */

require_once 'config.php';
require_once 'user_manager.php';
require_once 'session_manager.php';
require_once 'wechat_manager.php';

// 允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, token');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

// 处理OPTIONS请求
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

// 获取请求方法和路径
$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_GET['action']) ? $_GET['action'] : '';

// 获取请求头中的token
$headers = getallheaders();
$token = '';

// 尝试不同大小写的header名称
if (isset($headers['token'])) {
    $token = $headers['token'];
} elseif (isset($headers['Token'])) {
    $token = $headers['Token'];
} elseif (isset($headers['TOKEN'])) {
    $token = $headers['TOKEN'];
}

// 如果在URL参数中也有token，也可以使用
if (empty($token) && isset($_GET['token'])) {
    $token = $_GET['token'];
}

// 调试：记录请求头信息
$debugFile = DATA_PATH . 'debug_' . date('Y-m-d') . '.txt';
$debugData = [
    'time' => date('Y-m-d H:i:s'),
    'path' => $path,
    'method' => $method,
    'headers' => $headers,
    'token' => $token
];
file_put_contents($debugFile, json_encode($debugData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

// 根据请求路径处理不同的API
switch ($path) {
    case 'wx_login':
        // 微信登录
        handleWxLogin();
        break;
    case 'check_status':
        // 检查登录状态
        handleCheckStatus($token);
        break;
    case 'bind_phone':
        // 绑定手机号
        handleBindPhone($token);
        break;
    case 'bind_info':
        // 绑定用户信息
        handleBindInfo($token);
        break;
    default:
        // 未知路径
        echo response(STATUS_ERROR, '无效的请求路径');
        break;
}

/**
 * 处理微信登录请求
 */
function handleWxLogin() {
    // 只允许POST请求
    if ($_SERVER['REQUEST_METHOD'] != 'POST') {
        echo response(STATUS_ERROR, '请使用POST请求');
        return;
    }
    
    // 获取请求数据
    $data = json_decode(file_get_contents('php://input'), true);
    
    // 验证code参数
    if (!isset($data['code']) || empty($data['code'])) {
        echo response(STATUS_ERROR, '缺少code参数');
        return;
    }
    
    $code = $data['code'];
    
    // 通过code获取openid和session_key
    $wxSession = WechatManager::codeToSession($code);
    if (!$wxSession) {
        echo response(STATUS_ERROR, '微信登录失败');
        return;
    }
    
    $openid = $wxSession['openid'];
    $session_key = $wxSession['session_key'];
    
    // 保存session_key到本地（用于后续解密数据）
    // 注意：实际生产环境应该使用更安全的存储方式
    $sessionData = [
        'openid' => $openid,
        'session_key' => $session_key,
        'time' => time()
    ];
    $sessionFile = DATA_PATH . 'session_' . $openid . '.txt';
    file_put_contents($sessionFile, json_encode($sessionData));
    
    // 获取用户信息
    $user = UserManager::getUser($openid);
    
    // 创建会话token
    $token = SessionManager::createSession($openid);
    
    // 判断是否需要绑定手机号
    $needPhoneBind = UserManager::needBindPhone($openid);
    
    // 如果是新用户，保存基本信息
    if (!$user) {
        UserManager::saveUser($openid);
    }
    
    // 返回登录结果
    echo response(STATUS_SUCCESS, '登录成功', [
        'token' => $token,
        'needPhoneBind' => $needPhoneBind,
        'userInfo' => $user ? $user['userInfo'] : null
    ]);
}

/**
 * 处理检查登录状态请求
 * @param string $token 会话token
 */
function handleCheckStatus($token) {
    // 验证token
    if (empty($token)) {
        echo response(STATUS_ERROR, '未登录');
        return;
    }
    
    // 验证会话
    $openid = SessionManager::validateSession($token);
    if (!$openid) {
        echo response(STATUS_ERROR, '会话已过期');
        return;
    }
    
    // 获取用户信息
    $user = UserManager::getUser($openid);
    if (!$user) {
        echo response(STATUS_ERROR, '用户不存在');
        return;
    }
    
    // 判断是否需要绑定手机号
    $needPhoneBind = UserManager::needBindPhone($openid);
    
    // 返回状态
    echo response(STATUS_SUCCESS, '已登录', [
        'needPhoneBind' => $needPhoneBind,
        'userInfo' => $user['userInfo']
    ]);
}

/**
 * 处理绑定手机号请求
 * @param string $token 会话token
 */
function handleBindPhone($token) {
    // 只允许POST请求
    if ($_SERVER['REQUEST_METHOD'] != 'POST') {
        echo response(STATUS_ERROR, '请使用POST请求');
        return;
    }
    
    // 验证token
    if (empty($token)) {
        echo response(STATUS_ERROR, '未登录');
        return;
    }
    
    // 验证会话
    $openid = SessionManager::validateSession($token);
    if (!$openid) {
        echo response(STATUS_ERROR, '会话已过期');
        return;
    }
    
    // 获取请求数据
    $data = json_decode(file_get_contents('php://input'), true);
    
    // 验证参数
    if (!isset($data['encryptedData']) || !isset($data['iv'])) {
        echo response(STATUS_ERROR, '参数不完整');
        return;
    }
    
    // 获取session_key
    $sessionFile = DATA_PATH . 'session_' . $openid . '.txt';
    if (!file_exists($sessionFile)) {
        echo response(STATUS_ERROR, '请重新登录');
        return;
    }
    
    $sessionData = json_decode(file_get_contents($sessionFile), true);
    $session_key = $sessionData['session_key'];
    
    // 解密数据
    $phoneData = WechatManager::decryptData($data['encryptedData'], $data['iv'], $session_key);
    if (!$phoneData) {
        echo response(STATUS_ERROR, '解密失败');
        return;
    }
    
    // 获取手机号
    $phoneNumber = isset($phoneData['phoneNumber']) ? $phoneData['phoneNumber'] : '';
    if (empty($phoneNumber)) {
        echo response(STATUS_ERROR, '获取手机号失败');
        return;
    }
    
    // 绑定手机号
    $result = UserManager::bindPhone($openid, $phoneNumber);
    if (!$result) {
        echo response(STATUS_ERROR, '绑定手机号失败');
        return;
    }
    
    // 获取更新后的用户信息
    $user = UserManager::getUser($openid);
    
    // 返回结果
    echo response(STATUS_SUCCESS, '绑定成功', [
        'phoneNumber' => $phoneNumber,
        'userInfo' => $user['userInfo']
    ]);
} 

/**
 * 处理绑定用户信息请求
 * @param string $token 会话token
 */
function handleBindInfo($token) {
    // 只允许POST请求
    if ($_SERVER['REQUEST_METHOD'] != 'POST') {
        echo response(STATUS_ERROR, '请使用POST请求');
        return;
    }
    
    // 验证token
    if (empty($token)) {
        echo response(STATUS_ERROR, '未登录');
        return;
    }
    
    // 验证会话
    $openid = SessionManager::validateSession($token);
    if (!$openid) {
        echo response(STATUS_ERROR, '会话已过期');
        return;
    }
    
    // 获取请求数据
    $data = json_decode(file_get_contents('php://input'), true);
    
    // 验证参数
    if (!isset($data['phoneNumber']) || !isset($data['studentId']) || !isset($data['userName'])) {
        echo response(STATUS_ERROR, '参数不完整');
        return;
    }
    
    // 验证手机号格式
    if (!preg_match('/^1\d{10}$/', $data['phoneNumber'])) {
        echo response(STATUS_ERROR, '手机号格式不正确');
        return;
    }
    
    // 获取用户信息
    $user = UserManager::getUser($openid);
    
    // 更新用户信息
    $userInfo = [
        'phoneNumber' => $data['phoneNumber'],
        'studentId' => $data['studentId'],
        'userName' => $data['userName']
    ];
    
    // 如果用户已有信息，合并
    if ($user && isset($user['userInfo']) && is_array($user['userInfo'])) {
        $userInfo = array_merge($user['userInfo'], $userInfo);
    }
    
    // 保存用户信息
    $result = UserManager::saveUser($openid, $userInfo, $data['phoneNumber']);
    
    if (!$result) {
        echo response(STATUS_ERROR, '保存用户信息失败');
        return;
    }
    
    // 返回结果
    echo response(STATUS_SUCCESS, '绑定成功', [
        'userInfo' => $userInfo
    ]);
} 