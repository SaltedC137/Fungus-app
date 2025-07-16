<?php
/**
 * 微信小程序登录接口 (V2)
 * 使用APIManager统一处理API请求和响应
 */

// 定义调试模式
define('DEBUG_MODE', true);

// 引入必要的类
require_once 'api_manager.php';
require_once 'db_manager.php';
require_once 'user_manager.php';
require_once 'wechat_manager.php';

// 创建API管理器
$api = new APIManager();

// 检查请求方法
if (!$api->checkMethod(['POST', 'GET'])) {
    exit; // checkMethod会自动发送错误响应
}

// 如果是特殊操作请求，不检查必要参数
$action = $api->getParam('action');
if (!$action) {
    // 检查必要参数
    if (!$api->checkRequiredParams(['code', 'userInfo'])) {
        exit; // checkRequiredParams会自动发送错误响应
    }
}

// 获取参数
$code = $api->getParam('code');
$userInfo = $api->getParam('userInfo');
$api->log('处理登录请求: code=' . $code . ', userInfo=' . json_encode($userInfo));

// 检查特殊操作请求
// 注意：这里不需要重新获取$action，因为已经在前面获取过了

// 数据库初始化请求
if ($action === 'init_db') {
    $api->log('收到手动初始化数据库请求');
    
    try {
        $dbManager = new DBManager();
        $result = $dbManager->fixDatabase();
        
        if ($result['success']) {
            $api->sendSuccess('数据库初始化成功', $result);
        } else {
            $api->sendError('数据库初始化失败', APIManager::API_ERROR_DB, APIManager::HTTP_INTERNAL_SERVER_ERROR, $result);
        }
    } catch (Exception $e) {
        $api->logError('手动初始化数据库失败: ' . $e->getMessage());
        $api->sendError('数据库初始化失败: ' . $e->getMessage(), APIManager::API_ERROR_DB, APIManager::HTTP_INTERNAL_SERVER_ERROR);
    }
    exit;
}

// 数据库诊断请求
if ($action === 'diagnose_db') {
    $api->log('收到数据库诊断请求');
    
    try {
        $dbManager = new DBManager();
        $result = $dbManager->diagnoseDatabase();
        
        if ($result['success']) {
            $api->sendSuccess('数据库诊断成功', $result);
        } else {
            $api->sendError('数据库诊断发现问题', APIManager::API_ERROR_DB, APIManager::HTTP_INTERNAL_SERVER_ERROR, $result);
        }
    } catch (Exception $e) {
        $api->logError('数据库诊断失败: ' . $e->getMessage());
        $api->sendError('数据库诊断失败: ' . $e->getMessage(), APIManager::API_ERROR_DB, APIManager::HTTP_INTERNAL_SERVER_ERROR);
    }
    exit;
}

// 初始化数据库管理器
$dbManager = new DBManager();
$db = $dbManager->getConnection();

// 如果数据库连接失败，尝试修复
if (!$db) {
    $api->log('数据库连接失败，尝试修复...');
    $fixResult = $dbManager->fixDatabase();
    
    if ($fixResult['success']) {
        $db = $dbManager->getConnection();
        $api->log('数据库修复成功，重新连接成功');
    }
    
    // 如果仍然失败
    if (!$db) {
        $api->logError('数据库连接失败，修复未成功');
        $api->sendError('服务器内部错误：数据库连接失败', APIManager::API_ERROR_DB, APIManager::HTTP_INTERNAL_SERVER_ERROR);
        exit;
    }
}

$api->log('数据库连接成功');

// 初始化微信API管理器
$wechatManager = new WechatManager();

// 通过code获取openid和session_key
try {
    $session = $wechatManager->code2Session($code);
    $api->log('微信API返回: ' . print_r($session, true));
    
    if (!$session) {
        // 微信API调用失败时，检查可能的原因
        $api->logError('微信登录API调用失败');
        
        // 检查微信配置
        $wechatConfig = $wechatManager->getConfig();
        
        if (!$wechatConfig['isConfigValid']) {
            $api->sendError('服务端配置错误：微信配置不正确', APIManager::API_ERROR, APIManager::HTTP_BAD_REQUEST);
        } else if (empty($code)) {
            $api->sendError('请求参数错误：登录code为空', APIManager::API_ERROR_PARAM, APIManager::HTTP_BAD_REQUEST);
        } else {
            // 检查是否能访问微信API
            $testConnection = $wechatManager->testWeixinConnection();
            if (!$testConnection) {
                $api->sendError('服务器无法连接到微信API，请检查网络', APIManager::API_ERROR, APIManager::HTTP_BAD_REQUEST);
            } else {
                $api->sendError('登录失败，code可能已过期，请重试', APIManager::API_ERROR, APIManager::HTTP_BAD_REQUEST);
            }
        }
        exit;
    }
} catch (Exception $e) {
    $api->logError('微信API异常: ' . $e->getMessage());
    $api->sendError('登录时发生错误: ' . $e->getMessage(), APIManager::API_ERROR, APIManager::HTTP_INTERNAL_SERVER_ERROR);
    exit;
}

// 获取openid和session_key
$openid = $session['openid'];
$session_key = $session['session_key'];
$unionid = $session['unionid'] ?? '';

// 初始化用户管理器
$userManager = new UserManager($db);

// 记录用户提供的信息
$api->log('用户提供的信息: ' . json_encode($userInfo));
$api->log('用户昵称: ' . ($userInfo['nickName'] ?? '未提供'));

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

$api->log('准备保存到数据库的用户数据: ' . json_encode($userData));

// 查询用户是否存在
$existingUser = $userManager->findByOpenid($openid);

// 创建或更新用户
if (!$existingUser) {
    $api->log("用户不存在，创建新用户: " . $openid);
    
    if (!$userManager->create($userData)) {
        $api->logError("创建用户失败");
        $api->sendError('创建用户失败', APIManager::API_ERROR_DB, APIManager::HTTP_INTERNAL_SERVER_ERROR);
        exit;
    }
    
    $api->log("用户创建成功: " . $openid);
} else {
    $api->log("用户已存在，更新用户信息: " . $openid);
    $api->log("现有用户数据: " . json_encode($existingUser));
    
    if (!$userManager->update($userData)) {
        $api->logError("更新用户失败，但继续处理");
    } else {
        $api->log("用户更新成功: " . $openid);
    }
}

// 获取用户资料
$profile = $userManager->getProfile($openid);
if (!$profile) {
    $api->logError("获取用户资料失败: " . $openid);
    $api->sendError('获取用户资料失败', APIManager::API_ERROR, APIManager::HTTP_INTERNAL_SERVER_ERROR);
    exit;
}

$api->log("获取用户资料成功: " . json_encode($profile));

// 返回用户信息和session_key
$responseData = [
    'token' => $session_key,  // 使用session_key作为token
    'openid' => $openid,
    'userInfo' => $profile
];

$api->sendSuccess('登录成功', $responseData);
exit; 