// utils/login-manager.js
/**
 * 登录管理器
 * 处理微信登录、状态管理和手机号绑定
 */

const loginApi = require('./api/login');

// 登录状态
const LoginStatus = {
  NOT_LOGGED_IN: 0,      // 未登录
  LOGGED_IN: 1,          // 已登录
  NEED_PHONE_BIND: 2     // 需要绑定手机号
};

class LoginManager {
  constructor() {
    this.isLoggedIn = false;
    this.needPhoneBind = false;
    this.userInfo = null;
    this.token = '';
    this.callbacks = [];
  }

  /**
   * 初始化登录管理器
   */
  init() {
    // 从本地存储加载token
    this.token = wx.getStorageSync('token') || '';
    this.isLoggedIn = !!this.token;
    this.userInfo = wx.getStorageSync('userInfo') || null;
    this.needPhoneBind = wx.getStorageSync('needPhoneBind') || false;
    
    console.log('登录管理器初始化完成', {
      isLoggedIn: this.isLoggedIn,
      needPhoneBind: this.needPhoneBind
    });
  }

  /**
   * 执行微信登录
   * @returns {Promise} 登录结果
   */
  doLogin() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            console.log('微信登录成功，获取到code:', res.code);
            
            // 发送code到服务端
            loginApi.wxLogin(res.code).then(data => {
              console.log('服务端登录成功:', data);
              
              // 确保返回了token
              if (!data.token) {
                console.error('服务端返回数据中没有token');
                reject(new Error('服务端返回数据格式错误'));
                return;
              }
              
              // 保存登录状态
              this.token = data.token;
              this.isLoggedIn = true;
              this.needPhoneBind = data.needPhoneBind || false;

              // 获取之前保存的头像URL
              const savedUserInfo = wx.getStorageSync('userInfo') || {};
              const savedAvatarUrl = savedUserInfo.avatarUrl;

              // 合并用户信息，保留头像
              this.userInfo = {
                ...(data.userInfo || {}),
                avatarUrl: data.userInfo && data.userInfo.avatarUrl ? data.userInfo.avatarUrl : savedAvatarUrl
              };
              
              // 存储到本地
              wx.setStorageSync('token', this.token);
              console.log('Token已保存到本地:', this.token);
              
              wx.setStorageSync('userInfo', this.userInfo);
              wx.setStorageSync('needPhoneBind', this.needPhoneBind);
              
              // 检查是否已认证
              const isVerified = wx.getStorageSync('isVerified') || false;
              
              // 注意：不再自动设置为已认证
              // 让用户可以看到"完善个人信息"按钮

              // 如果已认证，则不需要绑定手机号
              if (isVerified) {
                this.needPhoneBind = false;
                wx.setStorageSync('needPhoneBind', false);
              }
              
              // 通知状态变化
              this._notifyStateChange();
              
              // 返回登录状态码
              const statusCode = this.needPhoneBind ? 
                LoginStatus.NEED_PHONE_BIND : 
                LoginStatus.LOGGED_IN;
                
              resolve({
                statusCode,
                data
              });
            }).catch(err => {
              console.error('服务端登录失败:', err);
              reject(err);
            });
          } else {
            console.error('微信登录失败:', res);
            reject(new Error('微信登录失败'));
          }
        },
        fail: (err) => {
          console.error('微信登录接口调用失败:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 检查登录状态
   * @returns {Promise} 状态检查结果
   */
  checkLoginStatus() {
    return new Promise((resolve, reject) => {
      // 如果没有token，直接返回未登录状态
      if (!this.token) {
        resolve({
          statusCode: LoginStatus.NOT_LOGGED_IN,
          data: null
        });
        return;
      }
      
      // 向服务端验证登录状态
      loginApi.checkLoginStatus().then(data => {
        console.log('登录状态检查成功:', data);
        
        // 更新状态
        this.isLoggedIn = true;
        this.needPhoneBind = data.needPhoneBind || false;
        this.userInfo = data.userInfo || this.userInfo;
        
        // 存储到本地
        wx.setStorageSync('userInfo', this.userInfo);
        wx.setStorageSync('needPhoneBind', this.needPhoneBind);
        
        // 通知状态变化
        this._notifyStateChange();
        
        // 返回登录状态码
        const statusCode = this.needPhoneBind ? 
          LoginStatus.NEED_PHONE_BIND : 
          LoginStatus.LOGGED_IN;
          
        resolve({
          statusCode,
          data
        });
      }).catch(err => {
        console.error('登录状态检查失败:', err);
        
        // 清除登录信息
        this._clearLoginInfo();
        
        resolve({
          statusCode: LoginStatus.NOT_LOGGED_IN,
          data: null
        });
      });
    });
  }

  /**
   * 绑定手机号
   * @param {Object} encryptedData 加密数据
   * @param {String} iv 加密算法的初始向量
   * @returns {Promise} 绑定结果
   */
  bindPhone(encryptedData, iv) {
    return new Promise((resolve, reject) => {
      if (!this.isLoggedIn) {
        reject(new Error('用户未登录，无法绑定手机号'));
        return;
      }
      
      loginApi.bindPhone({
        encryptedData,
        iv
      }).then(data => {
        console.log('手机号绑定成功:', data);
        
        // 更新状态
        this.needPhoneBind = false;
        if (data.userInfo) {
          this.userInfo = data.userInfo;
          wx.setStorageSync('userInfo', this.userInfo);
        }
        
        wx.setStorageSync('needPhoneBind', false);
        
        // 通知状态变化
        this._notifyStateChange();
        
        resolve(data);
      }).catch(err => {
        console.error('手机号绑定失败:', err);
        reject(err);
      });
    });
  }

  /**
   * 退出登录
   */
  logout() {
    this._clearLoginInfo();
    this._notifyStateChange();
  }

  /**
   * 清除登录信息
   * @private
   */
  _clearLoginInfo() {
    // 保存当前用户信息中的头像URL
    const currentUserInfo = wx.getStorageSync('userInfo') || {};
    const avatarUrl = currentUserInfo.avatarUrl;
    
    this.isLoggedIn = false;
    this.needPhoneBind = false;
    this.userInfo = avatarUrl ? { avatarUrl } : null;
    this.token = '';
    
    wx.removeStorageSync('token');
    
    // 如果有头像，保存包含头像的用户信息
    if (avatarUrl) {
      wx.setStorageSync('userInfo', { avatarUrl });
    } else {
      wx.removeStorageSync('userInfo');
    }
    
    wx.removeStorageSync('needPhoneBind');
  }

  /**
   * 添加状态变化监听器
   * @param {Function} callback 回调函数
   */
  addStateChangeListener(callback) {
    if (typeof callback === 'function' && !this.callbacks.includes(callback)) {
      this.callbacks.push(callback);
    }
  }

  /**
   * 移除状态变化监听器
   * @param {Function} callback 回调函数
   */
  removeStateChangeListener(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 通知状态变化
   * @private
   */
  _notifyStateChange() {
    const state = {
      isLoggedIn: this.isLoggedIn,
      needPhoneBind: this.needPhoneBind,
      userInfo: this.userInfo
    };
    
    this.callbacks.forEach(callback => {
      try {
        callback(state);
      } catch (e) {
        console.error('执行状态变化回调出错:', e);
      }
    });
  }
}

// 导出登录状态枚举
module.exports.LoginStatus = LoginStatus;

// 创建并导出单例
const loginManager = new LoginManager();
module.exports.default = loginManager; 