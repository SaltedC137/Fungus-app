// notification.js
const app = getApp();
// 引入通知服务
const notificationService = require('../../utils/notification-service');

Page({
  data: {
    navBarHeight: 0, // 导航栏高度
    tabList: ['全部', '系统', '待办'],
    currentTab: 0,
    notificationList: [],
    filteredList: [],
    unreadCount: 0 // 未读通知数量
  },

  onLoad: function (options) {
    // 获取导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navBarHeight = app.globalData.navBarHeight || 44;
    this.setData({
      navBarHeight: statusBarHeight + navBarHeight
    });
    
    // 初始化通知服务
    notificationService.init();
    
    // 加载通知数据
    this.loadNotifications();
    
    // 添加通知监听器
    notificationService.addListener(this.handleNotificationUpdate.bind(this));
  },
  
  onUnload: function() {
    // 移除通知监听器
    notificationService.removeListener(this.handleNotificationUpdate.bind(this));
  },
  
  onShow: function() {
    // 每次显示页面时刷新通知数据
    this.loadNotifications();
  },
  
  // 处理通知更新
  handleNotificationUpdate: function(data) {
    console.log('收到通知更新', data);
    
    this.setData({
      notificationList: data.notifications,
      unreadCount: data.unreadCount
    });
    
    // 更新过滤后的列表
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
    // 从通知服务获取数据
    const notifications = notificationService.getNotifications();
    const unreadCount = notificationService.getUnreadCount();
    
    this.setData({
      notificationList: notifications,
      unreadCount: unreadCount
    });
    
    this.setFilteredList();
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
    const {currentTab, notificationList} = this.data;
    
    switch(currentTab) {
      case 0: // 全部
        filteredList = notificationList;
        break;
      case 1: // 系统
        filteredList = notificationList.filter(item => item.type === 'system');
        break;
      case 2: // 活动
        filteredList = notificationList.filter(item => item.type === 'activity');
        break;
      default:
        filteredList = notificationList;
    }
    
    this.setData({
      filteredList: filteredList
    });
  },
  
  // 处理通知点击事件
  onNotificationTap: function(e) {
    const id = e.detail.id;
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/notification/detail?id=${id}`
    });
  },
  
  // 处理通知已读事件
  onNotificationRead: function(e) {
    const id = e.detail.id;
    // 调用通知服务标记为已读
    notificationService.markAsRead(id);
  },
  
  // 标记所有通知为已读
  markAllAsRead: function() {
    // 调用通知服务标记所有为已读
    const result = notificationService.markAllAsRead();
    if (result) {
      wx.showToast({
        title: '已全部标为已读',
        icon: 'success'
      });
    }
  }
})