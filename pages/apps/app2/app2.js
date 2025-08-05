var sceneReadyBehavior = require('../../behavior-scene/scene-ready');
var handleDecodedXML = require('../../behavior-scene/util').handleDecodedXML;
var xmlCode = `&lt;xr-scene id=&quot;xr-scene&quot; bind:ready=&quot;handleReady&quot; bind:log=&quot;handleLog&quot;&gt;
&lt;xr-assets bind:progress=&quot;handleAssetsProgress&quot; bind:loaded=&quot;handleAssetsLoaded&quot;&gt;
  &lt;xr-asset-load type=&quot;gltf&quot; asset-id=&quot;gltf-item&quot; src=&quot;https://weapi.revoist.cn/model/msuh.glb&quot; /&gt;
&lt;/xr-assets&gt;
&lt;xr-node&gt;
  &lt;xr-node node-id=&quot;camera-target&quot; position=&quot;0 0 0&quot;&gt;&lt;/xr-node&gt;
  &lt;xr-node node-id=&quot;setitem&quot;&gt;
    &lt;xr-gltf model=&quot;gltf-item&quot; scale=&quot;0.7 0.7 0.7&quot; position=&quot;0 -1 0&quot;&gt;&lt;/xr-gltf&gt;
  &lt;/xr-node&gt;
  &lt;xr-camera
    id=&quot;camera&quot; node-id=&quot;camera&quot; position=&quot;0 0 3&quot; clear-color=&quot;0.925 0.925 0.925 1&quot;
    target=&quot;camera-target&quot;
    camera-orbit-control
  &gt;&lt;/xr-camera&gt;
&lt;/xr-node&gt;
&lt;xr-node node-id=&quot;lights&quot;&gt;
  &lt;xr-light type=&quot;ambient&quot; color=&quot;1 1 1&quot; intensity=&quot;1&quot; /&gt;
  &lt;xr-light type=&quot;directional&quot; rotation=&quot;180 0 0&quot; color=&quot;1 1 1&quot; intensity=&quot;3&quot; /&gt;
&lt;/xr-node&gt;
&lt;/xr-scene&gt;
`;
Page({
  behaviors:[sceneReadyBehavior],
  data: {
    xmlCode: '<div class="codeWrap">' + handleDecodedXML(xmlCode) + '</div>',
    assetsLoaded: false
  },
  handleReady({detail}) {
    this.scene = detail.value;
    console.log('XR场景已就绪', this.scene);
  },
  handleAssetsProgress: function({detail}) {
    console.log('资源加载进度', detail.value);
  },
  handleAssetsLoaded: function({detail}) {
    console.log('资源加载完成', detail.value);
    // 确保在所有情况下都能正确隐藏加载动画
    this.hideLoadingSpinner();
  },
  handleLog: function({detail}) {
    console.log('XR日志', detail.value);
  },
  hideLoadingSpinner: function() {
    // 直接设置状态隐藏加载动画
    this.setData({
      assetsLoaded: true
    });
    
    // 添加手势控制说明
    setTimeout(() => {
      wx.showToast({
        title: '拖动旋转，双指缩放',
        icon: 'none',
        duration: 2000
      });
    }, 500);
  },
  onLoad: function() {
    // 设置一个定时器，确保即使在资源加载事件未触发的情况下也能隐藏加载动画
    this.data.loadTimeout = setTimeout(() => {
      console.log('加载超时，强制隐藏加载动画');
      this.hideLoadingSpinner();
    }, 60000); // 10秒超时
  },
  onUnload: function() {
    // 页面卸载时清除定时器
    if (this.data.loadTimeout) {
      clearTimeout(this.data.loadTimeout);
    }
  }
})