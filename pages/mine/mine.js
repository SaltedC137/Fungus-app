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
      isVerified: true, // 是否已认证
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
    ],
    phoneNumber: '', // 用户手机号
    avatarUrl: '', // 用户头像URL
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

    // 检查登录状态
    this.checkLoginStatus();
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
  
  // 检查登录状态
  checkLoginStatus() {
    // 获取本地存储的登录态
    const token = wx.getStorageSync('token');
    if (token) {
      // 有token，检查是否有效
      this.checkSessionAndUserInfo();
    }
  },

  // 检查会话和用户信息
  checkSessionAndUserInfo() {
    wx.checkSession({
      success: () => {
        // session_key 未过期，并且在本生命周期一直有效
        // 获取本地存储的用户信息
        const storedUserInfo = wx.getStorageSync('userInfo');
        const storedPhoneNumber = wx.getStorageSync('phoneNumber');
        const storedAvatarUrl = wx.getStorageSync('avatarUrl');
        
        if (storedUserInfo) {
          this.setData({
            userInfo: storedUserInfo,
            hasUserInfo: true,
            phoneNumber: storedPhoneNumber || '',
            avatarUrl: storedAvatarUrl || storedUserInfo.avatarUrl || ''
          });
          app.globalData.userInfo = storedUserInfo;
        }
      },
      fail: () => {
        // session_key 已经失效，需要重新登录
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('phoneNumber');
        wx.removeStorageSync('avatarUrl');
        this.setData({
          hasUserInfo: false,
          userInfo: {},
          phoneNumber: '',
          avatarUrl: ''
        });
      }
    });
  },
  
  // 获取用户信息并登录
  getUserProfile(e) {
    // 显示加载中
    wx.showLoading({
      title: '登录中...',
    });

    // 先调用wx.login获取code
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          // 获取用户信息
          wx.getUserProfile({
            desc: '用于完善会员资料',
            success: (profileRes) => {
              // 将用户信息保存到本地
              this.setData({
                userInfo: profileRes.userInfo,
                hasUserInfo: true,
                avatarUrl: profileRes.userInfo.avatarUrl
              });
              app.globalData.userInfo = profileRes.userInfo;
              wx.setStorageSync('userInfo', profileRes.userInfo);
              wx.setStorageSync('avatarUrl', profileRes.userInfo.avatarUrl);
              
              // 调用后端登录接口，发送code和用户信息
              this.loginToServer(loginRes.code, profileRes.userInfo);
            },
            fail: (err) => {
              console.error('获取用户信息失败', err);
              wx.hideLoading();
              wx.showToast({
                title: '获取用户信息失败',
                icon: 'none'
              });
            }
          });
        } else {
          console.error('登录失败', loginRes);
          wx.hideLoading();
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('wx.login调用失败', err);
        wx.hideLoading();
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },
  
  // 获取用户头像
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl,
    });
    wx.setStorageSync('avatarUrl', avatarUrl);
    
    // 如果已经有用户信息，更新头像
    if (this.data.hasUserInfo) {
      let userInfo = this.data.userInfo;
      userInfo.avatarUrl = avatarUrl;
      this.setData({
        userInfo: userInfo
      });
      wx.setStorageSync('userInfo', userInfo);
    }
  },
  
  // 获取手机号
  getPhoneNumber(e) {
    if (e.detail.errMsg === "getPhoneNumber:ok") {
      // 请注意：实际应用中需要将code发送到后端解密获取手机号
      const code = e.detail.code;
      console.log('获取到手机号code:', code);
      
      // 这里模拟一个手机号（实际应该由服务器返回解密后的手机号）
      // 注意：真实场景下应该将code发送到服务器解密
      const mockPhoneNumber = "135****8888";
      
      this.setData({
        phoneNumber: mockPhoneNumber
      });
      wx.setStorageSync('phoneNumber', mockPhoneNumber);
      
      wx.showToast({
        title: '手机号获取成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '获取手机号失败',
        icon: 'none'
      });
    }
  },

  loginToServer(code, userInfo) {
    // 这里应该替换为您自己的后端API地址
    wx.request({
      url: 'https://117.72.10.68/',
      method: 'POST',
      data: {
        code: code,
        userInfo: userInfo
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.token) {
          // 保存登录凭证
          wx.setStorageSync('token', res.data.token);
          // 如果后端返回了额外的用户信息，可以更新
          if (res.data.userExtInfo) {
            this.setData({
              userExtInfo: res.data.userExtInfo,
              'userStats.isVerified': res.data.userExtInfo.isVerified || false
            });
          }
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: '登录失败: ' + (res.data.message || '未知错误'),
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('登录请求失败', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
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