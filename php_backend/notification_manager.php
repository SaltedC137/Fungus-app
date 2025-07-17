<?php
/**
 * 通知管理类
 * 处理通知的存储、检索和更新
 */

require_once 'config.php';
require_once 'session_manager.php';

class NotificationManager {
    // 通知类型
    const TYPE_SYSTEM = 'system';
    const TYPE_ACTIVITY = 'activity'; // 使用activity作为待办事项类型，保持兼容性
    
    /**
     * 获取用户的所有通知
     * @param string $openid 用户openid
     * @param bool $isLoggedIn 用户是否已登录
     * @return array 通知列表
     */
    public static function getUserNotifications($openid, $isLoggedIn = true) {
        if (empty($openid)) {
            return [];
        }
        
        $allNotifications = self::getAllNotifications();
        $userNotifications = [];
        
        foreach ($allNotifications as $notification) {
            // 非登录用户只能看到系统通知
            if (!$isLoggedIn && $notification['type'] !== self::TYPE_SYSTEM) {
                continue;
            }
            
            // 获取系统通知和针对该用户的通知
            if ($notification['type'] === self::TYPE_SYSTEM || 
                $notification['type'] === self::TYPE_ACTIVITY || // 登录用户可以看到所有待办通知
                (isset($notification['target_users']) && in_array($openid, $notification['target_users']))) {
                
                // 检查用户已读状态
                $notification['isRead'] = self::isNotificationRead($openid, $notification['id']);
                
                // 移除target_users字段，前端不需要
                if (isset($notification['target_users'])) {
                    unset($notification['target_users']);
                }
                
                $userNotifications[] = $notification;
            }
        }
        
        // 按时间倒序排序
        usort($userNotifications, function($a, $b) {
            return strtotime($b['time']) - strtotime($a['time']);
        });
        
        return $userNotifications;
    }
    
    /**
     * 创建新通知
     * @param string $type 通知类型 (system/activity)
     * @param string $title 通知标题
     * @param string $content 通知内容
     * @param array $targetUsers 目标用户openid列表 (为空则发送给所有用户)
     * @return bool 是否创建成功
     */
    public static function createNotification($type, $title, $content, $targetUsers = []) {
        $allNotifications = self::getAllNotifications();
        
        // 创建新通知
        $notification = [
            'id' => time() . rand(1000, 9999), // 生成唯一ID
            'type' => $type,
            'title' => $title,
            'content' => $content,
            'time' => date('Y-m-d H:i:s'),
            'target_users' => $targetUsers
        ];
        
        // 添加到通知列表
        $allNotifications[] = $notification;
        
        // 保存通知列表
        return self::saveAllNotifications($allNotifications);
    }
    
    /**
     * 标记通知为已读
     * @param string $openid 用户openid
     * @param string $notificationId 通知ID
     * @return bool 是否标记成功
     */
    public static function markAsRead($openid, $notificationId) {
        if (empty($openid) || empty($notificationId)) {
            return false;
        }
        
        $readStatus = self::getReadStatus($openid);
        
        // 如果通知已经标记为已读，直接返回成功
        if (isset($readStatus[$notificationId])) {
            return true;
        }
        
        // 标记为已读
        $readStatus[$notificationId] = time();
        
        // 保存已读状态
        return self::saveReadStatus($openid, $readStatus);
    }
    
    /**
     * 标记所有通知为已读
     * @param string $openid 用户openid
     * @param string|null $type 可选，指定类型的通知
     * @return bool 是否标记成功
     */
    public static function markAllAsRead($openid, $type = null) {
        if (empty($openid)) {
            return false;
        }
        
        $notifications = self::getUserNotifications($openid);
        $readStatus = self::getReadStatus($openid);
        $hasUnread = false;
        
        foreach ($notifications as $notification) {
            // 如果指定了类型，只标记该类型的通知
            if ($type !== null && $notification['type'] !== $type) {
                continue;
            }
            
            if (!isset($readStatus[$notification['id']])) {
                $readStatus[$notification['id']] = time();
                $hasUnread = true;
            }
        }
        
        // 如果有未读通知，保存已读状态
        if ($hasUnread) {
            return self::saveReadStatus($openid, $readStatus);
        }
        
        return true;
    }
    
    /**
     * 检查通知是否已读
     * @param string $openid 用户openid
     * @param string $notificationId 通知ID
     * @return bool 是否已读
     */
    private static function isNotificationRead($openid, $notificationId) {
        $readStatus = self::getReadStatus($openid);
        return isset($readStatus[$notificationId]);
    }
    
    /**
     * 获取用户已读状态
     * @param string $openid 用户openid
     * @return array 已读状态
     */
    private static function getReadStatus($openid) {
        $readStatusFile = DATA_PATH . 'notification_read_' . $openid . '.txt';
        
        if (!file_exists($readStatusFile)) {
            return [];
        }
        
        $content = file_get_contents($readStatusFile);
        $readStatus = json_decode($content, true);
        
        return is_array($readStatus) ? $readStatus : [];
    }
    
    /**
     * 保存用户已读状态
     * @param string $openid 用户openid
     * @param array $readStatus 已读状态
     * @return bool 是否保存成功
     */
    private static function saveReadStatus($openid, $readStatus) {
        $readStatusFile = DATA_PATH . 'notification_read_' . $openid . '.txt';
        $content = json_encode($readStatus, JSON_PRETTY_PRINT);
        
        return file_put_contents($readStatusFile, $content) !== false;
    }
    
    /**
     * 获取所有通知
     * @return array 通知列表
     */
    private static function getAllNotifications() {
        // 确保通知文件存在
        if (!file_exists(NOTIFICATION_FILE)) {
            $dir = dirname(NOTIFICATION_FILE);
            if (!file_exists($dir)) {
                mkdir($dir, 0755, true);
            }
            file_put_contents(NOTIFICATION_FILE, '[]');
            return [];
        }
        
        if (filesize(NOTIFICATION_FILE) === 0) {
            file_put_contents(NOTIFICATION_FILE, '[]');
            return [];
        }
        
        $content = file_get_contents(NOTIFICATION_FILE);
        $notifications = json_decode($content, true);
        
        return is_array($notifications) ? $notifications : [];
    }
    
    /**
     * 保存所有通知
     * @param array $notifications 通知列表
     * @return bool 是否保存成功
     */
    private static function saveAllNotifications($notifications) {
        $content = json_encode($notifications, JSON_PRETTY_PRINT);
        return file_put_contents(NOTIFICATION_FILE, $content) !== false;
    }
}
?> 