<?php
/**
 * 后端首页
 * 提供导航到各个管理页面
 */

// 检查数据目录是否存在
$dataPath = __DIR__ . '/data';
$dataExists = is_dir($dataPath);
$dataWritable = is_writable($dataPath);

// 检查各个文件是否存在
$configExists = file_exists(__DIR__ . '/config.php');
$sessionManagerExists = file_exists(__DIR__ . '/session_manager.php');
$notificationManagerExists = file_exists(__DIR__ . '/notification_manager.php');
$notificationApiExists = file_exists(__DIR__ . '/notification_api.php');
$notificationAdminExists = file_exists(__DIR__ . '/notification_admin.php');

// 检查通知文件是否存在
$notificationFileExists = false;
$notificationCount = 0;
if ($dataExists) {
    $notificationFile = $dataPath . '/notifications.txt';
    $notificationFileExists = file_exists($notificationFile);
    
    if ($notificationFileExists) {
        $content = file_get_contents($notificationFile);
        $notifications = json_decode($content, true);
        $notificationCount = is_array($notifications) ? count($notifications) : 0;
    }
}
?>

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>微信小程序后端管理</title>
    <link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.0.2/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 800px;
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            margin-bottom: 30px;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 10px;
        }
        .status-card {
            margin-bottom: 20px;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .status-item:last-child {
            border-bottom: none;
        }
        .status-success {
            color: #198754;
        }
        .status-error {
            color: #dc3545;
        }
        .menu-card {
            margin-top: 30px;
        }
        .menu-item {
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>微信小程序后端管理</h1>
            <p class="text-muted">管理通知和用户数据</p>
        </div>
        
        <div class="card status-card">
            <div class="card-header">
                系统状态
            </div>
            <div class="card-body">
                <div class="status-item">
                    <span>数据目录</span>
                    <?php if ($dataExists && $dataWritable): ?>
                        <span class="status-success">正常 (可写)</span>
                    <?php elseif ($dataExists): ?>
                        <span class="status-error">存在但不可写</span>
                    <?php else: ?>
                        <span class="status-error">不存在</span>
                    <?php endif; ?>
                </div>
                <div class="status-item">
                    <span>配置文件</span>
                    <?php if ($configExists): ?>
                        <span class="status-success">存在</span>
                    <?php else: ?>
                        <span class="status-error">不存在</span>
                    <?php endif; ?>
                </div>
                <div class="status-item">
                    <span>会话管理器</span>
                    <?php if ($sessionManagerExists): ?>
                        <span class="status-success">存在</span>
                    <?php else: ?>
                        <span class="status-error">不存在</span>
                    <?php endif; ?>
                </div>
                <div class="status-item">
                    <span>通知管理器</span>
                    <?php if ($notificationManagerExists): ?>
                        <span class="status-success">存在</span>
                    <?php else: ?>
                        <span class="status-error">不存在</span>
                    <?php endif; ?>
                </div>
                <div class="status-item">
                    <span>通知API</span>
                    <?php if ($notificationApiExists): ?>
                        <span class="status-success">存在</span>
                    <?php else: ?>
                        <span class="status-error">不存在</span>
                    <?php endif; ?>
                </div>
                <div class="status-item">
                    <span>通知管理页面</span>
                    <?php if ($notificationAdminExists): ?>
                        <span class="status-success">存在</span>
                    <?php else: ?>
                        <span class="status-error">不存在</span>
                    <?php endif; ?>
                </div>
                <div class="status-item">
                    <span>通知数据</span>
                    <?php if ($notificationFileExists): ?>
                        <span class="status-success">存在 (<?php echo $notificationCount; ?> 条通知)</span>
                    <?php else: ?>
                        <span class="status-error">不存在</span>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        
        <div class="card menu-card">
            <div class="card-header">
                功能菜单
            </div>
            <div class="card-body">
                <div class="menu-item">
                    <a href="notification_admin.php" class="btn btn-primary">通知管理</a>
                    <span class="text-muted ms-3">发送系统通知和待办通知</span>
                </div>
                <div class="menu-item">
                    <a href="notification_api.php?action=get_notifications" class="btn btn-outline-secondary">查看通知API</a>
                    <span class="text-muted ms-3">查看通知API返回数据</span>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.0.2/js/bootstrap.bundle.min.js"></script>
</body>
</html> 