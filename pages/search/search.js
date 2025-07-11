// search.js
const app = getApp()

Page({
  data: {
    keyword: '',
    historyList: [],
    hotList: ['AR校园', 'XR体验', '应用', '校园'],
    showClearIcon: false,
    searchResults: [],
    sourceType: '', // 记录来源页面
    navBarHeight: 0 // 导航栏高度
  },
  
  onLoad(options) {
    // 获取历史搜索记录
    const historyList = wx.getStorageSync('searchHistory') || []
    
    // 记录来源页面类型
    const sourceType = options.source || ''
    
    // 获取导航栏高度
    const systemInfo = wx.getSystemInfoSync();
    const statusBarHeight = systemInfo.statusBarHeight;
    const navBarHeight = app.globalData.navBarHeight || 44;
    
    this.setData({
      historyList: historyList,
      sourceType: sourceType,
      navBarHeight: statusBarHeight + navBarHeight
    })
    
    // 如果是从首页跳转过来，设置热门搜索为应用名称
    if (sourceType === 'index') {
      const appList = app.globalData.appGridList || []
      // 取前5个应用名称作为热门搜索
      if (appList.length > 0) {
        const hotApps = appList.slice(0, 5).map(app => app.name)
        this.setData({
          hotList: hotApps
        })
      }
    }
  },
  
  // 输入框内容变化
  onInputChange(e) {
    const keyword = e.detail.value
    this.setData({
      keyword: keyword,
      showClearIcon: keyword.length > 0
    })
  },
  
  // 清空输入框
  clearInput() {
    this.setData({
      keyword: '',
      showClearIcon: false,
      searchResults: []
    })
  },
  
  // 执行搜索
  doSearch(e) {
    let keyword = this.data.keyword
    
    // 如果是点击历史或热门搜索项
    if (e && e.currentTarget.dataset.keyword) {
      keyword = e.currentTarget.dataset.keyword
      this.setData({
        keyword: keyword,
        showClearIcon: true
      })
    }
    
    if (!keyword.trim()) {
      return
    }
    
    // 从全局应用列表中搜索匹配的应用
    const appList = app.globalData.appGridList || []
    const searchResults = appList.filter(item => {
      // 搜索应用名称和描述
      return (
        item.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (item.desc && item.desc.toLowerCase().includes(keyword.toLowerCase()))
      )
    })
    
    this.setData({
      searchResults: searchResults
    })
    
    // 保存到历史记录
    this.saveHistory(keyword)
  },
  
  // 保存搜索历史
  saveHistory(keyword) {
    let historyList = this.data.historyList
    
    // 如果已存在，先移除旧记录
    const index = historyList.findIndex(item => item === keyword)
    if (index !== -1) {
      historyList.splice(index, 1)
    }
    
    // 添加到历史记录开头
    historyList.unshift(keyword)
    
    // 最多保留10条记录
    if (historyList.length > 10) {
      historyList = historyList.slice(0, 10)
    }
    
    this.setData({
      historyList: historyList
    })
    
    // 保存到本地存储
    wx.setStorageSync('searchHistory', historyList)
  },
  
  // 清空历史记录
  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            historyList: []
          })
          wx.removeStorageSync('searchHistory')
          
          wx.showToast({
            title: '已清空历史',
            icon: 'success'
          })
        }
      }
    })
  },
  
  // 点击搜索结果
  onResultTap(e) {
    const id = e.currentTarget.dataset.id
    const url = e.currentTarget.dataset.url
    
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