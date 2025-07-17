// app.js
// 引入通知服务
const notificationService = require('./utils/notification-service');
// 引入登录管理器
const loginManager = require('./utils/login-manager').default;

App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 初始化登录管理器
    loginManager.init();

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync()
    this.globalData.systemInfo = systemInfo
    
    // 获取胶囊按钮位置信息
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect()
    this.globalData.menuButtonInfo = menuButtonInfo
    
    // 计算导航栏高度
    this.globalData.navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height + systemInfo.statusBarHeight
    
    // 初始化应用列表数据
    this.globalData.appGridList = [
      { id: 1, name: 'AR校园', icon: '/images/3D.png', url: '/pages/apps/app1/app1', desc: 'AR技术体验校园环境' },
      { id: 2, name: 'XR体验', icon: '/images/XR.png', url: '/pages/apps/app2/app2', desc: '沉浸式XR技术体验' },
      { id: 3, name: '应用三', icon: '/images/app_default.png', url: '/pages/apps/app3/app3', desc: '应用三功能描述' },
      { id: 4, name: '应用四', icon: '/images/app_default.png', url: '/pages/apps/app4/app4', desc: '应用四功能描述' },
      { id: 5, name: '应用五', icon: '/images/app_default.png', url: '/pages/apps/app5/app5', desc: '应用五功能描述' },
      { id: 6, name: '应用六', icon: '/images/app_default.png', url: '/pages/apps/app6/app6', desc: '应用六功能描述' },
      { id: 7, name: '应用七', icon: '/images/app_default.png', url: '/pages/apps/app7/app7', desc: '应用七功能描述' },
      { id: 8, name: '应用八', icon: '/images/app_default.png', url: '/pages/apps/app8/app8', desc: '应用八功能描述' },
      { id: 9, name: '应用九', icon: '/images/app_default.png', url: '/pages/apps/app9/app9', desc: '应用九功能描述' },
      { id: 10, name: '应用十', icon: '/images/app_default.png', url: '/pages/apps/app10/app10', desc: '应用十功能描述' },
      { id: 11, name: '应用十一', icon: '/images/app_default.png', url: '/pages/apps/app11/app11', desc: '应用十一功能描述' },
      { id: 12, name: '应用十二', icon: '/images/app_default.png', url: '/pages/apps/app12/app12', desc: '应用十二功能描述' }
    ]
    
    // 初始化通知服务
    notificationService.init();
    
    // 监听通知更新，更新全局未读数
    notificationService.addListener(this.handleNotificationUpdate.bind(this));
    
    // 监听登录状态变化
    loginManager.addStateChangeListener(this.handleLoginStateChange.bind(this));
  },
  
  // 处理登录状态变化
  handleLoginStateChange(state) {
    console.log('App收到登录状态变化:', state);
    
    // 更新全局数据
    this.globalData.isLoggedIn = state.isLoggedIn;
    this.globalData.userInfo = state.userInfo;
    this.globalData.needPhoneBind = state.needPhoneBind;
  },
  
  // 处理通知更新
  handleNotificationUpdate(data) {
    this.globalData.unreadNotificationCount = data.unreadCount;
    
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
  
  // 执行登录
  doLogin() {
    return loginManager.doLogin();
  },
  
  globalData: {
    userInfo: null,
    systemInfo: null,
    menuButtonInfo: null,
    navBarHeight: 0,
    appGridList: [], // 应用列表数据
    unreadNotificationCount: 0, // 未读通知数量
    isLoggedIn: false, // 是否已登录
    needPhoneBind: false // 是否需要绑定手机号
  }
})