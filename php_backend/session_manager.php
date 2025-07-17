<?php
/**
 * 会话管理类
 * 处理用户登录会话
 */

require_once 'config.php';

class SessionManager {
    /**
     * 创建会话
     * @param string $openid 用户openid
     * @return string 会话token
     */
    public static function createSession($openid) {
        $sessions = self::getAllSessions();
        
        // 生成token
        $token = generateRandomString(32);
        
        // 检查是否已有会话
        $sessionExists = false;
        foreach ($sessions as &$session) {
            if ($session['openid'] === $openid) {
                // 更新会话
                $session['token'] = $token;
                $session['updateTime'] = date('Y-m-d H:i:s');
                $sessionExists = true;
                break;
            }
        }
        // 如果没有会话，创建新会话
        if (!$sessionExists) {
            $sessions[] = [
                'openid' => $openid,
                'token' => $token,
                'createTime' => date('Y-m-d H:i:s'),
                'updateTime' => date('Y-m-d H:i:s')
            ];
        }
        // 保存会话
        self::saveAllSessions($sessions);
        return $token;
    }
    
/**
 * 验证会话
 * @param string $token 会话token
 * @return string|null 用户openid，无效返回null
 */
 public static function validateSession($token) {
    if (empty($token)) {
        error_log("Session验证失败: token为空");
        return null;
    }
    
    // 调试日志
    $debugFile = DATA_PATH . 'session_debug.txt';
    $debugData = [
        'time' => date('Y-m-d H:i:s'),
        'action' => 'validateSession',
        'token' => $token
    ];
    
    $sessions = self::getAllSessions();
    
    // 记录所有会话信息用于调试
    $debugData['all_sessions'] = $sessions;
    
    foreach ($sessions as $session) {
        if ($session['token'] === $token) {
            // 找到匹配的会话
            $debugData['result'] = 'success';
            $debugData['openid'] = $session['openid'];
            file_put_contents($debugFile, json_encode($debugData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);
            return $session['openid'];
        }
    }
    
    // 未找到匹配的会话
    $debugData['result'] = 'failed';
    file_put_contents($debugFile, json_encode($debugData, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);
    return null;
}
    
    /**
     * 删除会话
     * @param string $token 会话token
     * @return bool 是否删除成功
     */
    public static function deleteSession($token) {
        $sessions = self::getAllSessions();
        
        foreach ($sessions as $key => $session) {
            if ($session['token'] === $token) {
                unset($sessions[$key]);
                return self::saveAllSessions(array_values($sessions));
            }
        }
        
        return false;
    }
    
    /**
     * 清理过期会话
     * @param int $expireHours 过期时间（小时）
     * @return int 清理的会话数
     */
    public static function cleanExpiredSessions($expireHours = 24) {
        $sessions = self::getAllSessions();
        $now = time();
        $count = 0;
        
        foreach ($sessions as $key => $session) {
            $updateTime = strtotime($session['updateTime']);
            if ($now - $updateTime > $expireHours * 3600) {
                unset($sessions[$key]);
                $count++;
            }
        }
        
        if ($count > 0) {
            self::saveAllSessions(array_values($sessions));
        }
        
        return $count;
    }
    
    /**
     * 获取所有会话
     * @return array 会话列表
     */
    private static function getAllSessions() {
        if (!file_exists(SESSION_FILE) || filesize(SESSION_FILE) === 0) {
            return [];
        }
        
        $content = file_get_contents(SESSION_FILE);
        $sessions = json_decode($content, true);
        
        return is_array($sessions) ? $sessions : [];
    }
    
    /**
     * 保存所有会话
     * @param array $sessions 会话列表
     * @return bool 是否保存成功
     */
    private static function saveAllSessions($sessions) {
        $content = json_encode($sessions, JSON_PRETTY_PRINT);
        return file_put_contents(SESSION_FILE, $content) !== false;
    }
} 