// notification/detail.js
const app = getApp();
const notificationService = require('../../utils/notification-service');

Page({
  data: {
    navBarHeight: 0,
    notification: null,
    loading: true,
    error: false,
    errorMsg: '通知不存在或已被删除'
  },

  onLoad: function (options) {
    // 获取导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navBarHeight = app.globalData.navBarHeight || 44;
    this.setData({
      navBarHeight: statusBarHeight + navBarHeight
    });
    
    // 获取通知ID
    const id = options.id;
    if (!id) {
      this.setData({
        loading: false,
        error: true,
        errorMsg: '缺少通知ID参数'
      });
      return;
    }
    
    // 获取通知详情
    this.loadNotificationDetail(id);
  },
  
  // 加载通知详情
  loadNotificationDetail: function(id) {
    try {
      // 获取所有通知
      const notifications = notificationService.getNotifications();
      
      if (!Array.isArray(notifications)) {
        this.setData({
          loading: false,
          error: true,
          errorMsg: '获取通知列表失败'
        });
        return;
      }
      
      // 查找指定ID的通知
      const notification = notifications.find(item => item.id == id);
      
      if (notification) {
        // 如果有原始内容，使用原始内容
        if (notification.originalContent) {
          notification.content = notification.originalContent;
        }
        
        this.setData({
          notification: notification,
          loading: false
        });
        
        // 确保通知已标记为已读
        if (!notification.isRead) {
          notificationService.markAsRead(id);
        }
      } else {
        this.setData({
          loading: false,
          error: true,
          errorMsg: '找不到指定ID的通知'
        });
      }
    } catch (err) {
      console.error('加载通知详情失败:', err);
      this.setData({
        loading: false,
        error: true,
        errorMsg: '加载通知详情失败: ' + (err.message || err)
      });
    }
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  }
}) 