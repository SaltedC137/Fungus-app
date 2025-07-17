// pages/bind-info/bind-info.js
const app = getApp();
const loginManager = require('../../utils/login-manager').default;

Page({
  data: {
    navBarHeight: 0,
    phoneNumber: '',
    studentId: '',
    userName: '',
    isSubmitting: false
  },

  onLoad: function(options) {
    // 获取导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navBarHeight = app.globalData.navBarHeight || 44;
    this.setData({
      navBarHeight: statusBarHeight + navBarHeight
    });
    
    // 如果有传入的手机号，则设置
    if (options.phone) {
      this.setData({
        phoneNumber: options.phone
      });
    }
  },
  
  // 输入手机号
  inputPhone: function(e) {
    this.setData({
      phoneNumber: e.detail.value
    });
  },
  
  // 输入学号
  inputStudentId: function(e) {
    this.setData({
      studentId: e.detail.value
    });
  },
  
  // 输入姓名
  inputUserName: function(e) {
    this.setData({
      userName: e.detail.value
    });
  },
  
  // 提交信息
  submitInfo: function() {
    // 表单验证
    if (!this.data.phoneNumber) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.studentId) {
      wx.showToast({
        title: '请输入学号',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.userName) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }
    
    // 手机号格式验证
    if (!/^1\d{10}$/.test(this.data.phoneNumber)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }
    
    // 获取token并检查
    const token = wx.getStorageSync('token');
    console.log('当前token:', token);
    
    if (!token) {
      wx.showToast({
        title: '未登录，请先登录',
        icon: 'none'
      });
      
      // 延迟返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    // 设置提交中状态
    this.setData({
      isSubmitting: true
    });
    
    // 构建提交的数据
    const userInfo = {
      phoneNumber: this.data.phoneNumber,
      studentId: this.data.studentId,
      userName: this.data.userName
    };
    
    console.log('准备提交的数据:', userInfo);
    console.log('请求头token:', token);
    
    // 调用API提交数据
    wx.request({
      url: 'http://117.72.10.68/php_backend/login_api.php?action=bind_info&token=' + encodeURIComponent(token),
      method: 'POST',
      header: {
        'Token': token, // 大写开头，与后端getallheaders()的格式匹配
        'content-type': 'application/json'
      },
      data: userInfo,
      success: (res) => {
        console.log('服务器响应:', res.data);
        
        if (res.data.code === 0) {
          // 保存用户信息到本地
          wx.setStorageSync('userInfo', {
            ...app.globalData.userInfo,
            ...userInfo
          });

          // 同时单独保存手机号，确保一致性
          wx.setStorageSync('phoneNumber', userInfo.phoneNumber);

          // 更新全局数据
          app.globalData.userInfo = {
            ...app.globalData.userInfo,
            ...userInfo
          };
          
          // 设置已认证状态
          wx.setStorageSync('isVerified', true);
          
          wx.showToast({
            title: '认证成功',
            icon: 'success'
          });
          
          // 延迟返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          wx.showToast({
            title: res.data.msg || '提交失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('提交信息失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      },
      complete: () => {
        this.setData({
          isSubmitting: false
        });
      }
    });
  }
}); 