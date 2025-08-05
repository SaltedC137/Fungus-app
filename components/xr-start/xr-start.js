Component({
  properties: {
    width: {
      type: Number,
      value: 0
    },
    height: {
      type: Number,
      value: 0
    }
  },
  data: {
    // 组件的初始数据
  },
  methods: {
    handleReady({detail}) {
      this.scene = detail.value;
      console.log('XR场景已就绪', this.scene);
      
      // 获取当前页面实例并通知加载完成
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && typeof currentPage.handleSceneReady === 'function') {
        currentPage.handleSceneReady();
      }
    },
    
    handleAssetsProgress({detail}) {
      console.log('资源加载进度', detail.value);
    },
    
    handleAssetsLoaded({detail}) {
      console.log('资源加载完成', detail.value);
      
      // 获取当前页面实例并通知资源加载完成
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && typeof currentPage.handleAssetsLoaded === 'function') {
        currentPage.handleAssetsLoaded();
      }
    }
  },
  lifetimes: {
    attached() {
      // 在组件实例进入页面节点树时执行
    },
    detached() {
      // 在组件实例被从页面节点树移除时执行
    }
  }
})