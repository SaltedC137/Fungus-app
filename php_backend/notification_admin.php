<?php
/**
 * 通知管理后台
 * 用于发送系统通知和待办通知
 */

// 启动会话
session_start();

require_once 'config.php';
require_once 'notification_manager.php';

// 删除所有通知
if (isset($_GET['delete_all']) && $_GET['delete_all'] === 'confirm') {
    $result = NotificationManager::deleteAllNotifications();
    if ($result) {
        $_SESSION['notification_message'] = '<div class="alert alert-success">所有通知已成功删除</div>';
    } else {
        $_SESSION['notification_message'] = '<div class="alert alert-danger">删除所有通知失败</div>';
    }
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}

// 删除通知
if (isset($_GET['delete_id'])) {
    $deleteId = $_GET['delete_id'];
    $result = NotificationManager::deleteNotification($deleteId);
    if ($result) {
        $_SESSION['notification_message'] = '<div class="alert alert-success">通知已成功删除</div>';
    } else {
        $_SESSION['notification_message'] = '<div class="alert alert-danger">删除通知失败</div>';
    }
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}

// 添加测试通知
if (isset($_GET['add_test'])) {
    $type = $_GET['add_test'];
    if ($type === 'system') {
        $result = NotificationManager::createNotification(
            'system',
            '系统测试通知',
            '这是一条系统测试通知，用于测试通知功能是否正常工作。',
            []
        );
        if ($result) {
            $_SESSION['notification_message'] = '<div class="alert alert-success">已添加系统测试通知</div>';
        } else {
            $_SESSION['notification_message'] = '<div class="alert alert-danger">添加系统测试通知失败</div>';
        }
    } elseif ($type === 'activity') {
        $result = NotificationManager::createNotification(
            'activity',
            '待办测试通知',
            '这是一条待办测试通知，用于测试待办功能是否正常工作。',
            []
        );
        if ($result) {
            $_SESSION['notification_message'] = '<div class="alert alert-success">已添加待办测试通知</div>';
        } else {
            $_SESSION['notification_message'] = '<div class="alert alert-danger">添加待办测试通知失败</div>';
        }
    }
    header('Location: ' . $_SERVER['PHP_SELF']);
        exit;
}

// 处理表单提交
$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $type = isset($_POST['type']) ? $_POST['type'] : '';
    $title = isset($_POST['title']) ? $_POST['title'] : '';
    $content = isset($_POST['content']) ? $_POST['content'] : '';
    $targetUsers = isset($_POST['target_users']) ? explode(',', $_POST['target_users']) : [];
    
    // 过滤空值
    $targetUsers = array_filter($targetUsers, function($value) {
        return !empty(trim($value));
    });
    
    // 验证输入
    if (empty($type) || empty($title) || empty($content)) {
        $message = '<div class="alert alert-danger">请填写所有必填字段</div>';
    } else {
        // 创建通知
        $result = NotificationManager::createNotification($type, $title, $content, $targetUsers);
        
        if ($result) {
            // 使用会话存储消息，然后重定向
            $_SESSION['notification_message'] = '<div class="alert alert-success">通知发送成功</div>';
            header('Location: ' . $_SERVER['PHP_SELF']);
            exit;
        } else {
            $message = '<div class="alert alert-danger">通知发送失败</div>';
        }
    }
}

// 检查会话消息
if (isset($_SESSION['notification_message'])) {
    $message = $_SESSION['notification_message'];
    unset($_SESSION['notification_message']);
}

// 获取所有通知
$allNotifications = [];
if (file_exists(NOTIFICATION_FILE)) {
    $content = file_get_contents(NOTIFICATION_FILE);
    $allNotifications = json_decode($content, true) ?: [];
}

// 按时间倒序排序
usort($allNotifications, function($a, $b) {
    return strtotime($b['time']) - strtotime($a['time']);
});
?>

<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>通知管理后台</title>
    <link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.0.2/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1200px;
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
        .notification-form {
            margin-bottom: 30px;
        }
        .notification-list {
            margin-top: 30px;
        }
        .system-badge {
            background-color: #0d6efd;
        }
        .activity-badge {
            background-color: #198754;
        }
        .notification-item {
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
            position: relative;
        }
        .notification-time {
            color: #6c757d;
            font-size: 0.85rem;
        }
        .notification-title {
            font-weight: bold;
        }
        .notification-content {
            margin-top: 5px;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        .target-users {
            font-size: 0.85rem;
            color: #6c757d;
            margin-top: 5px;
        }
        .test-buttons {
            margin-bottom: 20px;
        }
        .delete-btn {
            position: absolute;
            right: 0;
            top: 0;
            color: #dc3545;
            cursor: pointer;
        }
        .delete-btn:hover {
            color: #bb2d3b;
        }
        .action-buttons {
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>通知管理后台</h1>
            <p class="text-muted">发送系统通知和待办通知</p>
        </div>
        
        <?php echo $message ?? ''; ?>
        
        <div class="test-buttons">
            <h3>快速测试</h3>
            <a href="?add_test=system" class="btn btn-primary me-2">添加系统测试通知</a>
            <a href="?add_test=activity" class="btn btn-success">添加待办测试通知</a>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="notification-form">
                    <h2>发送新通知</h2>
                    <form method="post" action="">
                        <div class="mb-3">
                            <label for="type" class="form-label">通知类型</label>
                            <select class="form-select" id="type" name="type" required>
                                <option value="">请选择类型</option>
                                <option value="system">系统通知</option>
                                <option value="activity">待办通知</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="title" class="form-label">通知标题</label>
                            <input type="text" class="form-control" id="title" name="title" required>
                        </div>
                        <div class="mb-3">
                            <label for="content" class="form-label">通知内容</label>
                            <textarea class="form-control" id="content" name="content" rows="4" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="target_users" class="form-label">目标用户 (可选，多个用户ID用逗号分隔，留空则发送给所有用户)</label>
                            <input type="text" class="form-control" id="target_users" name="target_users" placeholder="例如: oUMg25abcdef,oUMg25ghijkl">
                            <div class="form-text">留空则发送给所有用户</div>
                        </div>
                        <button type="submit" class="btn btn-primary">发送通知</button>
                    </form>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="notification-list">
                    <div class="action-buttons">
                    <h2>最近通知</h2>
                        <a href="?delete_all=confirm" class="btn btn-danger" onclick="return confirm('确定要删除所有通知吗？此操作不可恢复！');">
                            <i class="bi bi-trash"></i> 删除所有通知
                        </a>
                    </div>
                    <?php if (count($allNotifications) > 0): ?>
                        <?php foreach(array_slice($allNotifications, 0, 10) as $notification): ?>
                            <div class="notification-item">
                                <a href="?delete_id=<?php echo $notification['id']; ?>" class="delete-btn" onclick="return confirm('确定要删除这条通知吗？');">
                                    <i class="bi bi-trash"></i> 删除
                                </a>
                                <span class="badge <?php echo $notification['type'] === 'system' ? 'system-badge' : 'activity-badge'; ?>">
                                    <?php echo $notification['type'] === 'system' ? '系统' : '待办'; ?>
                                </span>
                                <span class="notification-time"><?php echo $notification['time']; ?></span>
                                <div class="notification-title"><?php echo htmlspecialchars($notification['title']); ?></div>
                                <div class="notification-content"><?php echo nl2br(htmlspecialchars($notification['content'])); ?></div>
                                <?php if (!empty($notification['target_users'])): ?>
                                    <div class="target-users">
                                        发送给: <?php echo implode(', ', $notification['target_users']); ?>
                                    </div>
                                <?php else: ?>
                                    <div class="target-users">发送给: 所有用户</div>
                                <?php endif; ?>
                            </div>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <p class="text-muted">暂无通知</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.0.2/js/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.5.0/font/bootstrap-icons.css">
</body>
</html> 