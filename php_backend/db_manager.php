<?php
/**
 * 数据库管理类
 * 整合数据库连接、初始化、修复和诊断功能
 */
class DBManager
{
    private $sqlite_path;
    private $conn;
    private $config;
    
    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->config = require_once 'config.php';
        $this->sqlite_path = $this->config['database']['sqlite_path'];
        
        // 确保database目录存在
        $dir = dirname($this->sqlite_path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
    
    /**
     * 获取数据库连接
     * 
     * @return PDO|null 数据库连接对象，失败返回null
     */
    public function getConnection()
    {
        $this->conn = null;
        
        try {
            error_log("开始数据库连接尝试 - SQLite路径: {$this->sqlite_path}");
            
            // 检查SQLite扩展是否加载
            if (!extension_loaded('pdo_sqlite')) {
                error_log("错误: PDO SQLite扩展未加载");
                throw new Exception("PDO SQLite扩展未加载");
            }
            
            // 检查数据库目录是否存在
            $dir = dirname($this->sqlite_path);
            error_log("数据库目录: {$dir}");
            
            if (!is_dir($dir)) {
                error_log("数据库目录不存在，尝试创建: {$dir}");
                if (!mkdir($dir, 0755, true)) {
                    error_log("无法创建数据库目录: {$dir}");
                    throw new Exception("无法创建数据库目录: {$dir}");
                }
                error_log("成功创建数据库目录: {$dir}");
            }
            
            // 检查目录权限
            if (!is_writable($dir)) {
                error_log("数据库目录没有写入权限: {$dir}");
                throw new Exception("数据库目录没有写入权限: {$dir}");
            }
            
            // 检查数据库文件是否存在，如果存在检查权限
            if (file_exists($this->sqlite_path)) {
                if (!is_writable($this->sqlite_path)) {
                    error_log("数据库文件存在但没有写入权限: {$this->sqlite_path}");
                    throw new Exception("数据库文件没有写入权限");
                }
                error_log("数据库文件存在并有写入权限");
            } else {
                error_log("数据库文件不存在，将尝试创建: {$this->sqlite_path}");
                // 尝试创建一个空文件以确保权限
                if (!touch($this->sqlite_path)) {
                    error_log("无法创建数据库文件: {$this->sqlite_path}");
                    throw new Exception("无法创建数据库文件");
                }
                chmod($this->sqlite_path, 0644);
                error_log("成功创建数据库文件");
            }
            
            // 建立数据库连接
            $this->conn = new PDO("sqlite:" . $this->sqlite_path);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
            // 启用外键约束
            $this->conn->exec('PRAGMA foreign_keys = ON');
            
            // 测试连接
            $result = $this->conn->query("SELECT 1")->fetch();
            if ($result) {
                error_log("数据库连接测试成功");
            }
            
            // 检查users表是否存在
            $tablesQuery = $this->conn->query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
            $tableExists = ($tablesQuery->fetch() !== false);
            error_log("users表" . ($tableExists ? "存在" : "不存在"));
            
            // 如果表不存在，尝试创建
            if (!$tableExists) {
                error_log("尝试创建users表");
                $this->initializeDatabase();
            }
            
            error_log("成功连接到数据库: {$this->sqlite_path}");
            
        } catch(PDOException $e) {
            error_log("PDO数据库连接错误: " . $e->getMessage());
            error_log("PDO错误代码: " . $e->getCode());
            error_log("PDO错误位置: " . $e->getFile() . ':' . $e->getLine());
            return null;
        } catch(Exception $e) {
            error_log("数据库连接通用错误: " . $e->getMessage());
            error_log("错误位置: " . $e->getFile() . ':' . $e->getLine());
            return null;
        }
        
        return $this->conn;
    }
    
    /**
     * 初始化数据库，创建必要的表和索引
     * 
     * @return bool 成功返回true，失败返回false
     */
    public function initializeDatabase()
    {
        try {
            error_log("开始初始化数据库");
            
            // 创建users表
            $createUsersTable = "
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                openid TEXT NOT NULL UNIQUE,
                unionid TEXT,
                nickname TEXT,
                avatar_url TEXT,
                gender INTEGER DEFAULT 0,
                country TEXT,
                province TEXT,
                city TEXT,
                language TEXT,
                phone_number TEXT,
                department TEXT DEFAULT '***',
                role TEXT DEFAULT '学生',
                group_name TEXT DEFAULT '***',
                is_verified INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )";
            
            $this->conn->exec($createUsersTable);
            error_log("users表创建成功");
            
            // 创建索引
            $this->conn->exec("CREATE INDEX IF NOT EXISTS idx_openid ON users (openid)");
            $this->conn->exec("CREATE INDEX IF NOT EXISTS idx_unionid ON users (unionid)");
            error_log("索引创建成功");
            
            // 插入一条测试数据以验证表是否可用
            $testInsertSQL = "INSERT INTO users (openid, nickname, created_at) VALUES ('test_openid', '测试用户', datetime('now'))";
            $this->conn->exec($testInsertSQL);
            error_log("成功插入测试数据");
            
            // 删除测试数据
            $this->conn->exec("DELETE FROM users WHERE openid = 'test_openid'");
            error_log("成功删除测试数据");
            
            return true;
        } catch (PDOException $e) {
            error_log("初始化数据库失败: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * 修复数据库问题
     * 
     * @return array 修复结果
     */
    public function fixDatabase()
    {
        $response = [
            'success' => false,
            'steps' => [],
            'errors' => []
        ];
        
        try {
            // 步骤1: 检查SQLite扩展
            if (!extension_loaded('pdo_sqlite')) {
                $response['errors'][] = 'PDO SQLite扩展未加载';
                return $response;
            }
            $response['steps'][] = 'SQLite扩展检查通过';
            
            // 步骤2: 检查数据库目录
            $dir = dirname($this->sqlite_path);
            if (!is_dir($dir)) {
                if (!mkdir($dir, 0755, true)) {
                    $response['errors'][] = '无法创建数据库目录: ' . $dir;
                    return $response;
                }
                $response['steps'][] = '创建数据库目录: ' . $dir;
            } else {
                $response['steps'][] = '数据库目录已存在: ' . $dir;
            }
            
            // 确保目录有写入权限
            if (!is_writable($dir)) {
                if (!chmod($dir, 0755)) {
                    $response['errors'][] = '无法设置目录权限: ' . $dir;
                    return $response;
                }
                $response['steps'][] = '已设置目录权限';
            }
            
            // 步骤3: 检查数据库文件
            $db_exists = file_exists($this->sqlite_path);
            if ($db_exists) {
                $response['steps'][] = '数据库文件已存在: ' . $this->sqlite_path;
                
                // 检查文件权限
                if (!is_writable($this->sqlite_path)) {
                    if (!chmod($this->sqlite_path, 0644)) {
                        $response['errors'][] = '无法设置数据库文件权限: ' . $this->sqlite_path;
                        return $response;
                    }
                    $response['steps'][] = '已设置数据库文件权限';
                }
            } else {
                // 创建空数据库文件
                if (!touch($this->sqlite_path)) {
                    $response['errors'][] = '无法创建数据库文件: ' . $this->sqlite_path;
                    return $response;
                }
                chmod($this->sqlite_path, 0644);
                $response['steps'][] = '创建新的数据库文件: ' . $this->sqlite_path;
            }
            
            // 步骤4: 尝试连接数据库
            $pdo = new PDO("sqlite:" . $this->sqlite_path);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $response['steps'][] = '数据库连接成功';
            
            // 步骤5: 初始化数据库
            $this->conn = $pdo;
            if ($this->initializeDatabase()) {
                $response['steps'][] = '数据库初始化成功';
            } else {
                $response['errors'][] = '数据库初始化失败';
                return $response;
            }
            
            // 修复成功
            $response['success'] = true;
            $response['message'] = '数据库修复完成';
            
            return $response;
        } catch (Exception $e) {
            $response['errors'][] = '修复过程异常: ' . $e->getMessage();
            return $response;
        }
    }
    
    /**
     * 诊断数据库状态
     * 
     * @return array 诊断结果
     */
    public function diagnoseDatabase()
    {
        $result = [
            'success' => false,
            'database' => [
                'connection' => false,
                'file_exists' => false,
                'file_writable' => false,
                'dir_exists' => false,
                'dir_writable' => false
            ],
            'tables' => [
                'users' => [
                    'exists' => false,
                    'columns' => []
                ]
            ],
            'php' => [
                'version' => PHP_VERSION,
                'extensions' => [
                    'pdo' => extension_loaded('pdo'),
                    'pdo_sqlite' => extension_loaded('pdo_sqlite'),
                    'sqlite3' => extension_loaded('sqlite3')
                ]
            ],
            'errors' => []
        ];
        
        // 检查数据库目录
        $dir = dirname($this->sqlite_path);
        $result['database']['dir_exists'] = is_dir($dir);
        $result['database']['dir_writable'] = is_writable($dir);
        
        // 检查数据库文件
        $result['database']['file_exists'] = file_exists($this->sqlite_path);
        if ($result['database']['file_exists']) {
            $result['database']['file_writable'] = is_writable($this->sqlite_path);
            $result['database']['file_size'] = filesize($this->sqlite_path);
            $result['database']['file_permissions'] = substr(sprintf('%o', fileperms($this->sqlite_path)), -4);
        }
        
        // 尝试连接数据库
        try {
            $pdo = new PDO("sqlite:" . $this->sqlite_path);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $result['database']['connection'] = true;
            
            // 检查users表
            $tablesQuery = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'");
            $tables = $tablesQuery->fetchAll(PDO::FETCH_COLUMN);
            $result['tables']['all_tables'] = $tables;
            
            // 检查users表是否存在
            $result['tables']['users']['exists'] = in_array('users', $tables);
            
            if ($result['tables']['users']['exists']) {
                // 获取表结构
                $columnsQuery = $pdo->query("PRAGMA table_info(users)");
                $columns = $columnsQuery->fetchAll();
                
                foreach ($columns as $column) {
                    $result['tables']['users']['columns'][] = [
                        'name' => $column['name'],
                        'type' => $column['type']
                    ];
                }
                
                // 检查索引
                $indexQuery = $pdo->query("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users'");
                $result['tables']['users']['indexes'] = $indexQuery->fetchAll(PDO::FETCH_COLUMN);
                
                // 尝试查询用户数
                $countQuery = $pdo->query("SELECT COUNT(*) as count FROM users");
                $count = $countQuery->fetch();
                $result['tables']['users']['record_count'] = $count['count'];
            }
            
            $result['success'] = true;
        } catch (Exception $e) {
            $result['errors'][] = '数据库操作异常: ' . $e->getMessage();
        }
        
        return $result;
    }
    
    /**
     * 备份数据库
     * 
     * @return bool|string 成功返回备份文件路径，失败返回false
     */
    public function backupDatabase()
    {
        try {
            // 确保数据库文件存在
            if (!file_exists($this->sqlite_path)) {
                error_log("备份失败：数据库文件不存在");
                return false;
            }
            
            // 创建备份目录
            $backupDir = dirname($this->sqlite_path) . '/backups';
            if (!is_dir($backupDir)) {
                if (!mkdir($backupDir, 0755, true)) {
                    error_log("无法创建备份目录");
                    return false;
                }
            }
            
            // 生成备份文件名
            $timestamp = date('Y-m-d_H-i-s');
            $backupFile = $backupDir . '/wechat_app_' . $timestamp . '.db';
            
            // 复制数据库文件
            if (copy($this->sqlite_path, $backupFile)) {
                error_log("数据库备份成功: " . $backupFile);
                return $backupFile;
            } else {
                error_log("数据库备份失败");
                return false;
            }
        } catch (Exception $e) {
            error_log("备份过程异常: " . $e->getMessage());
            return false;
        }
    }
}
?> 