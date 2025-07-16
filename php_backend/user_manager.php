<?php
/**
 * 用户管理类
 * 整合用户相关的所有操作
 */
class UserManager
{
    private $conn;
    
    /**
     * 构造函数
     * 
     * @param PDO $db 数据库连接
     */
    public function __construct($db)
    {
        $this->conn = $db;
    }
    
    /**
     * 根据openid查询用户
     * 
     * @param string $openid 微信openid
     * @return array|false 用户数据或false
     */
    public function findByOpenid($openid)
    {
        if (empty($openid)) {
            error_log("查询用户失败: openid为空");
            return false;
        }
        
        $query = "SELECT * FROM users WHERE openid = :openid LIMIT 1";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':openid', $openid, PDO::PARAM_STR);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                return $stmt->fetch();
            } else {
                return false;
            }
        } catch (PDOException $e) {
            error_log("查询用户失败: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 创建新用户
     * 
     * @param array $userData 用户数据
     * @return bool 成功返回true，失败返回false
     */
    public function create($userData)
    {
        // 检查数据库连接
        if (!$this->conn) {
            error_log("创建用户失败: 数据库连接为空");
            return false;
        }
        
        // 检查必要的字段
        if (empty($userData['openid'])) {
            error_log("创建用户失败: openid为空");
            return false;
        }
        
        error_log("开始创建用户: " . json_encode($userData));
        error_log("创建用户昵称: '" . $userData['nickname'] . "'");
        
        // SQLite的日期时间格式
        $currentTime = date('Y-m-d H:i:s');
        
        $query = "INSERT INTO users (openid, unionid, nickname, avatar_url, gender, country, province, city, language, created_at) 
                 VALUES (:openid, :unionid, :nickname, :avatar_url, :gender, :country, :province, :city, :language, :created_at)";
        
        try {
            // 开始事务
            $this->conn->beginTransaction();
            
            $stmt = $this->conn->prepare($query);
            
            // 安全处理数据
            $openid = $userData['openid'] ?? '';
            $unionid = $userData['unionid'] ?? '';
            $nickname = $userData['nickname'] ?? '';
            $avatar_url = $userData['avatar_url'] ?? '';
            $gender = (int)($userData['gender'] ?? 0);
            $country = $userData['country'] ?? '';
            $province = $userData['province'] ?? '';
            $city = $userData['city'] ?? '';
            $language = $userData['language'] ?? '';
            
            error_log("处理后的昵称值: '" . $nickname . "'");
            
            // 绑定参数
            $stmt->bindParam(':openid', $openid, PDO::PARAM_STR);
            $stmt->bindParam(':unionid', $unionid, PDO::PARAM_STR);
            $stmt->bindParam(':nickname', $nickname, PDO::PARAM_STR);
            $stmt->bindParam(':avatar_url', $avatar_url, PDO::PARAM_STR);
            $stmt->bindParam(':gender', $gender, PDO::PARAM_INT);
            $stmt->bindParam(':country', $country, PDO::PARAM_STR);
            $stmt->bindParam(':province', $province, PDO::PARAM_STR);
            $stmt->bindParam(':city', $city, PDO::PARAM_STR);
            $stmt->bindParam(':language', $language, PDO::PARAM_STR);
            $stmt->bindParam(':created_at', $currentTime, PDO::PARAM_STR);
            
            error_log("执行SQL插入: " . $query);
            
            // 执行SQL
            $result = $stmt->execute();
            
            if ($result) {
                // 提交事务
                $this->conn->commit();
                $newId = $this->conn->lastInsertId();
                error_log("用户创建成功，ID: " . $newId);
                
                // 验证创建是否真的生效
                $newUser = $this->findByOpenid($openid);
                if ($newUser) {
                    error_log("新创建的用户数据: " . json_encode($newUser));
                    error_log("新创建的用户昵称: '" . $newUser['nickname'] . "'");
                }
                
                return true;
            } else {
                // 回滚事务
                $this->conn->rollBack();
                $errorInfo = $stmt->errorInfo();
                error_log("用户创建失败，SQL错误: " . json_encode($errorInfo));
                return false;
            }
        } catch (PDOException $e) {
            // 回滚事务
            if ($this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            
            error_log("创建用户PDO异常: " . $e->getMessage());
            error_log("SQL状态: " . $e->getCode());
            
            // 检查是否是唯一性约束冲突
            if ($e->getCode() == 23000 || strpos($e->getMessage(), "UNIQUE constraint failed") !== false) {
                error_log("用户已存在，尝试更新而不是创建");
                return $this->update($userData);
            }
            
            return false;
        } catch (Exception $e) {
            // 回滚事务
            if ($this->conn && $this->conn->inTransaction()) {
                $this->conn->rollBack();
            }
            
            error_log("创建用户通用异常: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 更新用户信息
     * 
     * @param array $userData 用户数据
     * @return bool 成功返回true，失败返回false
     */
    public function update($userData)
    {
        if (empty($userData['openid'])) {
            error_log("更新用户失败: openid为空");
            return false;
        }
        
        error_log("开始更新用户信息: " . json_encode($userData));
        error_log("更新用户昵称: '" . $userData['nickname'] . "'");
        
        // SQLite的日期时间格式
        $currentTime = date('Y-m-d H:i:s');
        
        $query = "UPDATE users SET 
                 nickname = :nickname,
                 avatar_url = :avatar_url,
                 gender = :gender,
                 country = :country,
                 province = :province,
                 city = :city,
                 language = :language,
                 updated_at = :updated_at
                 WHERE openid = :openid";
                 
        try {
            $stmt = $this->conn->prepare($query);
            
            // 绑定参数
            $stmt->bindParam(':openid', $userData['openid'], PDO::PARAM_STR);
            $stmt->bindParam(':nickname', $userData['nickname'], PDO::PARAM_STR);
            $stmt->bindParam(':avatar_url', $userData['avatar_url'], PDO::PARAM_STR);
            $stmt->bindParam(':gender', $userData['gender'], PDO::PARAM_INT);
            $stmt->bindParam(':country', $userData['country'], PDO::PARAM_STR);
            $stmt->bindParam(':province', $userData['province'], PDO::PARAM_STR);
            $stmt->bindParam(':city', $userData['city'], PDO::PARAM_STR);
            $stmt->bindParam(':language', $userData['language'], PDO::PARAM_STR);
            $stmt->bindParam(':updated_at', $currentTime, PDO::PARAM_STR);
            
            if ($stmt->execute()) {
                error_log("用户更新成功: " . $userData['openid']);
                
                // 验证更新是否真的生效
                $updatedUser = $this->findByOpenid($userData['openid']);
                if ($updatedUser) {
                    error_log("更新后的用户数据: " . json_encode($updatedUser));
                    error_log("更新后的昵称: '" . $updatedUser['nickname'] . "'");
                }
                
                return true;
            } else {
                error_log("用户更新失败: " . $userData['openid']);
                return false;
            }
        } catch (PDOException $e) {
            error_log("更新用户失败: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 更新用户手机号
     * 
     * @param string $openid 用户openid
     * @param string $phoneNumber 手机号
     * @return bool 成功返回true，失败返回false
     */
    public function updatePhoneNumber($openid, $phoneNumber)
    {
        if (empty($openid)) {
            error_log("更新手机号失败: openid为空");
            return false;
        }
        
        // SQLite的日期时间格式
        $currentTime = date('Y-m-d H:i:s');
        
        $query = "UPDATE users SET phone_number = :phone_number, updated_at = :updated_at WHERE openid = :openid";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':phone_number', $phoneNumber, PDO::PARAM_STR);
            $stmt->bindParam(':openid', $openid, PDO::PARAM_STR);
            $stmt->bindParam(':updated_at', $currentTime, PDO::PARAM_STR);
            
            if ($stmt->execute()) {
                error_log("手机号更新成功: " . $openid);
                return true;
            } else {
                error_log("手机号更新失败: " . $openid);
                return false;
            }
        } catch (PDOException $e) {
            error_log("更新手机号失败: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 获取用户个人资料（返回给前端的数据）
     * 
     * @param string $openid 用户openid
     * @return array|false 用户资料或false
     */
    public function getProfile($openid)
    {
        if (empty($openid)) {
            error_log("获取用户资料失败: openid为空");
            return false;
        }
        
        $query = "SELECT id, nickname, avatar_url, gender, phone_number, 
                 department, role, group_name, is_verified 
                 FROM users WHERE openid = :openid LIMIT 1";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':openid', $openid, PDO::PARAM_STR);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                $user = $stmt->fetch();
                error_log("用户资料获取成功: " . json_encode($user));
                error_log("数据库中的nickname值: '" . $user['nickname'] . "'");
                
                // 构建前端需要的用户资料格式
                $profile = [
                    'id' => $user['id'],
                    'nickName' => $user['nickname'], // 直接使用数据库中的nickname，不使用默认值
                    'avatarUrl' => $user['avatar_url'],
                    'gender' => $user['gender'],
                    'phoneNumber' => $user['phone_number'] ?? '',
                    'department' => $user['department'] ?? '***',
                    'role' => $user['role'] ?? '学生',
                    'groupName' => $user['group_name'] ?? '***',
                    'isVerified' => (bool)$user['is_verified']
                ];
                
                error_log("返回给前端的用户资料: " . json_encode($profile));
                return $profile;
            } else {
                error_log("用户不存在: " . $openid);
                return false;
            }
        } catch (PDOException $e) {
            error_log("获取用户资料失败: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 获取所有用户
     * 
     * @param int $limit 限制数量
     * @param int $offset 偏移量
     * @return array 用户列表
     */
    public function getAllUsers($limit = 100, $offset = 0)
    {
        $query = "SELECT id, openid, nickname, avatar_url, gender, phone_number, 
                 department, role, group_name, is_verified, created_at 
                 FROM users ORDER BY created_at DESC LIMIT :limit OFFSET :offset";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("获取用户列表失败: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * 获取用户总数
     * 
     * @return int 用户总数
     */
    public function getUserCount()
    {
        $query = "SELECT COUNT(*) as count FROM users";
        
        try {
            $stmt = $this->conn->query($query);
            $result = $stmt->fetch();
            return (int)$result['count'];
        } catch (PDOException $e) {
            error_log("获取用户总数失败: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * 删除用户
     * 
     * @param string $openid 用户openid
     * @return bool 成功返回true，失败返回false
     */
    public function deleteUser($openid)
    {
        if (empty($openid)) {
            error_log("删除用户失败: openid为空");
            return false;
        }
        
        $query = "DELETE FROM users WHERE openid = :openid";
        
        try {
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':openid', $openid, PDO::PARAM_STR);
            
            if ($stmt->execute()) {
                error_log("用户删除成功: " . $openid);
                return true;
            } else {
                error_log("用户删除失败: " . $openid);
                return false;
            }
        } catch (PDOException $e) {
            error_log("删除用户失败: " . $e->getMessage());
            return false;
        }
    }
}
?> 