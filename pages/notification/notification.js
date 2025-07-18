// notification.js
const app = getApp()
const notificationService = require('../../utils/notification-service.js')
const loginManager = require('../../utils/login-manager').default

Page({
  data: {
    navBarHeight: 0, // 导航栏高度
    tabList: ['全部', '系统', '待办'], // 移除了多余的空格
    currentTab: 0,
    notificationList: [],
    filteredList: [],
    hasUnread: false, // 是否有未读通知
    isLoggedIn: false, // 是否已登录
    showDetailPopup: false, // 是否显示详情弹窗
    currentNotification: null // 当前查看的通知
  },

  onLoad: function (options) {
    // 获取导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navBarHeight = app.globalData.navBarHeight || 44;
    this.setData({
      navBarHeight: statusBarHeight + navBarHeight
    });
    
    // 检查登录状态
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn || false
    });
    
    // 加载通知数据
    this.loadNotifications();
    
    // 添加通知监听器
    notificationService.addListener(this.handleNotificationUpdate.bind(this));
    
    // 添加登录状态监听器
    loginManager.addStateChangeListener(this.handleLoginStateChange.bind(this));
  },
  
  onUnload: function() {
    // 移除通知监听器
    notificationService.removeListener(this.handleNotificationUpdate.bind(this));
    
    // 移除登录状态监听器
    loginManager.removeStateChangeListener(this.handleLoginStateChange);
  },
  
  onShow: function() {
    // 页面显示时刷新通知数据
    this.loadNotifications();
    
    // 立即获取最新通知
    notificationService.fetchNotifications();
  },
  
  // 处理登录状态变化
  handleLoginStateChange: function(state) {
    console.log('通知页面收到登录状态变化:', state);
    
    this.setData({
      isLoggedIn: state.isLoggedIn
    });
    
    // 重新加载通知数据
    this.loadNotifications();
    
    // 登录状态变化时，立即获取最新通知
    if (state.isLoggedIn) {
      notificationService.fetchNotifications();
    }
    
    // 如果登录状态发生变化，重新设置过滤列表
    this.setFilteredList();
  },
  
  // 处理通知更新
  handleNotificationUpdate: function(data) {
    console.log('收到通知更新', data);
    
    this.setData({
      notificationList: data.notifications,
      hasUnread: data.unreadCount > 0,
      isLoggedIn: data.isLoggedIn !== undefined ? data.isLoggedIn : this.data.isLoggedIn
    });
    
    this.setFilteredList();
    
    // 如果有未读通知，显示红点
    if (data.unreadCount > 0) {
      wx.showTabBarRedDot({
        index: 1 // 通知选项卡的索引
      });
    } else {
      wx.hideTabBarRedDot({
        index: 1
      });
    }
  },
  
  // 加载通知数据
  loadNotifications: function() {
    // 获取通知数据
    const notificationList = notificationService.getNotifications();
    
    // 检查是否有未读通知
    const hasUnread = notificationService.getUnreadCount() > 0;
    
    this.setData({
      notificationList: notificationList,
      hasUnread: hasUnread
    });
    
    this.setFilteredList();
    
    // 更新红点显示
    if (hasUnread) {
      wx.showTabBarRedDot({
        index: 1 // 通知选项卡的索引
      });
    } else {
      wx.hideTabBarRedDot({
        index: 1
      });
    }
  },
  
  // 切换标签
  switchTab: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentTab: index
    });
    this.setFilteredList();
  },
  
  // 根据当前标签筛选通知
  setFilteredList: function() {
    let filteredList = [];
    const {currentTab, notificationList, isLoggedIn} = this.data;
    
    // 确保notificationList是数组
    const safeList = Array.isArray(notificationList) ? notificationList : [];
    
    // 非登录用户只能看到系统通知
    let availableList = safeList;
    if (!isLoggedIn) {
      availableList = safeList.filter(item => item.type === 'system');
      
      // 非登录用户强制切换到系统通知标签
      if (currentTab === 2) { // 待办标签
        this.setData({
          currentTab: 1 // 切换到系统通知标签
        });
      }
    }
    
    switch(currentTab) {
      case 0: // 全部
        filteredList = availableList;
        break;
      case 1: // 系统
        filteredList = availableList.filter(item => item.type === 'system');
        break;
      case 2: // 待办/活动
        // 非登录用户不应该看到待办事项
        if (isLoggedIn) {
          filteredList = availableList.filter(item => item.type === 'activity');
        } else {
          filteredList = [];
        }
        break;
      default:
        filteredList = availableList;
    }
    
    // 检查筛选后的列表中是否有未读通知
    const hasUnreadInFiltered = filteredList.some(item => !item.isRead);
    
    this.setData({
      filteredList: filteredList,
      hasUnread: hasUnreadInFiltered
    });
  },
  
  // 查看通知详情
  viewDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    
    // 查找通知数据
    const notification = this.data.notificationList.find(item => item.id === id);
    
    if (notification) {
      // 标记为已读
      this.markAsRead({
        currentTarget: {
          dataset: { id: id }
        }
      });
      
      // 显示详情弹窗
      this.setData({
        currentNotification: notification,
        showDetailPopup: true
      });
    }
  },
  
  // 关闭详情弹窗
  closeDetailPopup: function() {
    this.setData({
      showDetailPopup: false
    });
  },
  
  // 标记为已读
  markAsRead: function(e) {
    const id = e.currentTarget.dataset.id;
    
    // 使用通知服务标记为已读
    notificationService.markAsRead(id);
    
    // 刷新数据
    this.loadNotifications();
  },
  
  // 标记所有通知为已读
  markAllAsRead: function() {
    // 根据当前标签决定是否按类型标记
    let type = null;
    if (this.data.currentTab === 1) {
      type = 'system';
    } else if (this.data.currentTab === 2) {
      type = 'activity';
    }
    
    // 使用通知服务标记为已读
    const hasMarked = notificationService.markAllAsRead(type);
    
    // 刷新数据
    this.loadNotifications();
    
    // 显示提示
    if (hasMarked) {
      wx.showToast({
        title: '已全部标为已读',
        icon: 'success',
        duration: 1500
      });
    } else {
      wx.showToast({
        title: '没有未读通知',
        icon: 'none',
        duration: 1500
      });
    }
  }
}) 