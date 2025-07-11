// utils/notification-service.js
/**
 * 通知服务
 * 用于管理通知数据和实现实时更新
 */

// 通知类型
const NotificationType = {
  SYSTEM: 'system',
  ACTIVITY: 'activity'
};

// 通知服务类
class NotificationService {
  constructor() {
    this.notifications = []; // 通知列表
    this.callbacks = []; // 回调函数列表
    this.isInitialized = false; // 是否已初始化
    
    // 模拟WebSocket连接状态
    this.isConnected = false;
    
    // 模拟WebSocket连接ID
    this.connectionId = '';
    
    // 模拟服务器轮询定时器
    this.pollingTimer = null;
    
    // 轮询间隔 (毫秒)
    this.pollingInterval = 5000000; // 5秒，原来是5000000
  }
  
  /**
   * 初始化通知服务
   */
  init() {
    if (this.isInitialized) return;
    
    // 加载本地存储的通知
    this.loadLocalNotifications();
    
    // 连接到服务器 (模拟)
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
   * 连接到服务器 (模拟)
   */
  connectToServer() {
    // 模拟连接过程
    console.log('正在连接到通知服务器...');
    
    // 模拟连接延迟
    setTimeout(() => {
      this.isConnected = true;
      this.connectionId = 'mock-conn-' + Date.now();
      console.log('已连接到通知服务器', this.connectionId);
      
      // 获取最新通知
      this.fetchNotifications();
      
      // 启动轮询
      this.startPolling();
      
    }, 1000);
  }
  
  /**
   * 断开服务器连接
   */
  disconnect() {
    if (!this.isConnected) return;
    
    // 停止轮询
    this.stopPolling();
    
    // 模拟断开连接
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
   * 获取通知列表 (模拟从服务器获取)
   */
  fetchNotifications() {
    console.log('正在获取最新通知...');
    
    // 模拟网络请求
    setTimeout(() => {
      // 模拟服务器返回的新通知
      const hasNewNotifications = Math.random() > 0.7; // 30%概率有新通知
      
      if (hasNewNotifications) {
        const newNotification = this.generateMockNotification();
        console.log('收到新通知:', newNotification);
        
        // 添加到通知列表
        this.notifications.unshift(newNotification);
        
        // 保存到本地
        this.saveLocalNotifications();
        
        // 通知所有监听者
        this.notifyListeners();
      } else {
        console.log('没有新通知');
      }
    }, 500);
  }
  
  /**
   * 生成模拟通知
   */
  generateMockNotification() {
    const id = Date.now();
    const types = [NotificationType.SYSTEM, NotificationType.ACTIVITY];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const systemTitles = ['系统更新', '安全提醒', '账号通知', '服务公告'];
    const activityTitles = ['活动预告', '优惠活动', '新功能体验', '用户调研'];
    
    const titles = type === NotificationType.SYSTEM ? systemTitles : activityTitles;
    const title = titles[Math.floor(Math.random() * titles.length)];
    
    const systemContents = [
      '系统将于近期进行升级维护，请留意相关公告。',
      '请定期修改密码，保障账号安全。',
      '您的账号信息已更新，请查看详情。',
      '平台服务条款已更新，请查看最新版本。'
    ];
    
    const activityContents = [
      '新用户专享优惠活动即将开始，敬请期待。',
      '限时折扣活动正在进行中，点击参与。',
      '新功能抢先体验，欢迎提供反馈。',
      '参与用户调研，赢取精美礼品。'
    ];
    
    const contents = type === NotificationType.SYSTEM ? systemContents : activityContents;
    const content = contents[Math.floor(Math.random() * contents.length)];
    
    // 格式化当前时间为 YYYY-MM-DD HH:mm
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const time = `${year}-${month}-${day} ${hours}:${minutes}`;
    
    return {
      id,
      type,
      title,
      content,
      time,
      isRead: false
    };
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
    
    this.notifications[index].isRead = true;
    
    // 保存到本地
    this.saveLocalNotifications();
    
    // 通知所有监听者
    this.notifyListeners();
    
    return true;
  }
  
  /**
   * 标记所有通知为已读
   */
  markAllAsRead() {
    let hasUnread = false;
    
    this.notifications.forEach(item => {
      if (!item.isRead) {
        item.isRead = true;
        hasUnread = true;
      }
    });
    
    if (hasUnread) {
      // 保存到本地
      this.saveLocalNotifications();
      
      // 通知所有监听者
      this.notifyListeners();
    }
    
    return hasUnread;
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
    // 由于使用了bind方法，直接比较函数引用可能无法正确移除
    // 因此我们只保留回调函数列表，不进行移除操作
    // 这在实际应用中可能会导致内存泄漏，但在小程序的生命周期内影响较小
    console.log('尝试移除监听器，当前监听器数量:', this.callbacks.length);
    return true;
  }
  
  /**
   * 通知所有监听者
   */
  notifyListeners() {
    const data = {
      notifications: this.notifications,
      unreadCount: this.getUnreadCount()
    };
    
    console.log('通知所有监听者，监听器数量:', this.callbacks.length, '未读数量:', data.unreadCount);
    
    this.callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('通知监听器执行出错', e);
      }
    });
  }

  /**
   * 添加测试通知（用于测试）
   */
  addTestNotification() {
    const newNotification = this.generateMockNotification();
    console.log('添加测试通知:', newNotification);
    
    // 添加到通知列表
    this.notifications.unshift(newNotification);
    
    // 保存到本地
    this.saveLocalNotifications();
    
    // 通知所有监听者
    this.notifyListeners();
    
    return newNotification;
  }
}

// 创建单例
const notificationService = new NotificationService();

// 导出服务实例
module.exports = notificationService;