// utils/api/login.js
// 微信登录相关API

// 假设已经在其他地方配置了http请求工具
const http = wx.request;

// 基础API地址 - 修改为您的实际后端地址
const BASE_URL = 'https://weapi.revoist.cn/php_backend';

/**
 * 微信登录，发送code到服务端
 * @param {string} code 微信登录code
 * @returns {Promise} 登录结果
 */
function wxLogin(code) {
  return new Promise((resolve, reject) => {
    http({
      url: `${BASE_URL}/login_api.php?action=wx_login`,
      method: 'POST',
      data: { code },
      success: (res) => {
        console.log('登录API响应:', res.data);
        
        if (res.data.code === 0) {
          // 确保token存在
          if (res.data.data && res.data.data.token) {
            // 立即保存token到本地存储
            wx.setStorageSync('token', res.data.data.token);
            console.log('Token已保存:', res.data.data.token);
          } else {
            console.warn('登录响应中没有token:', res.data);
          }
          
          resolve(res.data.data);
        } else {
          reject(res.data.msg || '登录失败');
        }
      },
      fail: (err) => {
        console.error('登录请求失败:', err);
        reject(err || '网络请求失败');
      }
    });
  });
}

/**
 * 检查登录状态
 * @returns {Promise} 登录状态
 */
function checkLoginStatus() {
  return new Promise((resolve, reject) => {
    http({
      url: `${BASE_URL}/login_api.php?action=check_status`,
      method: 'GET',
      header: {
        'token': wx.getStorageSync('token') || ''
      },
      success: (res) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else {
          reject(res.data.msg || '获取登录状态失败');
        }
      },
      fail: (err) => {
        reject(err || '网络请求失败');
      }
    });
  });
}

/**
 * 绑定手机号
 * @param {Object} data 包含加密数据和iv
 * @returns {Promise} 绑定结果
 */
function bindPhone(data) {
  return new Promise((resolve, reject) => {
    http({
      url: `${BASE_URL}/login_api.php?action=bind_phone`,
      method: 'POST',
      data: data,
      header: {
        'token': wx.getStorageSync('token') || ''
      },
      success: (res) => {
        if (res.data.code === 0) {
          resolve(res.data.data);
        } else {
          reject(res.data.msg || '绑定手机号失败');
        }
      },
      fail: (err) => {
        reject(err || '网络请求失败');
      }
    });
  });
}

module.exports = {
  wxLogin,
  checkLoginStatus,
  bindPhone
};