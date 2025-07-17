// mine.js
const app = getApp()
const notificationService = require('../../utils/notification-service.js')
const loginManager = require('../../utils/login-manager').default
const LoginStatus = require('../../utils/login-manager').LoginStatus

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    navBarHeight: 0, // 导航栏高度
    avatarUrl: '', // 用户头像URL
    phoneNumber: '', // 用户手机号
    userStats: {
      todoCount: 0, // 待办事项数量
      isVerified: false // 是否已认证
    },
    isLoggedIn: false, // 是否已登录
    needPhoneBind: false, // 是否需要绑定手机号
    loginBtnLoading: false // 登录按钮加载状态
  },

  onLoad: function (options) {
    // 获取导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navBarHeight = app.globalData.navBarHeight || 44;
    this.setData({
      navBarHeight: statusBarHeight + navBarHeight
    });
    
    // 检查是否已有用户信息
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    }
    
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 获取头像URL
    const avatarUrl = userInfo.avatarUrl || '';
    if (avatarUrl) {
      this.setData({
        avatarUrl: avatarUrl
      });
    }
    
    // 从本地存储获取手机号
    const phoneNumber = wx.getStorageSync('phoneNumber');
    if (phoneNumber) {
      this.setData({
        phoneNumber: phoneNumber
      });
    }
    
    // 获取用户统计信息
    this.getUserStats();
    
    // 设置登录状态
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      needPhoneBind: app.globalData.needPhoneBind
    });
    
    // 添加登录状态变化监听
    loginManager.addStateChangeListener(this.handleLoginStateChange.bind(this));
  },
  
  onShow: function() {
    // 页面显示时刷新用户统计信息
    this.getUserStats();
    
    // 更新登录状态
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      needPhoneBind: app.globalData.needPhoneBind,
      userInfo: app.globalData.userInfo || {}
    });
    
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    // 获取手机号（优先从专门的存储中获取）
    const phoneNumber = wx.getStorageSync('phoneNumber');
    let updatedUserInfo = { ...userInfo };
    
    if (phoneNumber) {
      this.setData({
        phoneNumber: phoneNumber
      });
      updatedUserInfo.phoneNumber = phoneNumber;
    } else if (userInfo.phoneNumber) {
      this.setData({
        phoneNumber: userInfo.phoneNumber
      });
      wx.setStorageSync('phoneNumber', userInfo.phoneNumber);
    }
    
    // 更新用户信息
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        ...updatedUserInfo
      }
    });
    
    // 同步到全局数据
    app.globalData.userInfo = {
      ...app.globalData.userInfo,
      ...updatedUserInfo
    };
    
    // 获取认证状态
    let isVerified = wx.getStorageSync('isVerified') || false;
    
    // 如果未登录或需要绑定手机号，认证状态强制为false
    if (!app.globalData.isLoggedIn || app.globalData.needPhoneBind) {
      isVerified = false;
    }
    
    this.setData({
      'userStats.isVerified': isVerified
    });
  },
  
  onUnload: function() {
    // 移除登录状态监听
    loginManager.removeStateChangeListener(this.handleLoginStateChange);
  },
  
  // 处理登录状态变化
  handleLoginStateChange: function(state) {
    console.log('个人中心页面收到登录状态变化:', state);
    
    this.setData({
      isLoggedIn: state.isLoggedIn,
      needPhoneBind: state.needPhoneBind,
      userInfo: state.userInfo || {}
    });
    
    if (state.isLoggedIn && state.userInfo) {
      this.setData({
        hasUserInfo: true
      });
      
      // 如果用户信息中有手机号，同步更新
      if (state.userInfo.phoneNumber) {
        this.setData({
          phoneNumber: state.userInfo.phoneNumber
        });
        wx.setStorageSync('phoneNumber', state.userInfo.phoneNumber);
      } else {
        // 尝试从本地存储获取手机号
        const phoneNumber = wx.getStorageSync('phoneNumber');
        if (phoneNumber) {
          this.setData({
            phoneNumber: phoneNumber
          });
          
          // 确保userInfo中也有手机号
          const updatedUserInfo = {
            ...state.userInfo,
            phoneNumber: phoneNumber
          };
          
          this.setData({
            userInfo: updatedUserInfo
          });
          
          // 更新全局数据和本地存储
          app.globalData.userInfo = updatedUserInfo;
          wx.setStorageSync('userInfo', updatedUserInfo);
        }
      }
    }
  },
  
  // 获取用户统计信息
  getUserStats: function() {
    // 获取待办事项数量
    const todoCount = notificationService.getNotificationsByType('activity').filter(item => !item.isRead).length;
    
    // 获取认证状态（这里使用模拟数据，实际应从服务器获取）
    let isVerified = wx.getStorageSync('isVerified') || false;
    
    // 如果未登录，认证状态强制为false
    if (!this.data.isLoggedIn) {
      isVerified = false;
    }
    
    this.setData({
      'userStats.todoCount': todoCount,
      'userStats.isVerified': isVerified
    });
    
    console.log('更新用户统计信息: 待办数量=', todoCount, '认证状态=', isVerified);
  },
  
  // 执行微信登录
  doLogin: function() {
    if (this.data.loginBtnLoading) return;
    
    this.setData({
      loginBtnLoading: true
    });
    
    app.doLogin().then(result => {
      console.log('登录成功:', result);
      
      // 检查是否已认证
      let isVerified = wx.getStorageSync('isVerified') || false;
      
      // 注意：不再自动设置为已认证状态
      // 让用户可以看到"完善个人信息"按钮
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      // 如果需要绑定手机号，提示用户
      if (result.statusCode === LoginStatus.NEED_PHONE_BIND && !isVerified) {
        setTimeout(() => {
          wx.showModal({
            title: '提示',
            content: '请完善个人信息',
            showCancel: false
          });
        }, 1500);
      }
    }).catch(err => {
      console.error('登录失败:', err);
      
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
    }).finally(() => {
      this.setData({
        loginBtnLoading: false
      });
    });
  },
  
  // 获取用户信息
  getUserProfile: function(e) {
    // 先进行微信登录
    this.doLogin();
  },
  
  // 选择头像
  onChooseAvatar: function(e) {
    const { avatarUrl } = e.detail;
    
    if (avatarUrl) {
      // 使用wx.uploadFile上传到自己的服务器（实际项目中）
      // 这里为了演示，我们使用临时文件保存并转为本地文件
      wx.showLoading({
        title: '头像处理中...',
        mask: true
      });
      
      // 保存临时文件到本地缓存目录
      const fs = wx.getFileSystemManager();
      const localPath = `${wx.env.USER_DATA_PATH}/avatar_${Date.now()}.jpg`;
      
      try {
        fs.copyFileSync(avatarUrl, localPath);
        
        // 设置头像URL
        this.setData({
          avatarUrl: localPath
        });
        
        // 保存头像URL到本地存储
        wx.setStorageSync('avatarUrl', localPath);
        
        wx.hideLoading();
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        });
      } catch (err) {
        console.error('头像保存失败:', err);
        
        // 备用方案：直接使用临时路径（可能在某些情况下不稳定）
        this.setData({
          avatarUrl: avatarUrl
        });
        
        wx.setStorageSync('avatarUrl', avatarUrl);
        
        wx.hideLoading();
        wx.showToast({
          title: '头像已更新',
          icon: 'none'
        });
      }
    }
  },
  
  // 获取手机号
  getPhoneNumber: function(e) {
    // 跳转到绑定信息页面
    wx.navigateTo({
      url: '/pages/bind-info/bind-info'
    });
  },
  
  // 跳转到通知页面
  goToNotifications: function() {
    wx.switchTab({
      url: '/pages/notification/notification'
    });
  },
  
  // 添加测试通知（用于开发测试）
  addTestNotification: function() {
    try {
      // 添加待办类型的测试通知
      notificationService.addTestNotification('activity');
      
      // 立即更新用户统计信息，显示最新的待办数量
      this.getUserStats();
      
      // 延迟再次更新，以防异步操作导致数据不同步
      setTimeout(() => {
        this.getUserStats();
      }, 500);
      
      wx.showToast({
        title: '已添加待办测试通知',
        icon: 'success'
      });
    } catch (err) {
      console.error('添加测试通知失败:', err);
      
      wx.showToast({
        title: '添加通知失败',
        icon: 'none'
      });
    }
  },
  
  // 认证功能（模拟）
  verifyUser: function() {
    // 模拟认证过程
    wx.showLoading({
      title: '认证中...'
    });
    
    setTimeout(() => {
      wx.hideLoading();
      
      // 更新认证状态
      this.setData({
        'userStats.isVerified': true
      });
      
      // 保存认证状态到本地存储
      wx.setStorageSync('isVerified', true);
      
      wx.showToast({
        title: '认证成功',
        icon: 'success'
      });
    }, 1500);
  },
  
  // 退出登录
  logout: function() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          loginManager.logout();
          
          // 只清除登录状态相关信息，保留头像
          this.setData({
            phoneNumber: '',
            hasUserInfo: false
          });
          
          // 不再删除头像信息，只删除手机号
          wx.removeStorageSync('phoneNumber');
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
})
