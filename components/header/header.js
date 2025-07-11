// components/header/header.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 欢迎文本
    welcomeText: {
      type: String,
      value: '菌材通，欢迎您！'
    },
    // 是否显示返回按钮
    showBack: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 系统信息
    statusBarHeight: 0,
    navBarHeight: 0
  },

  /**
   * 组件的生命周期
   */
  lifetimes: {
    attached() {
      const app = getApp();
      // 获取系统状态栏信息
      const systemInfo = wx.getSystemInfoSync();
      this.setData({
        statusBarHeight: systemInfo.statusBarHeight,
        navBarHeight: app.globalData.navBarHeight || 44
      });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 返回上一页
    navigateBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack({
          delta: 1
        });
      } else {
        // 如果没有上一页，则跳转到首页
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    }
  }
}) 