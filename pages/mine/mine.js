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
  
  // 获取用户信息并登录
  getUserProfile(e) {
    // 显示加载中提示
    wx.showLoading({
      title: '授权中...',
      mask: true
    });
    
    // 直接调用getUserProfile，必须在用户点击事件处理函数中直接调用
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (profileRes) => {
        console.log('获取用户信息成功:', profileRes);
        
        // 将用户信息保存到本地以支持离线使用
        const localUserInfo = profileRes.userInfo;
        wx.setStorageSync('localUserInfo', localUserInfo);
        wx.setStorageSync('avatarUrl', localUserInfo.avatarUrl);
        
        // 更新页面信息，确保UI显示正常
        this.setData({
          userInfo: {
            nickName: localUserInfo.nickName || '', // 确保显示真实昵称
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
        
        // 获取code并调用登录接口
        wx.login({
          success: (loginRes) => {
            console.log('wx.login成功:', loginRes);
            if (loginRes.code) {
              // 调用后端登录接口，发送code和用户信息
              this.loginToServer(loginRes.code, profileRes.userInfo);
            } else {
              wx.hideLoading();
              console.error('wx.login返回无code:', loginRes);
              
              // 即使登录失败，也能使用本地用户信息
              wx.showToast({
                title: '登录失败，使用离线模式',
                icon: 'none',
                duration: 2000
              });
            }
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('wx.login调用失败:', err);
            
            // 即使登录失败，也能使用本地用户信息
            wx.showToast({
              title: '网络错误，使用离线模式',
              icon: 'none',
              duration: 2000
            });
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取用户信息失败:', err);
        
        // 检查是否是用户拒绝授权
        if (err.errMsg === 'getUserProfile:fail auth deny') {
          wx.showToast({
            title: '用户取消授权',
            icon: 'none',
            duration: 2000
          });
        } else {
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none',
            duration: 2000
          });
        }
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
          wx.showToast({
            title: res.data.msg || '登录失败',
            icon: 'none',
            duration: 2000
          });
          
          // 如果是数据库错误，运行数据库测试
          if (res.statusCode === 500 && res.data.msg && (
              res.data.msg.includes('数据库') || 
              res.data.msg.includes('创建用户') || 
              res.data.msg.includes('服务器内部错误'))) {
            console.log('检测到数据库错误，运行测试...');
            setTimeout(() => {
              this.testDatabaseConnection();
            }, 1000);
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

  // 登录失败时测试数据库连接
  testDatabaseConnection() {
    wx.showLoading({
      title: '检查服务器...'
    });
    
    wx.request({
      url: 'http://117.72.10.68/php_backend/login_api_v2.php',
      data: {
        action: 'init_db',
        code: 'init',
        userInfo: {}
      },
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        console.log('数据库初始化结果:', res.data);
        
        if (res.data && res.data.success) {
          wx.showModal({
            title: '数据库初始化成功',
            content: '数据库表已创建，请重新尝试登录',
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
          let errorMsg = '数据库初始化失败';
          if (res.data && res.data.error) {
            errorMsg += ': ' + res.data.error;
          }
          
          wx.showModal({
            title: '数据库问题',
            content: errorMsg,
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('数据库初始化请求失败:', err);
        
        // 如果init_db.php不存在，尝试手动创建表
        this.tryManualDbInit();
      }
    });
  },
  
  // 尝试手动创建数据库表
  tryManualDbInit() {
    wx.showLoading({
      title: '尝试手动初始化...'
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
        console.log('手动初始化结果:', res.data);
        
        wx.showModal({
          title: '手动初始化尝试完成',
          content: '请重新尝试登录',
          showCancel: false
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('手动初始化失败:', err);
        
        // 尝试诊断数据库问题
        this.diagnoseDatabaseIssues();
      }
    });
  },
  
  // 诊断数据库问题
  diagnoseDatabaseIssues() {
    wx.showLoading({
      title: '诊断数据库...'
    });
    
    wx.request({
      url: 'http://117.72.10.68/php_backend/login_api_v2.php',
      data: {
        action: 'diagnose_db',
        code: 'diagnose',
        userInfo: {}
      },
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        console.log('数据库诊断结果:', res.data);
        
        // 分析诊断结果
        let diagnosisMessage = '';
        
        if (res.data && res.data.success) {
          if (res.data.tables.users.exists) {
            diagnosisMessage = '数据库和表结构正常，但登录仍然失败。请检查服务器日志或联系管理员。';
          } else {
            diagnosisMessage = '数据库连接正常，但users表不存在。请联系管理员创建数据库表。';
          }
        } else {
          if (res.data && res.data.errors && res.data.errors.length > 0) {
            diagnosisMessage = '数据库问题: ' + res.data.errors.join(', ');
          } else if (res.data && !res.data.database.connection) {
            diagnosisMessage = '无法连接到数据库。请检查数据库配置和权限。';
          } else {
            diagnosisMessage = '数据库诊断失败，无法确定具体原因。';
          }
        }
        
        wx.showModal({
          title: '数据库诊断结果',
          content: diagnosisMessage,
          showCancel: false
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('数据库诊断请求失败:', err);
        
        wx.showModal({
          title: '诊断失败',
          content: '无法访问诊断脚本，请联系管理员检查服务器配置',
          showCancel: false
        });
      }
    });
  }
}) 