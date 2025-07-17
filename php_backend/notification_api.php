<?php
/**
 * 通知API
 * 处理通知相关的请求
 */

require_once 'config.php';
require_once 'session_manager.php';
require_once 'notification_manager.php';

// 设置允许跨域请求
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type, token');

// 处理预检请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// 获取请求动作
$action = isset($_GET['action']) ? $_GET['action'] : '';

// 获取token
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

$openid = SessionManager::validateSession($token);

// 根据动作执行不同的操作
switch ($action) {
    case 'get_notifications':
        // 获取用户通知列表
        $isLoggedIn = !empty($openid);
        $userOpenid = $isLoggedIn ? $openid : 'anonymous';
        
        // 非登录用户也可以获取系统通知
        $notifications = NotificationManager::getUserNotifications($userOpenid, $isLoggedIn);
        $unreadCount = 0;
        
        // 计算未读通知数量
        foreach ($notifications as $notification) {
            if (!$notification['isRead']) {
                $unreadCount++;
            }
        }
        
        echo response(STATUS_SUCCESS, '获取通知成功', [
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
            'isLoggedIn' => $isLoggedIn
        ]);
        break;
        
    case 'mark_read':
        // 标记通知为已读
        if (!$openid) {
            echo response(STATUS_ERROR, '未登录或登录已过期');
            break;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $notificationId = isset($data['id']) ? $data['id'] : '';
        
        if (empty($notificationId)) {
            echo response(STATUS_ERROR, '参数错误');
            break;
        }
        
        $result = NotificationManager::markAsRead($openid, $notificationId);
        
        if ($result) {
            echo response(STATUS_SUCCESS, '标记已读成功');
        } else {
            echo response(STATUS_ERROR, '标记已读失败');
        }
        break;
        
    case 'mark_all_read':
        // 标记所有通知为已读
        if (!$openid) {
            echo response(STATUS_ERROR, '未登录或登录已过期');
            break;
        }
        
        $data = json_decode(file_get_contents('php://input'), true);
        $type = isset($data['type']) ? $data['type'] : null;
        
        $result = NotificationManager::markAllAsRead($openid, $type);
        
        if ($result) {
            echo response(STATUS_SUCCESS, '全部标记已读成功');
        } else {
            echo response(STATUS_ERROR, '全部标记已读失败');
        }
        break;
        
    default:
        echo response(STATUS_ERROR, '未知操作');
}
?> 