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
    // 获取本地存储的session_key
    const session_key = wx.getStorageSync('session_key');
    if (session_key) {
      // 有session_key，检查是否有效
      this.checkSessionAndUserInfo();
    } else {
      // 尝试使用本地用户信息
      const localUserInfo = wx.getStorageSync('localUserInfo');
      if (localUserInfo) {
        this.setData({
          userInfo: {
            nickName: localUserInfo.nickName || '', // 确保显示真实昵称
            avatarUrl: localUserInfo.avatarUrl
          },
          hasUserInfo: true,
          avatarUrl: localUserInfo.avatarUrl
        });
        console.log('使用本地用户信息显示，昵称:', localUserInfo.nickName);
      }
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
          // 确保显示真实昵称，避免使用默认值
          this.setData({
            userInfo: {
              nickName: storedUserInfo.nickName || '',
              avatarUrl: storedAvatarUrl || storedUserInfo.avatarUrl || ''
            },
            hasUserInfo: true,
            phoneNumber: storedPhoneNumber || '',
            avatarUrl: storedAvatarUrl || storedUserInfo.avatarUrl || ''
          });
          app.globalData.userInfo = storedUserInfo;
        }
      },
      fail: () => {
        // session_key 已经失效，但仍然可以使用本地用户信息显示
        const localUserInfo = wx.getStorageSync('localUserInfo');
        const storedPhoneNumber = wx.getStorageSync('phoneNumber');
        const storedAvatarUrl = wx.getStorageSync('avatarUrl');
        
        if (localUserInfo) {
          this.setData({
            userInfo: {
              nickName: localUserInfo.nickName || '',
              avatarUrl: storedAvatarUrl || localUserInfo.avatarUrl || ''
            },
            hasUserInfo: true,
            phoneNumber: storedPhoneNumber || '',
            avatarUrl: storedAvatarUrl || localUserInfo.avatarUrl || ''
          });
        } else {
          // 无本地用户信息，清除登录状态
          wx.removeStorageSync('token');
          wx.removeStorageSync('session_key');
          wx.removeStorageSync('openid');
          wx.removeStorageSync('userInfo');
          this.setData({
            hasUserInfo: false,
            userInfo: {},
            phoneNumber: '',
            avatarUrl: ''
          });
        }
      }
    });
  },
  
  // 获取用户信息并登录 - 优化版
  getUserProfile(e) {
    // 显示加载中提示
    wx.showLoading({
      title: '授权中...',
      mask: true
    });
    
    // 先进行微信登录获取code
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          console.log('wx.login成功获取code:', loginRes.code);
          
          // 使用getUserProfile获取用户信息
          wx.getUserProfile({
            desc: '用于完善资料',
            lang: 'zh_CN',
            success: (profileRes) => {
              console.log('获取用户信息成功:', profileRes);
              
              // 将用户信息保存到本地以支持离线使用
              const localUserInfo = profileRes.userInfo;
              wx.setStorageSync('localUserInfo', localUserInfo);
              
              // 更新页面信息
              this.setData({
                userInfo: {
                  nickName: localUserInfo.nickName || '',
                  avatarUrl: localUserInfo.avatarUrl
                },
                hasUserInfo: true,
                avatarUrl: localUserInfo.avatarUrl
              });
              
              // 更新加载提示
              wx.showLoading({
                title: '正在登录...',
                mask: true
              });
              
              // 先尝试初始化数据库，再调用登录接口
              this.initDatabaseAndLogin(loginRes.code, profileRes.userInfo);
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('获取用户信息失败:', err);
              
              // 检查是否是用户拒绝授权
              if (err.errMsg === "getUserProfile:fail auth deny") {
                wx.showToast({
                  title: '用户取消授权',
                  icon: 'none',
                  duration: 2000
                });
              } else {
                // 使用备用方案：仅使用登录，不获取用户信息
                this.loginWithoutUserInfo(loginRes.code);
              }
            }
          });
        } else {
          wx.hideLoading();
          console.error('wx.login返回无code:', loginRes);
          
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('wx.login调用失败:', err);
        
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  // 初始化数据库并登录
  initDatabaseAndLogin(code, userInfo) {
    wx.showLoading({
      title: '准备数据库...',
      mask: true
    });
    
    // 先尝试初始化数据库
    wx.request({
      url: 'http://117.72.10.68/php_backend/login_api_v2.php',
      method: 'POST',
      data: {
        action: 'init_db',
        code: code,
        userInfo: userInfo
      },
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        console.log('数据库初始化结果:', res.data);
        
        // 无论初始化成功与否，都继续尝试登录
        this.loginToServer(code, userInfo);
      },
      fail: (err) => {
        console.error('数据库初始化请求失败:', err);
        
        // 即使初始化失败，也尝试登录
        this.loginToServer(code, userInfo);
      }
    });
  },
  
  // 仅使用code登录，不获取用户信息的备用方案
  loginWithoutUserInfo(code) {
    wx.showLoading({
      title: '正在登录...',
      mask: true
    });
    
    // 创建默认用户信息
    const defaultUserInfo = {
      nickName: '微信用户',
      avatarUrl: '/images/app_default.png',
      gender: 0,
      country: '',
      province: '',
      city: '',
      language: 'zh_CN'
    };
    
    // 先初始化数据库，再调用登录接口
    this.initDatabaseAndLogin(code, defaultUserInfo);
  },
  
  // 获取用户头像 - 优化版
  onChooseAvatar(e) {
    try {
      // 检查是否有detail返回
      if (!e.detail) {
        console.error('头像选择事件没有返回detail数据');
        this.chooseAvatarFallback();
        return;
      }
      
      const { avatarUrl } = e.detail;
      
      // 检查头像URL是否有效
      if (!avatarUrl) {
        console.error('头像URL为空');
        this.chooseAvatarFallback();
        return;
      }
      
      console.log('选择的头像URL:', avatarUrl);
      
      // 使用wx.getImageInfo获取图片信息并保存到本地
      wx.getImageInfo({
        src: avatarUrl,
        success: (res) => {
          console.log('获取图片信息成功:', res);
          
          // 使用本地临时路径
          const tempFilePath = res.path;
          
          // 保存到本地存储
          wx.setStorageSync('avatarUrl', tempFilePath);
          
          // 更新页面数据
          this.setData({
            avatarUrl: tempFilePath
          });
          
          // 如果已经有用户信息，更新头像
          if (this.data.hasUserInfo) {
            let userInfo = this.data.userInfo;
            userInfo.avatarUrl = tempFilePath;
            this.setData({
              userInfo: userInfo
            });
            wx.setStorageSync('userInfo', userInfo);
          }
          
          // 显示成功提示
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('获取图片信息失败:', err);
          // 使用备用方法
          this.chooseAvatarFallback();
        }
      });
    } catch (error) {
      console.error('处理头像选择时出错:', error);
      // 使用备用方法
      this.chooseAvatarFallback();
    }
  },
  
  // 备用头像选择方法（使用wx.chooseImage）
  chooseAvatarFallback() {
    wx.showToast({
      title: '使用备用方式选择头像',
      icon: 'none',
      duration: 1500
    });
    
    setTimeout(() => {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFilePaths[0];
          console.log('备用方法选择的头像:', tempFilePath);
          
          // 保存头像
          wx.setStorageSync('avatarUrl', tempFilePath);
          this.setData({
            avatarUrl: tempFilePath
          });
          
          // 更新用户信息
          if (this.data.hasUserInfo) {
            let userInfo = this.data.userInfo;
            userInfo.avatarUrl = tempFilePath;
            this.setData({
              userInfo: userInfo
            });
            wx.setStorageSync('userInfo', userInfo);
          }
          
          wx.showToast({
            title: '头像更新成功',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('备用头像选择失败:', err);
          wx.showToast({
            title: '选择头像失败',
            icon: 'none'
          });
        }
      });
    }, 1000);
  },
  
  // 获取手机号并完善个人信息
  getPhoneNumber(e) {
    if (e.detail.errMsg === "getPhoneNumber:ok") {
      const code = e.detail.code;
      
      // 显示加载提示
      wx.showLoading({
        title: '完善个人信息中...',
      });
      
      // 获取本地存储的session_key和openid，而不是token
      const session_key = wx.getStorageSync('session_key');
      const openid = wx.getStorageSync('openid');
      
      if (!session_key || !openid) {
        wx.hideLoading();
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }
      
      // 发送请求到服务器获取手机号
      wx.request({
        url: 'http://117.72.10.68/php_backend/phone_api_new.php',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          code: code,
          session_key: session_key,
          openid: openid
        },
        success: (res) => {
          wx.hideLoading();
          
          if (res.data.code === 0) {
            // 获取手机号成功
            const phoneNumber = res.data.data.phoneNumber;
            
            this.setData({
              phoneNumber: phoneNumber
            });
            wx.setStorageSync('phoneNumber', phoneNumber);
            
            wx.showToast({
              title: '个人信息完善成功',
              icon: 'success'
            });
            
            // 可以在这里添加更多个人信息完善的逻辑
            console.log('个人信息完善成功，手机号:', phoneNumber);
          } else {
            // 获取手机号失败
            console.error('获取手机号失败:', res.data);
            wx.showToast({
              title: res.data.msg || '个人信息完善失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('获取手机号请求失败:', err);
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '您取消了授权',
        icon: 'none'
      });
    }
  },

  loginToServer(code, userInfo) {
    // 输出请求参数详情
    console.log('登录请求参数:', {code: code, userInfo: userInfo});
    
    wx.request({
      url: 'http://117.72.10.68/php_backend/login_api_v2.php',
      method: 'POST',
      data: {
        code: code,
        userInfo: userInfo
      },
      header: {
        'content-type': 'application/json' // 确保设置正确的内容类型
      },
      success: (res) => {
        // 隐藏加载提示，无论成功与否
        wx.hideLoading();
        
        // 输出完整响应
        console.log('登录请求状态码:', res.statusCode);
        console.log('登录请求响应头:', res.header);
        console.log('登录请求响应内容:', res.data);
        
        if (res.data.code === 0) {
          // 登录成功
          const token = res.data.data.token;        // 保留token变量名，实际是session_key
          const openid = res.data.data.openid;      // 新增：保存openid
          const userInfo = res.data.data.userInfo;
          
          // 保存信息到本地
          wx.setStorageSync('token', token);        // 为了兼容性，仍然保存token
          wx.setStorageSync('session_key', token);  // 实际保存的是session_key
          wx.setStorageSync('openid', openid);      // 保存openid
          wx.setStorageSync('userInfo', userInfo);
          wx.setStorageSync('phoneNumber', userInfo.phoneNumber || '');
          
          // 更新页面数据 - 确保显示真实昵称
          this.setData({
            userInfo: {
              nickName: userInfo.nickName || '',  // 不再使用默认值"微信用户"
              avatarUrl: userInfo.avatarUrl
            },
            phoneNumber: userInfo.phoneNumber || '',
            hasUserInfo: true,
            'userStats.isVerified': true
          });
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
        } else {
          // 登录失败，显示具体错误信息
          console.error('登录失败:', res.data);
          
          // 如果是数据库错误，尝试诊断和修复
          if (res.statusCode === 500 && res.data.msg && (
              res.data.msg.includes('数据库') || 
              res.data.msg.includes('创建用户') || 
              res.data.msg.includes('获取用户资料') ||
              res.data.msg.includes('服务器内部错误'))) {
            
            wx.showModal({
              title: '数据库问题',
              content: '检测到数据库问题，是否尝试修复？',
              confirmText: '修复',
              cancelText: '取消',
              success: (result) => {
                if (result.confirm) {
                  this.diagnoseDatabaseIssues();
                } else {
                  wx.showToast({
                    title: res.data.msg || '登录失败',
                    icon: 'none',
                    duration: 2000
                  });
                }
              }
            });
          } else {
            wx.showToast({
              title: res.data.msg || '登录失败',
              icon: 'none',
              duration: 2000
            });
          }
        }
      },
      fail: (err) => {
        // 请求发送失败
        wx.hideLoading();
        console.error('登录请求失败详情:', err);
        
        // 检查是否是网络错误
        if (err.errMsg.includes('request:fail')) {
          wx.showToast({
            title: '网络连接失败，请检查网络',
            icon: 'none',
            duration: 2000
          });
        } else {
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },
  
  // 导航到各功能页面
  navigateToPage(e) {
    const index = e.currentTarget.dataset.index;
    const menu = this.data.menuList[index];
    
    wx.showToast({
      title: `点击了${menu.text}，功能开发中`,
      icon: 'none'
    });
  },
  
  // 跳转到通知页面
  goToNotifications() {
    wx.switchTab({
      url: '/pages/notification/notification'
    })
  },
  
  // 添加测试通知 (开发测试用)
  addTestNotification() {
    notificationService.addTestNotification();
    wx.showToast({
      title: '已添加测试通知',
      icon: 'success'
    });
  },

  // 诊断数据库问题
  diagnoseDatabaseIssues() {
    wx.showLoading({
      title: '诊断数据库...',
      mask: true
    });
    
    wx.request({
      url: 'http://117.72.10.68/php_backend/login_api_v2.php',
      method: 'POST',
      data: {
        action: 'diagnose_db',
        code: 'diagnose',
        userInfo: {}
      },
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        wx.hideLoading();
        console.log('数据库诊断结果:', res.data);
        
        if (res.data.code === 0) {
          // 诊断成功，尝试修复
          this.tryManualDbInit();
        } else {
          // 诊断失败
          wx.showModal({
            title: '诊断结果',
            content: '数据库诊断失败: ' + (res.data.msg || '未知错误'),
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('数据库诊断请求失败:', err);
        
        // 直接尝试修复
        this.tryManualDbInit();
      }
    });
  },
  
  // 尝试手动创建数据库表
  tryManualDbInit() {
    wx.showLoading({
      title: '修复数据库...',
      mask: true
    });
    
    wx.request({
      url: 'http://117.72.10.68/php_backend/login_api_v2.php',
      method: 'POST',
      data: {
        action: 'init_db',
        code: 'manual_init',
        userInfo: {
          nickName: '测试用户',
          avatarUrl: ''
        }
      },
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        wx.hideLoading();
        console.log('数据库修复结果:', res.data);
        
        if (res.data.code === 0) {
          wx.showModal({
            title: '修复成功',
            content: '数据库已修复，请重新登录',
            showCancel: false,
            success: () => {
              // 清除登录状态，重新登录
              wx.removeStorageSync('token');
              wx.removeStorageSync('session_key');
              wx.removeStorageSync('openid');
              this.setData({
                hasUserInfo: false
              });
            }
          });
        } else {
          wx.showModal({
            title: '修复失败',
            content: '数据库修复失败: ' + (res.data.msg || '未知错误'),
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('数据库修复请求失败:', err);
        
        wx.showModal({
          title: '修复失败',
          content: '网络错误，无法修复数据库',
          showCancel: false
        });
      }
    });
  }
}) 