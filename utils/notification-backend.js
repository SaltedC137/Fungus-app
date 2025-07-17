// utils/notification-backend.js
/**
 * 通知后端服务
 * 与PHP后端通信获取通知数据
 */

// 通知类型
const NotificationType = {
  SYSTEM: 'system',
  ACTIVITY: 'activity'
};

// 基础URL - 使用完整URL，因为微信小程序不支持相对路径
const BASE_URL = 'http://117.72.10.68/php_backend/';

// 格式化通知内容，处理长文本
function formatNotificationContent(notification) {
  if (!notification || !notification.content) return notification;
  
  // 复制通知对象，避免修改原对象
  const formattedNotification = {...notification};
  
  // 处理长文本，每30个字符添加换行符
  // 这样可以避免文本溢出显示区域
  let content = formattedNotification.content;
  if (content.length > 30) {
    // 每30个字符添加一个换行符
    let formattedContent = '';
    for (let i = 0; i < content.length; i += 30) {
      formattedContent += content.substr(i, 30) + '\n';
    }
    formattedNotification.content = formattedContent.trim();
    
    // 保存原始内容，用于详情页显示
    formattedNotification.originalContent = content;
  }
  
  return formattedNotification;
}

// 格式化通知列表
function formatNotifications(notifications) {
  if (!Array.isArray(notifications)) return [];
  return notifications.map(formatNotificationContent);
}

/**
 * 获取通知列表
 * @returns {Promise} 通知列表Promise
 */
function fetchNotifications() {
  // 获取token
  const token = wx.getStorageSync('token') || '';
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + 'notification_api.php?action=get_notifications',
      method: 'GET',
      header: {
        'content-type': 'application/json',
        'token': token
      },
      success: (res) => {
        if (res.data && res.data.code === 0) {
          // 格式化通知内容，处理长文本
          const formattedNotifications = formatNotifications(res.data.data.notifications);
          resolve({
            notifications: formattedNotifications,
            unreadCount: res.data.data.unreadCount,
            isLoggedIn: res.data.data.isLoggedIn
          });
        } else {
          reject(new Error(res.data ? res.data.msg : '获取通知失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
}

/**
 * 标记通知为已读
 * @param {number} id 通知ID
 * @returns {Promise} 操作结果
 */
function markAsRead(id) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || '';
    if (!token) {
      reject('用户未登录');
      return;
    }

    wx.request({
      url: `${BASE_URL}notification_api.php?action=mark_read`,
      method: 'POST',
      data: { id },
      header: {
        'token': token
      },
      success: (res) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else {
          reject(res.data.msg || '标记通知已读失败');
        }
      },
      fail: (err) => {
        console.error('标记通知已读请求失败:', err);
        reject(err || '网络请求失败');
      }
    });
  });
}

/**
 * 标记所有通知为已读
 * @param {string} [type] 可选，指定类型的通知
 * @returns {Promise} 操作结果
 */
function markAllAsRead(type = null) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || '';
    if (!token) {
      reject('用户未登录');
      return;
    }

    wx.request({
      url: `${BASE_URL}notification_api.php?action=mark_all_read`,
      method: 'POST',
      data: type ? { type } : {},
      header: {
        'token': token
      },
      success: (res) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else {
          reject(res.data.msg || '标记所有通知已读失败');
        }
      },
      fail: (err) => {
        console.error('标记所有通知已读请求失败:', err);
        reject(err || '网络请求失败');
      }
    });
  });
}

/**
 * 添加测试通知到服务器
 * @param {string} type 通知类型
 * @returns {Promise} Promise对象
 */
function addTestNotification(type) {
  return new Promise((resolve, reject) => {
    try {
      wx.request({
        url: BASE_URL + 'notification_admin.php?add_test=' + type,
        method: 'GET',
        success: (res) => {
          if (res.data && res.data.success) {
            resolve(res.data);
          } else {
            console.warn('添加测试通知返回异常:', res.data);
            // 即使服务器返回错误，我们也不阻止本地通知的添加
            resolve({ success: false, message: '服务器返回错误，但本地通知已添加' });
          }
        },
        fail: (err) => {
          console.error('添加测试通知请求失败:', err);
          // 即使网络请求失败，我们也不阻止本地通知的添加
          resolve({ success: false, message: '网络请求失败，但本地通知已添加' });
        }
      });
    } catch (err) {
      console.error('添加测试通知出现异常:', err);
      // 捕获可能的异常，但不阻止本地通知的添加
      resolve({ success: false, message: '请求异常，但本地通知已添加' });
    }
  });
}

module.exports = {
  NotificationType,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  addTestNotification
}; 