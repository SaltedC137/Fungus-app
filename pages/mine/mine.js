// mine.js
const app = getApp()

Page({
  data: {
    navBarHeight: 0, // 导航栏高度
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    menuList: [
      { text: '我的设置', icon: 'icon-settings' },
      { text: '消息通知', icon: 'icon-notification' },
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
  }
}) 