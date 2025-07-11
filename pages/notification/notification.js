// notification.js
const app = getApp()
const notificationService = require('../../utils/notification-service.js')

Page({
  data: {
    navBarHeight: 0, // 导航栏高度
    tabList: ['全部', '系统', '活动'], // 移除了多余的空格
    currentTab: 0,
    notificationList: [],
    filteredList: [],
    hasUnread: false // 是否有未读通知
  },

  onLoad: function (options) {
    // 获取导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navBarHeight = app.globalData.navBarHeight || 44;
    this.setData({
      navBarHeight: statusBarHeight + navBarHeight
    });
    
    // 加载通知数据
    this.loadNotifications();
  },
  
  onShow: function() {
    // 页面显示时刷新通知数据
    this.loadNotifications();
  },
  
  // 加载通知数据
  loadNotifications: function() {
    // 初始化通知服务
    notificationService.init();
    
    // 获取通知数据
    const notificationList = notificationService.getNotifications();
    
    // 检查是否有未读通知
    const hasUnread = notificationService.getUnreadCount() > 0;
    
    this.setData({
      notificationList: notificationList,
      hasUnread: hasUnread
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
    // 标记为已读
    this.markAsRead(e);
    // 跳转到详情页
    wx.navigateTo({
      url: `/pages/notification/detail?id=${id}`
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
    // 使用通知服务标记所有为已读
    const hasMarked = notificationService.markAllAsRead();
    
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