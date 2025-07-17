<?php
/**
 * 用户管理类
 * 处理用户数据的读写操作
 */

require_once 'config.php';

class UserManager {
    /**
     * 保存用户信息
     * @param string $openid 用户openid
     * @param array $userInfo 用户信息
     * @param string $phoneNumber 手机号（可选）
     * @return bool 是否保存成功
     */
    public static function saveUser($openid, $userInfo = [], $phoneNumber = '') {
        $users = self::getAllUsers();
        
        // 检查用户是否已存在
        $userExists = false;
        foreach ($users as &$user) {
            if ($user['openid'] === $openid) {
                // 更新用户信息
                if (!empty($userInfo)) {
                    $user['userInfo'] = $userInfo;
                }
                // 更新手机号
                if (!empty($phoneNumber)) {
                    $user['phoneNumber'] = $phoneNumber;
                }
                $userExists = true;
                break;
            }
        }
        
        // 如果用户不存在，添加新用户
        if (!$userExists) {
            $users[] = [
                'openid' => $openid,
                'userInfo' => $userInfo,
                'phoneNumber' => $phoneNumber,
                'createTime' => date('Y-m-d H:i:s')
            ];
        }
        
        // 保存到文件
        return self::saveAllUsers($users);
    }
    
    /**
     * 获取用户信息
     * @param string $openid 用户openid
     * @return array|null 用户信息，不存在返回null
     */
    public static function getUser($openid) {
        $users = self::getAllUsers();
        
        foreach ($users as $user) {
            if ($user['openid'] === $openid) {
                return $user;
            }
        }
        
        return null;
    }
    
    /**
     * 绑定手机号
     * @param string $openid 用户openid
     * @param string $phoneNumber 手机号
     * @return bool 是否绑定成功
     */
    public static function bindPhone($openid, $phoneNumber) {
        $users = self::getAllUsers();
        
        foreach ($users as &$user) {
            if ($user['openid'] === $openid) {
                $user['phoneNumber'] = $phoneNumber;
                return self::saveAllUsers($users);
            }
        }
        
        return false;
    }
    
    /**
     * 检查用户是否需要绑定手机号
     * @param string $openid 用户openid
     * @return bool 是否需要绑定
     */
    public static function needBindPhone($openid) {
        $user = self::getUser($openid);
        
        if (!$user) {
            return true;
        }
        
        return empty($user['phoneNumber']);
    }
    
    /**
     * 获取所有用户
     * @return array 用户列表
     */
    private static function getAllUsers() {
        if (!file_exists(USER_FILE) || filesize(USER_FILE) === 0) {
            return [];
        }
        
        $content = file_get_contents(USER_FILE);
        $users = json_decode($content, true);
        
        return is_array($users) ? $users : [];
    }
    
    /**
     * 保存所有用户
     * @param array $users 用户列表
     * @return bool 是否保存成功
     */
    private static function saveAllUsers($users) {
        $content = json_encode($users, JSON_PRETTY_PRINT);
        return file_put_contents(USER_FILE, $content) !== false;
    }
} 