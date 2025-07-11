// mine.js
const app = getApp()
// 引入通知服务
const notificationService = require('../../utils/notification-service');

Page({
  data: {
    navBarHeight: 0, // 导航栏高度
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    // 用户扩展信息
    userExtInfo: {
      department: '信息科学与工程学院', // 院系信息
      role: '学生',  // 角色：学生/教师
      group: '软件工程2班'  // 组别
    },
    // 用户统计数据
    userStats: {
      todoCount: 0,     // 待办事项数量
      isVerified: false, // 是否已认证
    },
    // 欢迎语
    welcomeMessage: '欢迎回来！',
    menuList: [
      { text: '个人资料', icon: 'icon-profile' },
      { text: '我的课程', icon: 'icon-course' },
      { text: '我的成绩', icon: 'icon-score' },
      { text: '我的设置', icon: 'icon-settings' },
      { text: '帮助中心', icon: 'icon-help' },
      { text: '关于我们', icon: 'icon-about' }
    ]
  },
  
  onLoad() {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    }
    
    // 获取导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navBarHeight = app.globalData.navBarHeight || 44;
    this.setData({
      navBarHeight: statusBarHeight + navBarHeight
    });

    // 初始化通知服务
    notificationService.init();
    
    // 更新待办事项数量
    this.updateTodoCount();
    
    // 添加通知监听器
    notificationService.addListener(this.handleNotificationUpdate.bind(this));
  },
  
  onShow() {
    // 每次显示页面时更新待办事项数量
    this.updateTodoCount();
  },
  
  onUnload() {
    // 移除通知监听器
    notificationService.removeListener(this.handleNotificationUpdate.bind(this));
  },
  
  // 处理通知更新
  handleNotificationUpdate(data) {
    console.log('mine页面收到通知更新:', data);
    if (data && typeof data.unreadCount !== 'undefined') {
      this.setData({
        'userStats.todoCount': data.unreadCount
      });
      console.log('更新待办数量为:', data.unreadCount);
    }
  },
  
  // 更新待办事项数量
  updateTodoCount() {
    const unreadCount = notificationService.getUnreadCount();
    console.log('手动更新待办数量:', unreadCount);
    this.setData({
      'userStats.todoCount': unreadCount
    });
  },
  
  getUserProfile(e) {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        app.globalData.userInfo = res.userInfo
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  
  navigateToPage(e) {
    const index = e.currentTarget.dataset.index
    const url = this.data.menuList[index].url
    if (url) {
      wx.navigateTo({
        url: url
      })
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  },

  // 跳转到通知页面
  goToNotifications() {
    wx.switchTab({
      url: '/pages/notification/notification'
    })
  },

  // 添加测试通知（用于测试）
  addTestNotification() {
    const newNotification = notificationService.addTestNotification();
    wx.showToast({
      title: '已添加测试通知',
      icon: 'success'
    });
  }
}) 