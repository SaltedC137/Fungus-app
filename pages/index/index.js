// index.js
const app = getApp()

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    navBarHeight: 0, // 导航栏高度
    

    // 通知信息条数据
    notificationList: [
      { id: 1, content: '重要通知：系统将于本周六进行维护升级，请提前做好准备', link: '/pages/notification/detail?id=1' },
      { id: 2, content: '新功能上线：全新界面设计，操作更简单', link: '/pages/notification/detail?id=2' },
      { id: 3, content: '安全提醒：请定期修改您的账户密码，保障账户安全', link: '/pages/notification/detail?id=3' }
    ],
    
    // 通知滚动时长 (秒)
    notificationDuration: 10,
    
    // 应用程序网格数据 (4x3=12个应用)
    appGridList: [],
    
    // 内容列表数据
    contentList: [
      { 
        id: 1, 
        title: '内容标题1', 
        desc: '内容描述信息，这里是一段比较长的文字描述...',
        imageUrl: '/images/content_default.png',
        date: '2023-07-10'
      },
      { 
        id: 2, 
        title: '内容标题2', 
        desc: '内容描述信息，这里是一段比较长的文字描述...',
        imageUrl: '/images/content_default.png',
        date: '2023-07-09'
      },
      { 
        id: 3, 
        title: '内容标题3', 
        desc: '内容描述信息，这里是一段比较长的文字描述...',
        imageUrl: '/images/content_default.png',
        date: '2023-07-08'
      }
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
    
    // 确保通知数据正确加载
    console.log('通知数据:', this.data.notificationList)
    
    // 如果通知列表为空，重新设置一些默认数据
    if (!this.data.notificationList || this.data.notificationList.length === 0) {
      this.setData({
        notificationList: [
          { id: 1, content: '重要通知：系统将于本周六进行维护升级，请提前做好准备', link: '/pages/notification/detail?id=1' },
          { id: 2, content: '新功能上线：全新界面设计，操作更简单', link: '/pages/notification/detail?id=2' },
          { id: 3, content: '安全提醒：请定期修改您的账户密码，保障账户安全', link: '/pages/notification/detail?id=3' }
        ]
      })
      console.log('重新设置通知数据')
    }
    
    // 从全局数据获取应用列表
    if (app.globalData.appGridList && app.globalData.appGridList.length > 0) {
      this.setData({
        appGridList: app.globalData.appGridList
      })
    }
    
    // 计算通知滚动时长
    this.calculateNotificationDuration();
  },
  
  // 计算通知滚动时长
  calculateNotificationDuration() {
    let totalLength = 0;
    // 计算所有通知文本的总长度
    this.data.notificationList.forEach(item => {
      totalLength += item.content.length;
    });
    
    // 根据文本长度调整动画时长，最短10秒，最长30秒
    const duration = Math.max(10, Math.min(30, totalLength * 0.5));
    
    this.setData({
      notificationDuration: duration
    });
  },
  
  // 搜索点击
  onSearchTap() {
    wx.navigateTo({
      url: '/pages/search/search?source=index'
    })
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
  
  // 通知点击
  onNotificationTap(e) {
    const id = e.currentTarget.dataset.id
    const notification = this.data.notificationList.find(item => item.id === id)
    if (notification && notification.link) {
      wx.navigateTo({
        url: notification.link
      })
    }
  },
  
  // 跳转到通知页面
  goToNotifications() {
    wx.switchTab({
      url: '/pages/notification/notification'
    })
  },
  
  // 应用点击
  onAppTap(e) {
    const id = e.currentTarget.dataset.id
    const app = this.data.appGridList.find(item => item.id === id)
    if (app && app.url) {
      wx.navigateTo({
        url: app.url
      })
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  },
  
  // 内容项点击
  onContentTap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/content-detail/content-detail?id=${id}`
    })
  },
  
  // 查看更多内容
  viewMoreContent() {
    wx.navigateTo({
      url: '/pages/content-list/content-list'
    })
  }
})
