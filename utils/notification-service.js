// utils/notification-service.js
/**
 * 通知服务
 * 用于管理通知数据和实现实时更新
 */

// 引入通知后端服务
const notificationBackend = require('./notification-backend');

// 通知类型
const NotificationType = notificationBackend.NotificationType;

// 通知服务类
class NotificationService {
  constructor() {
    this.notifications = []; // 通知列表
    this.callbacks = []; // 回调函数列表
    this.isInitialized = false; // 是否已初始化
    
    // WebSocket连接状态
    this.isConnected = false;
    
    // WebSocket连接ID
    this.connectionId = '';
    
    // 服务器轮询定时器
    this.pollingTimer = null;
    
    // 轮询间隔 (毫秒)
    this.pollingInterval = 30000; // 30秒
  }
  
  /**
   * 初始化通知服务
   */
  init() {
    if (this.isInitialized) return;
    
    // 加载本地存储的通知
    this.loadLocalNotifications();
    
    // 连接到服务器
    this.connectToServer();
    
    this.isInitialized = true;
    
    console.log('通知服务已初始化');
  }
  
  /**
   * 加载本地存储的通知
   */
  loadLocalNotifications() {
    try {
      const localNotifications = wx.getStorageSync('notifications') || [];
      this.notifications = localNotifications;
      console.log('已加载本地通知数据', this.notifications.length);
    } catch (e) {
      console.error('加载本地通知数据失败', e);
      this.notifications = [];
    }
  }
  
  /**
   * 保存通知到本地存储
   */
  saveLocalNotifications() {
    try {
      wx.setStorageSync('notifications', this.notifications);
    } catch (e) {
      console.error('保存通知数据失败', e);
    }
  }
  
  /**
   * 连接到服务器
   */
  connectToServer() {
    // 检查是否已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      console.log('用户未登录，暂不连接通知服务器');
      return;
    }
    
    // 如果已经连接，不需要重复连接
    if (this.isConnected) {
      console.log('通知服务已连接，无需重复连接');
      return true;
    }
    
    console.log('正在连接到通知服务器...');
    
    // 先设置连接状态，避免重复连接
    this.isConnected = true;
    this.connectionId = 'conn-' + Date.now();
    
    // 获取最新通知
    this.fetchNotifications()
      .then(() => {
        console.log('成功获取通知数据');
      })
      .catch(err => {
        console.error('获取通知失败，但仍继续连接:', err);
      });
    
    // 启动轮询
    this.startPolling();
    
    console.log('已连接到通知服务器', this.connectionId);
    return true;
  }
  
  /**
   * 断开服务器连接
   */
  disconnect() {
    if (!this.isConnected) return;
    
    // 停止轮询
    this.stopPolling();
    
    this.isConnected = false;
    this.connectionId = '';
    console.log('已断开与通知服务器的连接');
  }
  
  /**
   * 开始轮询
   */
  startPolling() {
    if (this.pollingTimer) return;
    
    this.pollingTimer = setInterval(() => {
      if (this.isConnected) {
        this.fetchNotifications();
      }
    }, this.pollingInterval);
    
    console.log('已启动通知轮询，间隔:', this.pollingInterval, 'ms');
  }
  
  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
      console.log('已停止通知轮询');
    }
  }
  
  /**
   * 获取通知列表 (从服务器获取)
   */
  fetchNotifications() {
    console.log('正在获取最新通知...');
    
    // 从后端获取通知
    return notificationBackend.fetchNotifications()
      .then(data => {
        if (data && data.notifications) {
          console.log('收到通知数据:', data.notifications.length);
          
          // 更新通知列表
          this.notifications = data.notifications;
          
          // 保存到本地
          this.saveLocalNotifications();
          
          // 通知所有监听者，传递登录状态
          this.notifyListeners(data.isLoggedIn);
          
          return {
            notifications: this.notifications,
            unreadCount: this.getUnreadCount(),
            isLoggedIn: data.isLoggedIn
          };
        } else {
          console.warn('收到的通知数据格式不正确:', data);
          return {
            notifications: this.notifications,
            unreadCount: this.getUnreadCount(),
            isLoggedIn: false
          };
        }
      })
      .catch(err => {
        console.error('获取通知失败:', err);
        
        // 如果是网络错误，不要重复尝试连接，避免过多错误日志
        if (err && err.errno === 600009) {
          // 网络错误，暂停轮询一段时间
          this.pausePollingTemporarily();
        }
        
        // 返回当前缓存的通知数据
        return Promise.reject({
          error: err,
          notifications: this.notifications,
          unreadCount: this.getUnreadCount(),
          isLoggedIn: false
        });
      });
  }
  
  /**
   * 暂时暂停轮询，避免频繁错误
   */
  pausePollingTemporarily() {
    // 先停止当前轮询
    this.stopPolling();
    
    console.log('由于网络错误，暂停轮询5分钟');
    
    // 5分钟后重新开始轮询
    setTimeout(() => {
      if (this.isConnected) {
        this.startPolling();
        console.log('恢复通知轮询');
      }
    }, 5 * 60 * 1000); // 5分钟
  }
  
  /**
   * 获取所有通知
   */
  getNotifications() {
    return this.notifications;
  }
  
  /**
   * 获取未读通知数量
   */
  getUnreadCount() {
    return this.notifications.filter(item => !item.isRead).length;
  }
  
  /**
   * 获取指定类型的通知
   * @param {string} type 通知类型
   */
  getNotificationsByType(type) {
    if (!type) return this.notifications;
    return this.notifications.filter(item => item.type === type);
  }
  
  /**
   * 标记通知为已读
   * @param {number} id 通知ID
   */
  markAsRead(id) {
    const index = this.notifications.findIndex(item => item.id === id);
    if (index === -1) return false;
    
    // 先在本地标记为已读
    this.notifications[index].isRead = true;
    
    // 保存到本地
    this.saveLocalNotifications();
    
    // 获取当前登录状态
    const isLoggedIn = !!wx.getStorageSync('token');
    
    // 通知所有监听者
    this.notifyListeners(isLoggedIn);
    
    // 向后端发送标记请求
    notificationBackend.markAsRead(id)
      .then(() => {
        console.log('通知已标记为已读:', id);
      })
      .catch(err => {
        console.error('标记通知已读失败:', err);
        // 如果失败，恢复未读状态
        this.notifications[index].isRead = false;
        this.saveLocalNotifications();
        this.notifyListeners(isLoggedIn);
      });
    
    return true;
  }
  
  /**
   * 标记所有通知为已读
   * @param {string} type 可选，指定类型的通知
   * @returns {boolean} 是否有未读通知被标记
   */
  markAllAsRead(type = null) {
    if (!Array.isArray(this.notifications) || this.notifications.length === 0) {
      console.log('没有通知可标记为已读');
      return false;
    }
    
    let hasUnread = false;
    
    // 标记所有或指定类型的未读通知
    this.notifications.forEach(item => {
      if (!item.isRead && (type === null || item.type === type)) {
        item.isRead = true;
        hasUnread = true;
      }
    });
    
    if (hasUnread) {
      // 保存到本地
      this.saveLocalNotifications();
      
      // 获取当前登录状态
      const isLoggedIn = !!wx.getStorageSync('token');
      
      // 通知所有监听者
      this.notifyListeners(isLoggedIn);
      
      // 向后端发送标记所有已读请求
      notificationBackend.markAllAsRead()
        .then(() => {
          console.log('所有通知已标记为已读');
        })
        .catch(err => {
          console.error('标记所有通知已读失败:', err);
          // 错误处理 - 可以选择是否回滚本地状态
        });
    } else {
      console.log('没有未读通知需要标记');
    }
    
    return hasUnread;
  }
  
  /**
   * 添加测试通知（仅用于开发测试）
   * @param {string} type 可选，通知类型，默认为system
   */
  addTestNotification(type = 'system') {
    // 构造测试通知
    const testNotification = {
      id: Date.now().toString(),
      type: type,
      title: type === 'system' ? '系统测试通知' : '待办测试通知',
      content: type === 'system' ? 
        '这是一条测试系统通知，用于测试通知功能是否正常工作。' : 
        '这是一条测试待办通知，用于测试待办功能是否正常工作。',
      time: new Date().toISOString().replace('T', ' ').substring(0, 19),
      isRead: false
    };
    
    // 添加到通知列表
    this.notifications.unshift(testNotification);
    
    // 保存到本地
    this.saveLocalNotifications();
    
    // 通知所有监听者
    this.notifyListeners();
    
    // 尝试从服务器获取最新通知，确保本地和服务器同步
    // 但不要在失败时影响用户体验
    this.fetchNotifications()
      .then(() => {
        console.log('已同步服务器通知数据');
      })
      .catch(err => {
        // 只记录错误，不影响用户体验
        console.error('同步服务器通知数据失败，但本地通知已添加:', err);
      });
    
    // 同时向后端发送添加测试通知请求
    // 但不要在失败时影响用户体验
    notificationBackend.addTestNotification(type)
      .then((result) => {
        if (result.success === false) {
          console.warn('向服务器添加测试通知部分失败:', result.message);
        } else {
          console.log('已向服务器添加测试通知');
        }
        
        // 无论成功与否，都不再重新获取通知列表
        // 因为我们已经在本地添加了通知，避免重复获取
      })
      .catch(err => {
        console.error('向服务器添加测试通知失败，但本地通知已添加:', err);
      });
    
    console.log('已添加测试通知:', testNotification);
    return testNotification;
  }
  
  /**
   * 添加监听器
   * @param {Function} callback 回调函数
   */
  addListener(callback) {
    if (typeof callback === 'function' && !this.callbacks.includes(callback)) {
      this.callbacks.push(callback);
      return true;
    }
    return false;
  }
  
  /**
   * 移除监听器
   * @param {Function} callback 回调函数
   */
  removeListener(callback) {
    // 使用函数字符串比较来移除监听器
    const callbackStr = callback.toString();
    const initialLength = this.callbacks.length;
    
    this.callbacks = this.callbacks.filter(cb => {
      return cb.toString() !== callbackStr;
    });
    
    console.log('移除监听器，之前数量:', initialLength, '现在数量:', this.callbacks.length);
    return initialLength !== this.callbacks.length;
  }
  
  /**
   * 通知所有监听者
   * @param {boolean} isLoggedIn 用户是否已登录
   */
  notifyListeners(isLoggedIn) {
    const data = {
      notifications: this.notifications,
      unreadCount: this.getUnreadCount(),
      isLoggedIn: isLoggedIn !== undefined ? isLoggedIn : !!wx.getStorageSync('token')
    };
    
    console.log('通知所有监听者，监听器数量:', this.callbacks.length, '未读数量:', data.unreadCount, '登录状态:', data.isLoggedIn);
    
    this.callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('通知监听器执行出错', e);
      }
    });
  }
}

// 创建单例
const notificationService = new NotificationService();

// 导出服务实例
module.exports = notificationService;